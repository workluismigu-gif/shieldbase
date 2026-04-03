import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

/**
 * GitHub webhook receiver for real-time SOC 2 monitoring
 * Listens for repo setting changes and triggers targeted re-scans
 */
export async function POST(req: NextRequest) {
  const event = req.headers.get("x-github-event");
  const signature = req.headers.get("x-hub-signature-256");

  // Verify webhook signature
  const body = await req.text();
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (secret && signature) {
    const crypto = await import("crypto");
    const hmac = crypto.createHmac("sha256", secret);
    const digest = `sha256=${hmac.update(body).digest("hex")}`;
    if (signature !== digest) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const payload = JSON.parse(body);
  console.log(`GitHub webhook received: ${event}`);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find all orgs with GitHub connected
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, tech_stack")
    .not("tech_stack->github_token", "is", null);

  if (!orgs || orgs.length === 0) {
    return NextResponse.json({ ok: true, message: "No orgs with GitHub" });
  }

  const lambda = new LambdaClient({ region: "us-east-1" });
  const triggered: string[] = [];

  // Handle relevant events
  if (event === "repository" || event === "organization" || event === "push" || event === "pull_request") {
    for (const org of orgs) {
      const tech = (org.tech_stack ?? {}) as Record<string, string>;
      const githubToken = tech.github_token;
      if (!githubToken) continue;

      // Log webhook event for audit trail
      try {
        await supabase.from("webhook_events").insert({
          org_id: org.id,
          provider: "github",
          event_type: event,
          payload: payload,
          processed: true,
        });
      } catch {}

      // Trigger a targeted GitHub scan
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
      triggered.push(org.id);

      // Log the webhook event to activity_events
      try {
        await supabase.from("activity_events").insert({
          org_id: org.id,
          type: "scan",
          title: `🐙 GitHub webhook triggered scan`,
          detail: `Event: ${event} — Real-time re-check`,
          timestamp: new Date().toISOString(),
        });
      } catch {}
    }
  }

  console.log(`Webhook ${event} triggered scans for ${triggered.length} orgs`);
  return NextResponse.json({ ok: true, triggered });
}

// GitHub sends a GET request to verify the webhook URL
export async function GET() {
  return NextResponse.json({ ok: true, message: "GitHub webhook receiver active" });
}
