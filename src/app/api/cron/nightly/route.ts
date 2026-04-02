import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

// This endpoint is called by EventBridge via a Lambda shim, or directly via cron
// Scans all orgs with connected integrations
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
  }

  console.log(`Nightly scan triggered for ${results.length} org/provider pairs`);
  return NextResponse.json({ ok: true, triggered: results });
}

// Also support GET for simple health check
export async function GET() {
  return NextResponse.json({ ok: true, message: "Nightly scan endpoint ready" });
}
