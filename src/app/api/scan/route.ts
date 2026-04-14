import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { parseProwlerOutput, generateSummary, type MappedControl } from "@/lib/prowler-mapper";
import { collectControlEvidence, type EvidenceRecord } from "@/lib/evidence-collector";

// Keywords that map Prowler check titles to checklist task names
const TASK_AUTO_COMPLETE: Array<{ keywords: string[]; taskMatch: string }> = [
  { keywords: ["mfa", "multi-factor"], taskMatch: "Enable MFA for all AWS IAM users" },
  { keywords: ["cloudtrail"], taskMatch: "Enable CloudTrail in all regions" },
  { keywords: ["s3", "public access", "block public"], taskMatch: "Block public S3 access at account level" },
  { keywords: ["guardduty"], taskMatch: "Enable GuardDuty" },
  { keywords: ["vpc flow", "flow log"], taskMatch: "Enable VPC Flow Logs" },
  { keywords: ["rds", "encrypt", "storage encrypt"], taskMatch: "Encrypt RDS instances at rest" },
  { keywords: ["kms", "key rotation"], taskMatch: "Enable KMS key rotation" },
];

async function autoCompleteChecklistTasks(
  supabase: SupabaseClient,
  orgId: string,
  controls: MappedControl[]
) {
  try {
    const { data: tasks } = await supabase
      .from("checklist_items")
      .select("id, task, completed")
      .eq("org_id", orgId)
      .eq("completed", false);

    if (!tasks || tasks.length === 0) return;

    const now = new Date().toISOString();
    const toComplete: string[] = [];

    for (const mapping of TASK_AUTO_COMPLETE) {
      // Check if relevant controls are all passing
      const relevant = controls.filter(c =>
        mapping.keywords.some(kw =>
          c.title.toLowerCase().includes(kw) ||
          c.prowler_checks.some(ch => ch.toLowerCase().includes(kw))
        )
      );
      if (relevant.length === 0) continue;
      const allPassing = relevant.every(c => c.status === "compliant");
      if (!allPassing) continue;

      // Find matching task
      const task = tasks.find(t =>
        t.task.toLowerCase().includes(mapping.taskMatch.toLowerCase()) ||
        mapping.taskMatch.toLowerCase().includes(t.task.toLowerCase())
      );
      if (task) toComplete.push(task.id);
    }

    // Also auto-complete "Connect AWS account" since scan ran = AWS is connected
    const connectTask = tasks.find(t => t.task.toLowerCase().includes("connect aws"));
    if (connectTask) toComplete.push(connectTask.id);

    if (toComplete.length > 0) {
      await supabase
        .from("checklist_items")
        .update({ completed: true, completed_at: now })
        .in("id", [...new Set(toComplete)]);
      console.log(`Auto-completed ${toComplete.length} checklist tasks`);
    }
  } catch (e) {
    console.error("Auto-complete tasks error:", e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { org_id, scan_data, auth_token, service_role_key, provider = "aws" } = body;

    if (!org_id || !scan_data) {
      return NextResponse.json({ error: "Missing org_id or scan_data" }, { status: 400 });
    }

    // Prefer service role key (from Lambda) for RLS bypass, then env, then user token
    const serviceKey = service_role_key || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      !serviceKey && auth_token ? { global: { headers: { Authorization: `Bearer ${auth_token}` } } } : undefined
    );

    // Parse Prowler findings
    const controls = parseProwlerOutput(scan_data);
    let summary = generateSummary(controls);

    // For non-AWS providers (GitHub etc), controls won't map to SOC2
    // Build summary directly from raw findings
    if (provider !== "aws" && Array.isArray(scan_data) && scan_data.length > 0) {
      const rawTotal = scan_data.length;
      const rawPass = scan_data.filter((f: Record<string,string>) => (f.status_code || f.status) === "PASS").length;
      const rawFail = scan_data.filter((f: Record<string,string>) => (f.status_code || f.status) === "FAIL").length;
      summary = {
        total: rawTotal,
        compliant: rawPass,
        partial: 0,
        nonCompliant: rawFail,
        notAssessed: 0,
        critical: 0,
        score: Math.round((rawPass / rawTotal) * 100),
      };
    }

    // Save raw scan result
    const { error: scanError } = await supabase.from("scan_results").insert({
      org_id,
      scanner: "prowler",
      scan_type: provider,
      findings: scan_data,
      summary,
    });
    if (scanError) throw scanError;

    // Upsert controls with change detection
    const now = new Date().toISOString();
    const controlRows = controls.map(c => ({
      org_id,
      category: c.category,
      control_id: c.control_id,
      title: c.title,
      description: c.description,
      status: c.status,
      severity: c.severity,
      updated_at: now,
    }));

    if (controlRows.length > 0) {
      // Fetch existing controls to detect changes
      const { data: existingControls } = await supabase
        .from("controls")
        .select("control_id, status")
        .eq("org_id", org_id);

      const existingMap = new Map((existingControls ?? []).map(c => [c.control_id, c.status]));
      const changes: { control_id: string; oldStatus: string; newStatus: string; title: string }[] = [];

      for (const ctrl of controls) {
        const oldStatus = existingMap.get(ctrl.control_id);
        if (oldStatus && oldStatus !== ctrl.status) {
          changes.push({ control_id: ctrl.control_id, oldStatus, newStatus: ctrl.status, title: ctrl.title });
        }
      }

      // Upsert controls with previous_status tracking
      const { error: controlError } = await supabase
        .from("controls")
        .upsert(controlRows, { onConflict: "org_id,control_id" });
      if (controlError) console.warn("Control upsert warning:", controlError.message);

      // Update previous_status to match current status (for next comparison)
      for (const ctrl of controls) {
        await supabase
          .from("controls")
          .update({ previous_status: ctrl.status })
          .eq("org_id", org_id)
          .eq("control_id", ctrl.control_id);
      }

      // Log control changes to activity_events
      for (const change of changes) {
        const icon = change.newStatus === "compliant" ? "" : change.newStatus === "non_compliant" ? "" : "";
        const oldLabel = change.oldStatus === "compliant" ? "passing" : change.oldStatus === "non_compliant" ? "failing" : change.oldStatus;
        const newLabel = change.newStatus === "compliant" ? "passing" : change.newStatus === "non_compliant" ? "failing" : change.newStatus;
        try {
          await supabase.from("activity_events").insert({
            org_id,
            type: "control_change",
            title: `${icon} ${change.control_id}: ${change.title}`,
            detail: `${oldLabel} → ${newLabel}`,
            timestamp: now,
          });
        } catch {
          // silent if table doesn't exist yet
        }
      }
    }

    // Update org readiness score
    await supabase
      .from("organizations")
      .update({ readiness_score: summary.score })
      .eq("id", org_id);

    // Auto-complete checklist tasks based on passing controls
    await autoCompleteChecklistTasks(supabase, org_id, controls);

    // Phase 2: Collect evidence for passing controls
    const { data: scanResultRow } = await supabase
      .from("scan_results")
      .select("id")
      .eq("org_id", org_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single() as { data: { id: string } | null; error: unknown };
    const scanResultId = scanResultRow?.id;

    for (const ctrl of controls) {
      if (ctrl.status === "compliant") {
        // Find the raw finding for this control
        const rawFinding = (scan_data as Array<Record<string, unknown>>).find(
          (f) => {
            const checkId = f.check_id as string | undefined;
            const compliance = f.compliance as Record<string, string[]> | undefined;
            return checkId === ctrl.control_id || compliance?.soc2_aws?.includes(ctrl.control_id);
          }
        );
        if (rawFinding) {
          await collectControlEvidence(supabase as unknown as ReturnType<typeof import("@supabase/supabase-js").createClient>, {
            org_id,
            control_id: ctrl.control_id,
            scan_id: scanResultId,
            evidence_type: "api_response",
            evidence_data: rawFinding,
            collected_at: now,
          });
        }
      }
    }

    return NextResponse.json({ ok: true, summary, controls_mapped: controls.length });
  } catch (err: unknown) {
    console.error("Scan upload error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
