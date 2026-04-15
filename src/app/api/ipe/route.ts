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
  const { data, error } = await s.from("ipe_walkthroughs").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { org_id } = body ?? {};
  if (!org_id || !body.report_name) return NextResponse.json({ error: "org_id and report_name required" }, { status: 400 });
  const s = userClient(token);
  const { data: u } = await s.auth.getUser(token);
  const email = u?.user?.email ?? null;
  const { data, error } = await s.from("ipe_walkthroughs").insert({
    org_id,
    report_name: body.report_name,
    source_system: body.source_system || null,
    query_or_source: body.query_or_source || null,
    completeness_tested: !!body.completeness_tested,
    completeness_method: body.completeness_method || null,
    accuracy_tested: !!body.accuracy_tested,
    accuracy_method: body.accuracy_method || null,
    tested_by_email: email,
    tested_at: body.completeness_tested || body.accuracy_tested ? new Date().toISOString() : null,
    notes: body.notes || null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}
