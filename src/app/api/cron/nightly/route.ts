import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { decryptToken } from "@/lib/crypto";

// Scheduled scan endpoint — runs daily at 06:00 UTC via Vercel cron.
// Vercel cron invokes with GET + `Authorization: Bearer ${CRON_SECRET}`.
// Manual triggers (from callbacks) use POST + `Authorization: Bearer ${INTERNAL_TRIGGER_SECRET}`.
// Both call the same handler.
async function run(req: NextRequest) {
  // Vercel cron invocations include `x-vercel-cron: 1` (set by the platform, not spoofable from
  // outside since Vercel strips the header on public requests). Manual invocations use the
  // internal bearer secret.
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const authHeader = req.headers.get("authorization");
  const internalSecret = process.env.INTERNAL_TRIGGER_SECRET;
  const internalOk = internalSecret && authHeader === `Bearer ${internalSecret}`;
  if (!isVercelCron && !internalOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, tech_stack");

  if (!orgs || orgs.length === 0) return NextResponse.json({ ok: true, message: "No orgs" });

  const lambda = new LambdaClient({ region: "us-east-1" });
  const results = [];

  for (const org of orgs) {
    const tech = (org.tech_stack ?? {}) as Record<string, string>;

    // AWS scan
    if (tech.aws_role_arn) {
      await lambda.send(new InvokeCommand({
        FunctionName: "shieldbase-prowler-scanner",
        InvocationType: "Event",
        Payload: Buffer.from(JSON.stringify({ org_id: org.id, provider: "aws", role_arn: tech.aws_role_arn })),
      }));
      results.push({ org: org.name, provider: "aws" });
    }

    // GitHub scan
    if (tech.github_token) {
      await lambda.send(new InvokeCommand({
        FunctionName: "shieldbase-prowler-scanner",
        InvocationType: "Event",
        Payload: Buffer.from(JSON.stringify({ org_id: org.id, provider: "github", github_token: decryptToken(tech.github_token), github_login: tech.github_login ?? "" })),
      }));
      results.push({ org: org.name, provider: "github" });
    }

    // Google Workspace scan
    if (tech.google_access_token) {
      await lambda.send(new InvokeCommand({
        FunctionName: "shieldbase-prowler-scanner",
        InvocationType: "Event",
        Payload: Buffer.from(JSON.stringify({
          org_id: org.id,
          provider: "google_workspace",
          google_access_token: decryptToken(tech.google_access_token),
          google_refresh_token: decryptToken(tech.google_refresh_token) ?? "",
          google_domain: tech.google_domain ?? "",
        })),
      }));
      results.push({ org: org.name, provider: "google_workspace" });
    }

    // Slack scan
    if (tech.slack_access_token) {
      await lambda.send(new InvokeCommand({
        FunctionName: "shieldbase-prowler-scanner",
        InvocationType: "Event",
        Payload: Buffer.from(JSON.stringify({
          org_id: org.id,
          provider: "slack",
          slack_access_token: decryptToken(tech.slack_access_token),
          slack_team_id: tech.slack_team_id ?? "",
        })),
      }));
      results.push({ org: org.name, provider: "slack" });
    }
  }

  console.log(`Daily scheduled scan triggered for ${results.length} org/provider pairs`);

  // Write one activity_events row per provider per org so the UI can show "scan triggered".
  for (const r of results) {
    const org = orgs.find(o => o.name === r.org);
    if (!org) continue;
    await supabase.from("activity_events").insert({
      org_id: org.id,
      type: "scan_triggered",
      title: `Scheduled ${r.provider} scan triggered`,
      detail: `Daily cron invoked Lambda for ${r.provider}`,
      timestamp: new Date().toISOString(),
    });
  }

  // Overdue PBC surfacing: for each request past due date and still pending, emit an
  // activity_events row so the UI shows a nag line. (Email wiring comes when the env
  // has a Resend/SendGrid key configured — for now we surface on-dashboard.)
  const today = new Date().toISOString().slice(0, 10);
  const { data: overdueItems } = await supabase
    .from("pbc_requests")
    .select("id, org_id, title, due_date")
    .in("status", ["pending"])
    .lt("due_date", today);

  if (overdueItems && overdueItems.length > 0) {
    // Dedupe: only one reminder per item per day by scanning existing activity_events.
    const nowIso = new Date().toISOString();
    for (const pbc of overdueItems) {
      const daysOverdue = Math.max(1, Math.floor((Date.now() - new Date(pbc.due_date).getTime()) / 86400000));
      // Skip if we already fired a reminder for this pbc in the last 20 hours.
      const { data: recent } = await supabase
        .from("activity_events")
        .select("id")
        .eq("org_id", pbc.org_id)
        .eq("type", "pbc_overdue")
        .gt("timestamp", new Date(Date.now() - 20 * 3600 * 1000).toISOString())
        .ilike("detail", `%${pbc.id}%`)
        .limit(1);
      if (recent && recent.length > 0) continue;

      await supabase.from("activity_events").insert({
        org_id: pbc.org_id,
        type: "pbc_overdue",
        title: `PBC overdue: ${pbc.title}`,
        detail: `Due ${pbc.due_date} (${daysOverdue}d overdue) · ${pbc.id}`,
        timestamp: nowIso,
      });
    }
  }

  return NextResponse.json({ ok: true, triggered: results, overdue_pbc: overdueItems?.length ?? 0 });
}

export const GET = run;
export const POST = run;
