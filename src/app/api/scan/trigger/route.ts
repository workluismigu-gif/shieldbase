import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

// Triggered by: onboarding (when ARN saved) or EventBridge nightly cron
export async function POST(req: NextRequest) {
  try {
    // Verify internal secret to prevent abuse
    const authHeader = req.headers.get("authorization");
    const internalSecret = process.env.INTERNAL_TRIGGER_SECRET;
    if (internalSecret && authHeader !== `Bearer ${internalSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { org_id } = body; // optional — if omitted, scan all orgs

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch orgs to scan
    let query = supabase
      .from("organizations")
      .select("id, name, tech_stack")
      .not("tech_stack->aws_role_arn", "is", null);
    if (org_id) query = query.eq("id", org_id);

    const { data: orgs, error } = await query;
    if (error) throw error;
    if (!orgs || orgs.length === 0) {
      return NextResponse.json({ ok: true, message: "No orgs with AWS connected" });
    }

    // Invoke Lambda for each org
    const lambda = new LambdaClient({ region: "us-east-1" });
    const results = [];

    for (const org of orgs) {
      const techStack = (org.tech_stack ?? {}) as Record<string, string>;
      const roleArn = techStack.aws_role_arn;
      if (!roleArn) continue;

      console.log(`Triggering scan for org ${org.id} (${org.name}) with role ${roleArn}`);

      const command = new InvokeCommand({
        FunctionName: "shieldbase-prowler-scanner",
        InvocationType: "Event", // async — don't wait for result
        Payload: Buffer.from(JSON.stringify({ org_id: org.id, role_arn: roleArn })),
      });

      const response = await lambda.send(command);
      results.push({ org_id: org.id, name: org.name, statusCode: response.StatusCode });
    }

    return NextResponse.json({ ok: true, triggered: results.length, results });
  } catch (err: unknown) {
    console.error("Scan trigger error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
