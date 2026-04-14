import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { invite_token, auth_token } = await req.json();
    if (!invite_token || !auth_token) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${auth_token}` } } }
    );
    const { data: userData } = await userClient.auth.getUser(auth_token);
    const user = userData?.user;
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: invite, error: fetchErr } = await admin
      .from("org_members")
      .select("id, org_id, email, role, accepted_at")
      .eq("invite_token", invite_token)
      .single();

    if (fetchErr || !invite) {
      return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
    }

    if (invite.email.toLowerCase() !== (user.email ?? "").toLowerCase()) {
      return NextResponse.json({
        error: `This invite was sent to ${invite.email}. Sign in with that email to accept.`,
      }, { status: 403 });
    }

    const { error: updateErr } = await admin
      .from("org_members")
      .update({
        user_id: user.id,
        accepted_at: new Date().toISOString(),
        invite_token: null,
      })
      .eq("id", invite.id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, org_id: invite.org_id, role: invite.role });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
