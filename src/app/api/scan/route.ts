import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { parseProwlerOutput, generateSummary, type MappedControl } from "@/lib/prowler-mapper";

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
    const summary = generateSummary(controls);

    // Save raw scan result
    const { error: scanError } = await supabase.from("scan_results").insert({
      org_id,
      scanner: "prowler",
      scan_type: provider,
      findings: scan_data,
      summary,
    });
    if (scanError) throw scanError;

    // Upsert controls
    const controlRows = controls.map(c => ({
      org_id,
      category: c.category,
      control_id: c.control_id,
      title: c.title,
      description: c.description,
      status: c.status,
      severity: c.severity,
      updated_at: new Date().toISOString(),
    }));

    if (controlRows.length > 0) {
      const { error: controlError } = await supabase
        .from("controls")
        .upsert(controlRows, { onConflict: "org_id,control_id" });
      if (controlError) console.warn("Control upsert warning:", controlError.message);
    }

    // Update org readiness score
    await supabase
      .from("organizations")
      .update({ readiness_score: summary.score })
      .eq("id", org_id);

    // Auto-complete checklist tasks based on passing controls
    await autoCompleteChecklistTasks(supabase, org_id, controls);

    return NextResponse.json({ ok: true, summary, controls_mapped: controls.length });
  } catch (err: unknown) {
    console.error("Scan upload error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
