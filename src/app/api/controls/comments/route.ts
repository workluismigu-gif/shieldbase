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
    .from("organizations")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (ownedOrg) return { user, org_id: ownedOrg.id, role: "owner" as const };

  const { data: member } = await admin()
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .not("accepted_at", "is", null)
    .maybeSingle();
  if (!member?.org_id) return null;
  return { user, org_id: member.org_id, role: member.role as "admin" | "auditor_readonly" };
}

// POST: add a comment. Any role in the org can comment.
export async function POST(req: NextRequest) {
  try {
    const { control_id, body, auth_token } = await req.json();
    if (!control_id || !body?.trim() || !auth_token) {
      return NextResponse.json({ error: "control_id, body, auth_token required" }, { status: 400 });
    }
    const ctx = await getMembership(auth_token);
    if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const db = admin();
    const { data, error } = await db
      .from("control_comments")
      .insert({ org_id: ctx.org_id, control_id, user_id: ctx.user.id, body: body.trim() })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

// DELETE: only the comment author can delete their own comment.
export async function DELETE(req: NextRequest) {
  try {
    const { comment_id, auth_token } = await req.json();
    if (!comment_id || !auth_token) {
      return NextResponse.json({ error: "comment_id and auth_token required" }, { status: 400 });
    }
    const ctx = await getMembership(auth_token);
    if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const db = admin();
    const { data: comment } = await db
      .from("control_comments")
      .select("user_id, org_id")
      .eq("id", comment_id)
      .maybeSingle();
    if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (comment.org_id !== ctx.org_id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (comment.user_id !== ctx.user.id && ctx.role !== "owner") {
      return NextResponse.json({ error: "Only the author or owner can delete" }, { status: 403 });
    }

    const { error } = await db.from("control_comments").delete().eq("id", comment_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
