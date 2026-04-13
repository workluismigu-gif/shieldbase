import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Google Workspace OAuth callback
 * Exchanges auth code for tokens and saves to org tech_stack
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // org_id
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://shieldbase.vercel.app"}/dashboard/settings?error=${error}`);
  }

  if (!code || !state) {
    return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
  }

  const orgId = state;

  // Exchange code for tokens
  const tokenUrl = "https://oauth2.googleapis.com/token";
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://shieldbase.vercel.app"}/api/auth/google/callback`;

  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    console.error("Google token exchange failed:", tokenData);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://shieldbase.vercel.app"}/dashboard/settings?error=token_exchange_failed`);
  }

  // Get user info to verify admin access
  const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const userInfo = await userInfoResponse.json();

  // Save tokens and domain to org tech_stack
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
        google_access_token: tokenData.access_token,
        google_refresh_token: tokenData.refresh_token,
        google_token_expiry: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        google_domain: userInfo.hd,
        google_email: userInfo.email,
        google_connected_at: new Date().toISOString(),
      },
    })
    .eq("id", orgId);

  if (updateError) {
    console.error("Failed to save Google tokens:", updateError);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://shieldbase.vercel.app"}/dashboard/settings?error=save_failed`);
  }

  // Trigger initial Google Workspace scan
  const triggerUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://shieldbase.vercel.app"}/api/scan/trigger`;
  fetch(triggerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.INTERNAL_TRIGGER_SECRET}`,
    },
    body: JSON.stringify({ org_id: orgId, provider: "google_workspace" }),
  }).catch(console.error);

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://shieldbase.vercel.app"}/dashboard/settings?google=connected`);
}
