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
  const s = userClient(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "");
  const { data, error } = await s
    .from("pbc_templates")
    .select("*")
    .order("display_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}

// POST { org_id, template_codes?: string[], due_date?: string }
// Creates pbc_requests rows. If template_codes omitted, creates all defaults.
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { org_id, template_codes, due_date } = await req.json();
  if (!org_id) return NextResponse.json({ error: "Missing org_id" }, { status: 400 });

  const s = userClient(token);
  const { data: u } = await s.auth.getUser(token);
  const userId = u?.user?.id ?? null;

  let tplQuery = s.from("pbc_templates").select("*");
  if (Array.isArray(template_codes) && template_codes.length > 0) {
    tplQuery = tplQuery.in("code", template_codes);
  } else {
    tplQuery = tplQuery.eq("is_default", true);
  }
  const { data: templates, error: tplErr } = await tplQuery;
  if (tplErr) return NextResponse.json({ error: tplErr.message }, { status: 500 });
  if (!templates || templates.length === 0) return NextResponse.json({ ok: true, created: 0 });

  const rows = templates.map(t => ({
    org_id,
    title: t.title,
    description: t.description,
    control_id: t.control_id,
    due_date: due_date || null,
    requested_by: userId,
    status: "pending",
  }));

  const { error: insErr, count } = await s
    .from("pbc_requests")
    .insert(rows, { count: "exact" });
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  return NextResponse.json({ ok: true, created: count ?? rows.length });
}
