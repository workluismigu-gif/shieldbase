// Prowler v5 OCSF-native mapper
// Uses Prowler's own compliance mappings from unmapped.compliance instead of hardcoded lookup

export interface ProwlerOCSFFinding {
  metadata?: { event_code?: string; product?: { name?: string; version?: string } };
  finding_info?: { uid?: string; title?: string; desc?: string };
  status_code?: string; // "PASS" | "FAIL"
  status?: string;
  severity?: string;
  severity_id?: number;
  message?: string;
  status_detail?: string;
  resources?: Array<{ uid?: string; region?: string; type?: string; group?: { name?: string } }>;
  cloud?: { region?: string; account?: { uid?: string } };
  remediation?: { desc?: string; references?: string[] };
  unmapped?: {
    compliance?: Record<string, string[]>;
    categories?: string[];
  };
}

// Backward compat for v3/v4 format
export type ProwlerFinding = ProwlerOCSFFinding & {
  check_id?: string;
  check_title?: string;
  status?: string;
};

export interface MappedControl {
  control_id: string;
  category: string;
  title: string;
  description: string;
  status: "compliant" | "partial" | "non_compliant" | "not_assessed";
  severity: "critical" | "high" | "medium" | "low";
  prowler_checks: string[];
  findings: ProwlerFinding[];
}

// SOC 2 TSC category from requirement ID prefix
function getCategoryFromRequirement(req: string): string {
  const r = req.toLowerCase();
  if (r.startsWith("cc1")) return "CC1 - Control Environment";
  if (r.startsWith("cc2")) return "CC2 - Communication";
  if (r.startsWith("cc3")) return "CC3 - Risk Assessment";
  if (r.startsWith("cc4")) return "CC4 - Monitoring";
  if (r.startsWith("cc5")) return "CC5 - Control Activities";
  if (r.startsWith("cc6")) return "CC6 - Logical Access";
  if (r.startsWith("cc7")) return "CC7 - System Operations";
  if (r.startsWith("cc8")) return "CC8 - Change Management";
  if (r.startsWith("cc9")) return "CC9 - Risk Mitigation";
  if (r.startsWith("a1") || r.startsWith("cc_a")) return "A1 - Availability";
  if (r.startsWith("c1") || r.startsWith("cc_c")) return "C1 - Confidentiality";
  if (r.startsWith("pi1")) return "PI1 - Processing Integrity";
  if (r.startsWith("p")) return "P - Privacy";
  return "CC - Security";
}

function getSeverity(finding: ProwlerFinding): "critical" | "high" | "medium" | "low" {
  const s = (finding.severity || "").toLowerCase();
  if (s === "critical") return "critical";
  if (s === "high") return "high";
  if (s === "low") return "low";
  return "medium";
}

function getCheckId(finding: ProwlerFinding): string {
  return finding.metadata?.event_code || finding.check_id || finding.finding_info?.uid?.split("-")?.[3] || "";
}

function getStatus(finding: ProwlerFinding): string {
  return finding.status_code || finding.status || "";
}

export function parseProwlerOutput(raw: unknown): MappedControl[] {
  let findings: ProwlerFinding[] = [];

  if (Array.isArray(raw)) {
    findings = raw as ProwlerFinding[];
  } else if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.findings)) findings = obj.findings as ProwlerFinding[];
    else if (Array.isArray(obj.data)) findings = obj.data as ProwlerFinding[];
  }

  if (findings.length === 0) return [];

  // Group by SOC 2 requirement
  const controlMap: Record<string, MappedControl> = {};

  for (const finding of findings) {
    const checkId = getCheckId(finding);
    const soc2Requirements = finding.unmapped?.compliance?.["SOC2"] ||
                             finding.unmapped?.compliance?.["soc2"] || [];

    // If no SOC 2 mapping from Prowler, skip
    if (soc2Requirements.length === 0) continue;

    for (const req of soc2Requirements) {
      const controlId = req.toUpperCase().replace(/_/g, ".");
      const category = getCategoryFromRequirement(req);

      if (!controlMap[controlId]) {
        controlMap[controlId] = {
          control_id: controlId,
          category,
          title: finding.finding_info?.title || `SOC 2 ${controlId}`,
          description: `SOC 2 requirement ${controlId} — assessed via Prowler`,
          status: "not_assessed",
          severity: getSeverity(finding),
          prowler_checks: [],
          findings: [],
        };
      }

      const ctrl = controlMap[controlId];
      if (checkId && !ctrl.prowler_checks.includes(checkId)) {
        ctrl.prowler_checks.push(checkId);
      }
      ctrl.findings.push(finding);

      // Escalate severity if higher
      const fSev = getSeverity(finding);
      const sevOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      if (sevOrder[fSev] > sevOrder[ctrl.severity]) {
        ctrl.severity = fSev;
      }
    }
  }

  // Calculate status per control
  for (const ctrl of Object.values(controlMap)) {
    if (ctrl.findings.length === 0) { ctrl.status = "not_assessed"; continue; }
    const passes = ctrl.findings.filter(f => getStatus(f) === "PASS").length;
    const fails = ctrl.findings.filter(f => getStatus(f) === "FAIL").length;
    if (fails === 0 && passes > 0) ctrl.status = "compliant";
    else if (passes > 0 && fails > 0) ctrl.status = "partial";
    else if (fails > 0) ctrl.status = "non_compliant";
    else ctrl.status = "not_assessed";
  }

  return Object.values(controlMap);
}

export function calculateScore(controls: MappedControl[]): number {
  if (controls.length === 0) return 0;
  const compliant = controls.filter(c => c.status === "compliant").length;
  return Math.round((compliant / controls.length) * 100);
}

export function generateSummary(controls: MappedControl[]) {
  const total = controls.length;
  const compliant = controls.filter(c => c.status === "compliant").length;
  const partial = controls.filter(c => c.status === "partial").length;
  const nonCompliant = controls.filter(c => c.status === "non_compliant").length;
  const notAssessed = controls.filter(c => c.status === "not_assessed").length;
  const critical = controls.filter(c => c.status === "non_compliant" && c.severity === "critical").length;
  const score = calculateScore(controls);
  return { total, compliant, partial, nonCompliant, notAssessed, critical, score };
}
