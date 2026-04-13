import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";

export async function POST(req: NextRequest) {
  try {
    const { role_arn, auth_token } = await req.json();

    if (!role_arn || !role_arn.startsWith("arn:aws:iam::")) {
      return NextResponse.json({ error: "Invalid ARN format" }, { status: 400 });
    }

    // Probe: verify the role exists and trusts ShieldBase by attempting AssumeRole.
    // This catches the ROLLBACK_COMPLETE case where CloudFormation never actually
    // created the role, so the user gets a clear error instead of false success.
    const sts = new STSClient({ region: "us-east-1" });
    try {
      await sts.send(new AssumeRoleCommand({
        RoleArn: role_arn,
        RoleSessionName: "shieldbase-connect-probe",
        DurationSeconds: 900,
      }));
    } catch (probeErr: unknown) {
      const msg = probeErr instanceof Error ? probeErr.message : String(probeErr);
      console.error("STS AssumeRole probe failed:", msg);
      if (msg.includes("NoSuchEntity") || msg.includes("cannot be found") || msg.includes("does not exist")) {
        return NextResponse.json({
          error: "Role not found in your AWS account. If your CloudFormation stack shows ROLLBACK_COMPLETE, delete it and relaunch — the role was never created.",
        }, { status: 400 });
      }
      if (msg.includes("AccessDenied") || msg.includes("not authorized")) {
        return NextResponse.json({
          error: "ShieldBase is not allowed to assume this role. The role's trust policy must include our account (886821787192) as a trusted principal.",
        }, { status: 400 });
      }
      return NextResponse.json({ error: `Role validation failed: ${msg}` }, { status: 400 });
    }

    // Use user's token to find their org (respects RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${auth_token}` } } }
    );

    const userId = (await supabase.auth.getUser(auth_token)).data.user?.id ?? "";

    // Fetch existing tech_stack so we merge instead of overwriting (don't wipe GitHub/Google/Slack)
    const { data: existingOrg } = await supabase
      .from("organizations")
      .select("id, tech_stack")
      .eq("owner_id", userId)
      .single();

    if (!existingOrg) {
      return NextResponse.json({ error: "Organization not found for user" }, { status: 404 });
    }

    const existingTech = (existingOrg.tech_stack ?? {}) as Record<string, unknown>;

    const { data: org, error } = await supabase
      .from("organizations")
      .update({
        tech_stack: {
          ...existingTech,
          aws_role_arn: role_arn,
          aws_connected_at: new Date().toISOString(),
        },
      })
      .eq("id", existingOrg.id)
      .select("id")
      .single();

    if (error || !org) {
      console.error("Failed to save ARN:", error);
      return NextResponse.json({ error: "Failed to save ARN" }, { status: 500 });
    }

    // Trigger onboarding scan server-side (secret never leaves server)
    const triggerUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://shieldbase.vercel.app"}/api/scan/trigger`;
    fetch(triggerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.INTERNAL_TRIGGER_SECRET}`,
      },
      body: JSON.stringify({ org_id: org.id, provider: "aws" }),
    }).catch(console.error); // fire and forget — scan runs async

    return NextResponse.json({ ok: true, org_id: org.id });
  } catch (err: unknown) {
    console.error("AWS connect error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
