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

// POST: create an access review record. Owner/admin only — auditors verify, they don't perform.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { auth_token, ...record } = body;
    if (!auth_token) return NextResponse.json({ error: "auth_token required" }, { status: 400 });

    const ctx = await getMembership(auth_token);
    if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    if (ctx.role === "auditor_readonly") {
      return NextResponse.json({ error: "Auditors view; the client performs the review" }, { status: 403 });
    }

    const allowed = [
      "review_type", "period_label", "reviewed_at", "scope",
      "accounts_reviewed", "accounts_revoked", "notes", "evidence_url",
      "evidence_storage_path",
      "terminated_user", "termination_date", "access_revoked_by_email", "access_revoked_at",
    ];
    const insert: Record<string, unknown> = { org_id: ctx.org_id, reviewed_by: ctx.user.id, reviewer_email: ctx.user.email };
    for (const k of allowed) if (k in record) insert[k] = record[k];

    if (!insert.review_type) return NextResponse.json({ error: "review_type required" }, { status: 400 });

    const db = admin();
    const { data, error } = await db.from("access_reviews").insert(insert).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await db.from("activity_events").insert({
      org_id: ctx.org_id,
      type: "control_change",
      title: `Access review logged: ${insert.review_type}`,
      detail: `${ctx.user.email}${insert.scope ? ` • ${insert.scope}` : ""}${insert.accounts_reviewed != null ? ` • ${insert.accounts_reviewed} accounts` : ""}`,
    });

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
