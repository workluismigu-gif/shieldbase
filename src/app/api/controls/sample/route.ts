import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// POST /api/controls/sample
// body: { control_id, in_sample, auth_token }
// Only auditor_readonly can change the sample.
export async function POST(req: NextRequest) {
  try {
    const { control_id, in_sample, auth_token } = await req.json();
    if (!control_id || typeof in_sample !== "boolean" || !auth_token) {
      return NextResponse.json({ error: "control_id, in_sample, auth_token required" }, { status: 400 });
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
      return NextResponse.json({ error: "Only the auditor can change the sample" }, { status: 403 });
    }

    const { error } = await admin
      .from("controls")
      .update({ in_sample })
      .eq("org_id", orgId)
      .eq("control_id", control_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await admin.from("activity_events").insert({
      org_id: orgId,
      type: "control_change",
      title: in_sample ? `Control ${control_id} added to sample` : `Control ${control_id} removed from sample`,
      detail: `${user.email} (auditor)`,
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
