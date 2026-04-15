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
  const url = new URL(req.url);
  const orgId = url.searchParams.get("org_id");
  const controlId = url.searchParams.get("control_id");
  if (!orgId) return NextResponse.json({ error: "Missing org_id" }, { status: 400 });

  const s = userClient(token);
  let q = s.from("test_instances")
    .select("id, control_id, period_start, period_end, tested_by_email, tested_at, test_procedure, sample_ids, sample_rationale, conclusion, status")
    .eq("org_id", orgId)
    .order("tested_at", { ascending: false });
  if (controlId) q = q.eq("control_id", controlId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ instances: data ?? [] });
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { org_id, control_id, period_start, period_end, test_procedure, sample_ids, sample_rationale, conclusion, test_attributes } = body ?? {};
  if (!org_id || !control_id) return NextResponse.json({ error: "org_id and control_id required" }, { status: 400 });

  const s = userClient(token);
  const { data: u } = await s.auth.getUser(token);
  const userId = u?.user?.id ?? null;
  const userEmail = u?.user?.email ?? null;

  const { data, error } = await s.from("test_instances").insert({
    org_id, control_id,
    period_start: period_start || null,
    period_end: period_end || null,
    tested_by: userId,
    tested_by_email: userEmail,
    test_procedure: test_procedure || null,
    sample_ids: sample_ids || null,
    sample_rationale: sample_rationale || null,
    conclusion: conclusion || null,
    test_attributes: test_attributes ?? null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ instance: data });
}
