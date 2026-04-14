import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// POST /api/audit/milestone — log an engagement milestone (auditor-only).
export async function POST(req: NextRequest) {
  try {
    const { title, detail, timestamp, auth_token } = await req.json();
    if (!title || !auth_token) {
      return NextResponse.json({ error: "title and auth_token required" }, { status: 400 });
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

    // Resolve org + role.
    const { data: ownedOrg } = await admin
      .from("organizations").select("id").eq("owner_id", user.id).maybeSingle();
    let orgId: string | null = ownedOrg?.id ?? null;
    let role: "owner" | "admin" | "auditor_readonly" = "owner";
    if (!orgId) {
      const { data: member } = await admin
        .from("org_members").select("org_id, role").eq("user_id", user.id)
        .not("accepted_at", "is", null).maybeSingle();
      if (!member?.org_id) return NextResponse.json({ error: "No org" }, { status: 404 });
      orgId = member.org_id;
      role = member.role as "admin" | "auditor_readonly";
    }
    if (role !== "auditor_readonly") {
      return NextResponse.json({ error: "Only the auditor can record milestones" }, { status: 403 });
    }

    const ts = timestamp ?? new Date().toISOString();
    const { error } = await admin.from("activity_events").insert({
      org_id: orgId,
      type: "engagement_milestone",
      title,
      detail: detail ? `${detail} • ${user.email}` : user.email ?? null,
      timestamp: ts,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
