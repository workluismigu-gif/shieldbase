import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { POLICY_TEMPLATES, type PolicyAnswers } from "@/lib/policy-templates";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { org_id, answers } = body as { org_id: string; answers: PolicyAnswers };
  if (!org_id || !answers?.company_name) {
    return NextResponse.json({ error: "org_id and answers.company_name required" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const rows = POLICY_TEMPLATES.map(t => ({
    org_id,
    type: t.type,
    title: t.title,
    content: t.generate(answers),
    status: "draft",
  }));

  const { error, count } = await supabase
    .from("documents")
    .insert(rows, { count: "exact" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, generated: count ?? rows.length });
}
