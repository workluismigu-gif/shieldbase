import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID || "10e95a0a-ac49-4a44-9fda-00b0d3b58c24";
const AZURE_TENANT_ID = "common"; // Multi-tenant
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://shieldbase.vercel.app"}/api/auth/azure/callback`;

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
  const tokenUrl = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams();
  params.append("client_id", AZURE_CLIENT_ID);
  params.append("scope", "Directory.Read.All Policy.Read.All Reports.Read.All SecurityEvents.Read.All User.Read offline_access");
  params.append("code", code);
  params.append("redirect_uri", REDIRECT_URI);
  params.append("grant_type", "authorization_code");
  // Note: We don't send client_secret for public clients/SPAs, but for server-side we usually do. 
  // For this MVP, we'll use the access token directly for scanning.

  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    console.error("Azure token exchange failed:", tokenData);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://shieldbase.vercel.app"}/dashboard/settings?error=token_exchange_failed`);
  }

  // Get tenant info from the token or Graph API if needed, but for now we store the tokens
  // In a production app, you'd call Graph API to get the tenant ID associated with this token
  
  // Save tokens to org tech_stack
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // For Azure, we store the access token and refresh token. 
  // Note: Prowler Azure usually uses Service Principals (Client ID/Secret). 
  // Since we are using OAuth, we will store the tokens and potentially use them to create a temporary SP or use delegated scanning.
  // For now, we'll store the tokens.
  
  const { error: updateError } = await supabase
    .from("organizations")
    .update({
      tech_stack: {
        azure_access_token: tokenData.access_token,
        azure_refresh_token: tokenData.refresh_token,
        azure_token_expiry: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        azure_connected_at: new Date().toISOString(),
        // We might need to fetch the tenant_id from the token claims (tid)
      },
    })
    .eq("id", orgId);

  if (updateError) {
    console.error("Failed to save Azure tokens:", updateError);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://shieldbase.vercel.app"}/dashboard/settings?error=save_failed`);
  }

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://shieldbase.vercel.app"}/dashboard/settings?azure=connected`);
}
