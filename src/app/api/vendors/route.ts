import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getMembership(authToken: string) {
  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${authToken}` } } }
  );
  const { data: userData } = await userClient.auth.getUser(authToken);
  const user = userData?.user;
  if (!user) return null;
  const { data: ownedOrg } = await admin()
    .from("organizations").select("id").eq("owner_id", user.id).maybeSingle();
  if (ownedOrg) return { user, org_id: ownedOrg.id, role: "owner" as const };
  const { data: member } = await admin()
    .from("org_members").select("org_id, role").eq("user_id", user.id)
    .not("accepted_at", "is", null).maybeSingle();
  if (!member?.org_id) return null;
  return { user, org_id: member.org_id, role: member.role as "admin" | "auditor_readonly" };
}

const FIELDS = [
  "name", "category", "criticality", "data_access",
  "soc2_on_file", "soc2_expires_at", "soc2_url", "soc2_storage_path",
  "last_reassessed_at", "next_reassessment_due",
  "notes", "contact_email", "status",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { auth_token, action, vendor_id, ...rest } = body;
    if (!auth_token) return NextResponse.json({ error: "auth_token required" }, { status: 400 });
    const ctx = await getMembership(auth_token);
    if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    if (ctx.role === "auditor_readonly") {
      return NextResponse.json({ error: "Auditors view; client maintains the register" }, { status: 403 });
    }

    const db = admin();
    const payload: Record<string, unknown> = {};
    for (const k of FIELDS) if (k in rest) payload[k] = rest[k];

    if (action === "delete") {
      if (!vendor_id) return NextResponse.json({ error: "vendor_id required" }, { status: 400 });
      const { error } = await db.from("vendors").delete().eq("id", vendor_id).eq("org_id", ctx.org_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (vendor_id) {
      payload.updated_at = new Date().toISOString();
      const { error } = await db.from("vendors").update(payload).eq("id", vendor_id).eq("org_id", ctx.org_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (!payload.name) return NextResponse.json({ error: "name required" }, { status: 400 });
    payload.org_id = ctx.org_id;
    const { data, error } = await db.from("vendors").insert(payload).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await db.from("activity_events").insert({
      org_id: ctx.org_id,
      type: "control_change",
      title: `Vendor added: ${payload.name}`,
      detail: `${ctx.user.email} • ${payload.criticality ?? "medium"} criticality`,
    });

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
