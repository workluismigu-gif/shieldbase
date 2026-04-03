/**
 * Evidence package generator for SOC 2 audits
 * Creates exportable, timestamped evidence bundles per control
 * Runs client-side — no server cost
 */

import { getControlEvidence, type EvidenceRecord } from "./evidence-collector";
import { createClient } from "@supabase/supabase-js";

export interface EvidencePackage {
  controlId: string;
  controlTitle: string;
  soc2Criteria: string[];
  generatedAt: string;
  orgName: string;
  status: "compliant" | "non_compliant" | "partial" | "not_assessed";
  evidenceSummary: string;
  evidenceRecords: EvidenceRecord[];
  complianceHistory: { timestamp: string; status: string }[];
}

/**
 * Generate a complete evidence package for a SOC 2 control
 */
export async function generateEvidencePackage(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  controlId: string,
  controlTitle: string,
  soc2Criteria: string[]
): Promise<EvidencePackage> {
  // Fetch evidence records
  const evidenceRecords = await getControlEvidence(supabase, orgId, controlId);

  // Fetch control status history from activity_events
  const { data: historyData } = await supabase
    .from("activity_events")
    .select("timestamp, detail")
    .eq("org_id", orgId)
    .eq("type", "control_change")
    .like("title", `%${controlId}%`)
    .order("timestamp", { ascending: true });

  const complianceHistory = (historyData ?? []).map((h: Record<string, string>) => ({
    timestamp: h.timestamp,
    status: h.detail || "unknown",
  }));

  // Get current control status
  const { data: controlData } = await supabase
    .from("controls")
    .select("status")
    .eq("org_id", orgId)
    .eq("control_id", controlId)
    .single() as { data: { status: string } | null; error: unknown };

  const status = (controlData?.status as EvidencePackage["status"]) || "not_assessed";

  // Get org name
  const { data: orgData } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .single() as { data: { name: string } | null; error: unknown };

  // Build evidence summary
  const evidenceSummary = buildEvidenceSummary(controlId, controlTitle, evidenceRecords);

  return {
    controlId,
    controlTitle,
    soc2Criteria,
    generatedAt: new Date().toISOString(),
    orgName: orgData?.name || "Unknown Organization",
    status,
    evidenceSummary,
    evidenceRecords,
    complianceHistory,
  };
}

/**
 * Build a human-readable evidence summary
 */
function buildEvidenceSummary(
  controlId: string,
  controlTitle: string,
  evidence: EvidenceRecord[]
): string {
  const lines = [
    `=== SOC 2 Control Evidence Package ===`,
    ``,
    `Control ID: ${controlId}`,
    `Control: ${controlTitle}`,
    `Generated: ${new Date().toLocaleString()}`,
    `Evidence records: ${evidence.length}`,
    ``,
    `--- Evidence Records ---`,
  ];

  if (evidence.length === 0) {
    lines.push("No evidence collected yet. Run a scan to collect evidence.");
  } else {
    evidence.forEach((record, i) => {
      lines.push(``);
      lines.push(`Record #${i + 1}:`);
      lines.push(`  Type: ${record.evidence_type}`);
      lines.push(`  Collected: ${new Date(record.collected_at).toLocaleString()}`);
      lines.push(`  Data: ${JSON.stringify(record.evidence_data, null, 2).split("\n").join("\n  ")}`);
    });
  }

  return lines.join("\n");
}

/**
 * Export evidence package as downloadable JSON file
 */
export function downloadEvidencePackage(pkg: EvidencePackage): void {
  const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SOC2-${pkg.controlId}-evidence-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export evidence package as formatted text (for copy/paste into audit docs)
 */
export function exportEvidenceAsText(pkg: EvidencePackage): string {
  return pkg.evidenceSummary;
}

/**
 * Generate a bulk evidence package for all controls in an org
 */
export async function generateBulkEvidencePackage(
  supabase: ReturnType<typeof createClient>,
  orgId: string
): Promise<{ packages: EvidencePackage[]; generatedAt: string; orgName: string }> {
  // Fetch all controls
  const { data: controls } = await supabase
    .from("controls")
    .select("control_id, title, status, category")
    .eq("org_id", orgId) as { data: Array<{ control_id: string; title: string; status: string; category: string }> | null; error: unknown };

  const packages: EvidencePackage[] = [];
  for (const ctrl of controls ?? []) {
    const pkg = await generateEvidencePackage(
      supabase,
      orgId,
      ctrl.control_id,
      ctrl.title,
      [ctrl.category]
    );
    packages.push(pkg);
  }

  const { data: orgData } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .single() as { data: { name: string } | null; error: unknown };

  return {
    packages,
    generatedAt: new Date().toISOString(),
    orgName: orgData?.name || "Unknown Organization",
  };
}
