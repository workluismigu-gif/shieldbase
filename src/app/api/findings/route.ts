import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function userClient(authToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${authToken}` } } },
  );
}

export async function GET(req: NextRequest) {
  const authToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!authToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = userClient(authToken);
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "Missing org_id" }, { status: 400 });

  let query = supabase
    .from("findings")
    .select("id, control_id, title, description, severity, disposition, status, management_response, remediation_owner_email, remediation_target_date, auditor_conclusion, created_at, updated_at, resolved_at, created_by")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  const status = searchParams.get("status");
  if (status) query = query.eq("status", status);
  const severity = searchParams.get("severity");
  if (severity) query = query.eq("severity", severity);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ findings: data ?? [] });
}

export async function POST(req: NextRequest) {
  const authToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!authToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = userClient(authToken);
  const body = await req.json();
  const { org_id, control_id, title, description, severity, disposition, scan_result_id } = body ?? {};
  if (!org_id || !title) return NextResponse.json({ error: "Missing org_id or title" }, { status: 400 });

  const { data: userData } = await supabase.auth.getUser(authToken);
  const userId = userData?.user?.id ?? null;

  const { data, error } = await supabase
    .from("findings")
    .insert({
      org_id,
      control_id: control_id ?? null,
      title,
      description: description ?? null,
      severity: severity ?? "medium",
      disposition: disposition ?? "observation",
      scan_result_id: scan_result_id ?? null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ finding: data });
}
