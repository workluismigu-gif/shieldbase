import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

// GitHub-only poll every 15 minutes via Vercel Cron
// AWS scans stay on nightly schedule (cheaper)
export async function POST(req: NextRequest) {
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
    .select("id, name, tech_stack")
    .not("tech_stack->github_token", "is", null);

  if (!orgs || orgs.length === 0) {
    return NextResponse.json({ ok: true, message: "No orgs with GitHub connected" });
  }

  // Log initiation to Supabase activity_events (if table exists)
  const now = new Date().toISOString();
  for (const org of orgs) {
    try {
      await supabase.from("activity_events").insert({
        org_id: org.id,
        type: "scan",
        title: "🐙 GitHub auto-scan initiated",
        detail: "GitHub Actions cron poll",
        timestamp: now,
      });
    } catch {
      // silent if table doesn't exist
    }
  }

  const lambda = new LambdaClient({ region: "us-east-1" });
  const results = [];

  for (const org of orgs) {
    const tech = (org.tech_stack ?? {}) as Record<string, string>;
    const githubToken = tech.github_token;
    if (!githubToken) continue;

    await lambda.send(new InvokeCommand({
      FunctionName: "shieldbase-prowler-scanner",
      InvocationType: "Event",
      Payload: Buffer.from(JSON.stringify({
        org_id: org.id,
        provider: "github",
        github_token: githubToken,
        github_login: tech.github_login ?? "",
      })),
    }));
    results.push({ org: org.name, provider: "github" });
  }

  console.log(`GitHub poll triggered for ${results.length} orgs`);
  return NextResponse.json({ ok: true, triggered: results });
}
