import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// GET /api/team/owner — returns the owner email for the caller's org.
// Anyone in the org (owner, admin, auditor_readonly) can ask.
export async function GET(req: NextRequest) {
  try {
    const authToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!authToken) return NextResponse.json({ error: "Missing auth" }, { status: 401 });

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${authToken}` } } }
    );
    const { data: userData } = await userClient.auth.getUser(authToken);
    const user = userData?.user;
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Resolve which org the user belongs to (owned or member).
    const { data: ownedOrg } = await admin
      .from("organizations").select("id, owner_id").eq("owner_id", user.id).maybeSingle();

    let ownerId: string | null = null;
    if (ownedOrg) {
      ownerId = ownedOrg.owner_id;
    } else {
      const { data: member } = await admin
        .from("org_members").select("org_id").eq("user_id", user.id)
        .not("accepted_at", "is", null).maybeSingle();
      if (!member?.org_id) return NextResponse.json({ error: "No org" }, { status: 404 });
      const { data: org } = await admin
        .from("organizations").select("owner_id").eq("id", member.org_id).maybeSingle();
      ownerId = org?.owner_id ?? null;
    }
    if (!ownerId) return NextResponse.json({ error: "No owner" }, { status: 404 });

    const { data: ownerUser, error } = await admin.auth.admin.getUserById(ownerId);
    if (error || !ownerUser) return NextResponse.json({ error: "Owner lookup failed" }, { status: 500 });

    return NextResponse.json({ email: ownerUser.user.email ?? null });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
