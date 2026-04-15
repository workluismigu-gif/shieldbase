import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function userClient(authToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${authToken}` } } },
  );
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const authToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!authToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const supabase = userClient(authToken);

  const { data, error } = await supabase.from("findings").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: events } = await supabase
    .from("finding_events")
    .select("*")
    .eq("finding_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ finding: data, events: events ?? [] });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const authToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!authToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const supabase = userClient(authToken);

  const body = await req.json();
  const allowed: (keyof typeof body)[] = [
    "title", "description", "severity", "disposition", "status",
    "management_response", "remediation_owner_email", "remediation_target_date",
    "auditor_conclusion", "resolved_at",
  ];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) updates[k as string] = body[k];

  // Fetch prior for change-log events
  const { data: prior } = await supabase.from("findings").select("status, disposition, management_response, org_id").eq("id", id).maybeSingle();
  if (!prior) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Auto-set resolved_at
  if (updates.status === "resolved" && prior.status !== "resolved") {
    updates.resolved_at = new Date().toISOString();
  } else if (updates.status && updates.status !== "resolved" && prior.status === "resolved") {
    updates.resolved_at = null;
  }

  const { data: updated, error } = await supabase
    .from("findings")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: userData } = await supabase.auth.getUser(authToken);
  const userId = userData?.user?.id ?? null;
  const userEmail = userData?.user?.email ?? null;

  const events: Array<{ event_type: string; from_value?: string; to_value?: string; body?: string }> = [];
  if (updates.status && updates.status !== prior.status) {
    events.push({ event_type: "status_change", from_value: prior.status, to_value: String(updates.status) });
  }
  if (updates.disposition && updates.disposition !== prior.disposition) {
    events.push({ event_type: "disposition_change", from_value: prior.disposition, to_value: String(updates.disposition) });
  }
  if (updates.management_response && updates.management_response !== prior.management_response) {
    events.push({ event_type: "management_response", body: String(updates.management_response) });
  }

  if (events.length > 0) {
    await supabase.from("finding_events").insert(events.map(e => ({
      finding_id: id,
      org_id: prior.org_id,
      author_id: userId,
      author_email: userEmail,
      ...e,
    })));
  }

  return NextResponse.json({ finding: updated });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const authToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!authToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const supabase = userClient(authToken);

  const { error } = await supabase.from("findings").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
