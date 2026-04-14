import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code) {
    return NextResponse.redirect(new URL("/dashboard/settings?error=github_denied", req.nextUrl.origin));
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Accept": "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    return NextResponse.redirect(new URL("/dashboard/settings?error=github_token", req.nextUrl.origin));
  }

  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "ShieldBase" },
  });
  const githubUser = await userRes.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (state) {
    const { data: org } = await supabase
      .from("organizations")
      .select("id, tech_stack")
      .eq("id", state)
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

      const triggerUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://shieldbase.vercel.app"}/api/scan/trigger`;
      fetch(triggerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.INTERNAL_TRIGGER_SECRET}`,
        },
        body: JSON.stringify({ org_id: org.id, provider: "github" }),
      }).catch(console.error);
    }
  }

  return NextResponse.redirect(new URL("/dashboard/settings?connected=github", req.nextUrl.origin));
}
