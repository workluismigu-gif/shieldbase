import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Token-gated, unauthenticated: the invite token itself is the secret.
// Returns minimal info needed to render the invite acceptance UI.
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: invite } = await admin
      .from("org_members")
      .select("email, role, accepted_at, org_id, organizations(name)")
      .eq("invite_token", token)
      .single();

    if (!invite) {
      return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
    }

    if (invite.accepted_at) {
      return NextResponse.json({ error: "This invite has already been accepted" }, { status: 410 });
    }

    const orgName = (invite.organizations as unknown as { name?: string } | null)?.name ?? "an organization";

    return NextResponse.json({
      email: invite.email,
      role: invite.role,
      org_name: orgName,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
