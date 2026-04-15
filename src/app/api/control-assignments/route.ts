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
  const { data, error } = await s
    .from("control_assignments")
    .select("id, control_id, assigned_to, assigned_at")
    .eq("org_id", orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignments: data ?? [] });
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { org_id, control_id, assigned_to } = body ?? {};
  if (!org_id || !control_id || !assigned_to) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const s = userClient(token);
  const { data: userData } = await s.auth.getUser(token);
  const userId = userData?.user?.id ?? null;

  const { data, error } = await s
    .from("control_assignments")
    .insert({ org_id, control_id, assigned_to, assigned_by: userId })
    .select()
    .single();
  if (error) {
    if (error.message.includes("duplicate")) return NextResponse.json({ ok: true, duplicate: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ assignment: data });
}

export async function DELETE(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { id } = body ?? {};
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const s = userClient(token);
  const { error } = await s.from("control_assignments").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
