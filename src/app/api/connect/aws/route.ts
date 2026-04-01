import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { role_arn, auth_token } = await req.json();

    if (!role_arn || !role_arn.startsWith("arn:aws:iam::")) {
      return NextResponse.json({ error: "Invalid ARN format" }, { status: 400 });
    }

    // Use user's token to find their org (respects RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${auth_token}` } } }
    );

    const { data: org, error } = await supabase
      .from("organizations")
      .update({ tech_stack: { aws_role_arn: role_arn } })
      .eq("owner_id", (await supabase.auth.getUser(auth_token)).data.user?.id ?? "")
      .select("id")
      .single();

    if (error || !org) {
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
      body: JSON.stringify({ org_id: org.id }),
    }).catch(console.error); // fire and forget — scan runs async

    return NextResponse.json({ ok: true, org_id: org.id });
  } catch (err: unknown) {
    console.error("AWS connect error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
