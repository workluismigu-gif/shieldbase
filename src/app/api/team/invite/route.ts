import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://shieldbase.vercel.app";

export async function POST(req: NextRequest) {
  try {
    const { email, role, auth_token } = await req.json();

    if (!email || !role) {
      return NextResponse.json({ error: "email and role required" }, { status: 400 });
    }
    if (!["admin", "auditor_readonly", "auditor_staff"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${auth_token}` } } }
    );
    const { data: userData } = await userClient.auth.getUser(auth_token);
    const userId = userData?.user?.id;
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { data: org } = await userClient
      .from("organizations")
      .select("id, name")
      .eq("owner_id", userId)
      .single();
    if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

    const inviteToken = randomBytes(24).toString("hex");

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: insertError } = await admin
      .from("org_members")
      .upsert({
        org_id: org.id,
        email,
        role,
        invite_token: inviteToken,
        invited_by: userId,
        invited_at: new Date().toISOString(),
      }, { onConflict: "org_id,email" });

    if (insertError) {
      console.error("Invite insert failed:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const inviteUrl = `${SITE_URL}/invite/${inviteToken}`;

    return NextResponse.json({ ok: true, invite_url: inviteUrl, org_name: org.name });
  } catch (err: unknown) {
    console.error("Invite error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
