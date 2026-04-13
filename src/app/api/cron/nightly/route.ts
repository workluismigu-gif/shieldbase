import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

// Scheduled scan endpoint — runs every 12 hours via EventBridge
// Expected schedule: rate(12 hours) or cron(0 */12 * * ? *)
// Scans all orgs with connected integrations (AWS, GitHub, Google Workspace, Slack)
export async function POST(req: NextRequest) {
  // Verify it's an internal call
  const authHeader = req.headers.get("authorization");
  if (process.env.INTERNAL_TRIGGER_SECRET && authHeader !== `Bearer ${process.env.INTERNAL_TRIGGER_SECRET}`) {
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

  console.log(`12h scheduled scan triggered for ${results.length} org/provider pairs`);
  return NextResponse.json({ ok: true, triggered: results });
}

// Also support GET for simple health check
export async function GET() {
  return NextResponse.json({ ok: true, message: "Nightly scan endpoint ready" });
}
