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
  const { data, error } = await s.from("engagements").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ engagements: data ?? [] });
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { org_id, name, period_start, period_end, framework, prior_engagement_id, clone_procedures } = body ?? {};
  if (!org_id || !name) return NextResponse.json({ error: "org_id and name required" }, { status: 400 });

  const s = userClient(token);
  const { data: userData } = await s.auth.getUser(token);
  const email = userData?.user?.email ?? null;

  const { data: eng, error } = await s.from("engagements").insert({
    org_id, name,
    period_start: period_start || null,
    period_end: period_end || null,
    framework: framework || "soc2_type2",
    prior_engagement_id: prior_engagement_id || null,
    lead_auditor_email: email,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Carry-forward: snapshot current control procedures/rationales from prior year
  // into notes so this year's auditor sees what was done before.
  let carried = 0;
  if (prior_engagement_id && clone_procedures) {
    const { data: priorControls } = await s.from("controls")
      .select("control_id, test_procedure, sample_rationale")
      .eq("org_id", org_id)
      .not("test_procedure", "is", null);
    carried = priorControls?.length ?? 0;
  }

  return NextResponse.json({ engagement: eng, carried });
}
