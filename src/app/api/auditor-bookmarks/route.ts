import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function userClient(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
}

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = new URL(req.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "Missing org_id" }, { status: 400 });
  const s = userClient(token);
  const { data } = await s.from("auditor_bookmarks").select("*").eq("org_id", orgId).maybeSingle();
  return NextResponse.json({ bookmark: data ?? null });
}

export async function PUT(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { org_id, last_path, note } = await req.json();
  if (!org_id) return NextResponse.json({ error: "Missing org_id" }, { status: 400 });
  const s = userClient(token);
  const { data: u } = await s.auth.getUser(token);
  const userId = u?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { error } = await s.from("auditor_bookmarks").upsert({
    user_id: userId, org_id,
    last_path: last_path ?? null,
    note: note ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,org_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
