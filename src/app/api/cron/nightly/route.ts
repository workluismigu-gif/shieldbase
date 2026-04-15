import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

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
        Payload: Buffer.from(JSON.stringify({ org_id: org.id, provider: "github", github_token: tech.github_token, github_login: tech.github_login ?? "" })),
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
          google_access_token: tech.google_access_token,
          google_refresh_token: tech.google_refresh_token ?? "",
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
          slack_access_token: tech.slack_access_token,
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

  return NextResponse.json({ ok: true, triggered: results });
}

export const GET = run;
export const POST = run;
