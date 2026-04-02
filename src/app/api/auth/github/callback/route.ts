import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // org_id passed via state param

  if (!code) {
    return NextResponse.redirect(new URL("/dashboard/connect?error=github_denied", req.nextUrl.origin));
  }

  // Exchange code for access token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Accept": "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID ?? "Ov23lihUSDcOADRW0Kkw",
      client_secret: process.env.GITHUB_CLIENT_SECRET ?? "a645adedd5b539f029319e877f93e94a3d28e48f",
      code,
    }),
  });
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    const errMsg = tokenData.error_description || tokenData.error || "no_token";
    console.error("GitHub token exchange failed:", tokenData);
    return NextResponse.redirect(new URL(`/dashboard/connect?error=github_token&detail=${encodeURIComponent(errMsg)}`, req.nextUrl.origin));
  }

  // Get GitHub user info
  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "ShieldBase" },
  });
  const githubUser = await userRes.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find org by state (org_id) — passed when starting OAuth
  let orgId = state;

  // Fallback: look up org by Supabase user if state not set
  if (!orgId) {
    // We can't reliably get user session here — require state
    console.error("No state param, cannot identify org");
    return NextResponse.redirect(new URL("/dashboard/connect?error=no_org", req.nextUrl.origin));
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id, tech_stack")
    .eq("id", orgId)
    .single();

  if (org) {
    const existing = (org.tech_stack ?? {}) as Record<string, string>;
    await supabase
      .from("organizations")
      .update({
        tech_stack: {
          ...existing,
          github_token: accessToken,
          github_login: githubUser.login,
          github_connected_at: new Date().toISOString(),
        },
      })
      .eq("id", org.id);

    // Trigger GitHub scan async
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://shieldbase.vercel.app";
    fetch(`${siteUrl}/api/scan/trigger`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.INTERNAL_TRIGGER_SECRET}`,
      },
      body: JSON.stringify({ org_id: org.id, provider: "github" }),
    }).catch(console.error);
  }

  return NextResponse.redirect(new URL("/dashboard/connect?connected=github", req.nextUrl.origin));
}
