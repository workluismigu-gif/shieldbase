import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://shieldbase.vercel.app";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${SITE_URL}/dashboard/settings?error=${error}`);
  }
  if (!code || !state) {
    return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
  }

  const orgId = state;
  const redirectUri = `${SITE_URL}/api/auth/slack/callback`;

  const params = new URLSearchParams();
  params.append("client_id", process.env.SLACK_CLIENT_ID ?? "");
  params.append("client_secret", process.env.SLACK_CLIENT_SECRET ?? "");
  params.append("code", code);
  params.append("redirect_uri", redirectUri);

  const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const tokenData = await tokenRes.json();

  if (!tokenData.ok) {
    console.error("Slack token exchange failed:", JSON.stringify(tokenData));
    const slackErr = tokenData.error ?? "unknown";
    return NextResponse.redirect(`${SITE_URL}/dashboard/settings?error=slack_${slackErr}`);
  }

  const accessToken: string = tokenData.access_token;
  const teamId: string = tokenData.team?.id ?? "";
  const teamName: string = tokenData.team?.name ?? "";

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: existingOrg } = await supabase
    .from("organizations")
    .select("tech_stack")
    .eq("id", orgId)
    .single();

  const existing = (existingOrg?.tech_stack ?? {}) as Record<string, unknown>;

  const { error: updateError } = await supabase
    .from("organizations")
    .update({
      tech_stack: {
        ...existing,
        slack_access_token: accessToken,
        slack_team_id: teamId,
        slack_team_name: teamName,
        slack_connected_at: new Date().toISOString(),
      },
    })
    .eq("id", orgId);

  if (updateError) {
    console.error("Failed to save Slack tokens:", updateError);
    return NextResponse.redirect(`${SITE_URL}/dashboard/settings?error=save_failed`);
  }

  fetch(`${SITE_URL}/api/scan/trigger`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.INTERNAL_TRIGGER_SECRET}`,
    },
    body: JSON.stringify({ org_id: orgId, provider: "slack" }),
  }).catch(console.error);

  return NextResponse.redirect(`${SITE_URL}/dashboard/settings?slack=connected`);
}
