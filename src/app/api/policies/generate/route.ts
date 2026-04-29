import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { POLICY_TEMPLATES, type PolicyAnswers } from "@/lib/policy-templates";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req, "policies-gen"), { max: 5, windowMs: 300_000 });
  if (!rl.ok) return NextResponse.json({ error: "Rate limit exceeded. Try again in 5 minutes." }, { status: 429 });

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
    type: "policy",          // documents_type_check only allows: policy, gap_analysis, evidence_runbook, remediation_plan
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
