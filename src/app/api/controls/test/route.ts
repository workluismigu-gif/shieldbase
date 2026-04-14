import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { control_id, test_notes, approve, override_status, auth_token } = await req.json();
    if (!control_id || !auth_token) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${auth_token}` } } }
    );
    const { data: userData } = await userClient.auth.getUser(auth_token);
    const user = userData?.user;
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { data: org } = await userClient
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .single();
    if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

    const update: Record<string, unknown> = {
      tested_by: user.id,
      tested_at: new Date().toISOString(),
      test_notes: test_notes ?? null,
    };
    if (approve) {
      update.approved_by = user.id;
      update.approved_at = new Date().toISOString();
    }
    if (override_status && ["compliant", "partial", "non_compliant", "not_assessed"].includes(override_status)) {
      update.status = override_status;
    }

    const { error } = await userClient
      .from("controls")
      .update(update)
      .eq("org_id", org.id)
      .eq("control_id", control_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Audit log
    await userClient.from("activity_events").insert({
      org_id: org.id,
      type: "control_change",
      title: approve ? `Control ${control_id} approved` : `Control ${control_id} tested`,
      detail: `${user.email} ${approve ? "approved" : "recorded test"}${override_status ? ` • status → ${override_status}` : ""}${test_notes ? ` • ${test_notes.slice(0, 120)}` : ""}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
