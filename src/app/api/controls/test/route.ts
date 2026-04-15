import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { control_id, test_notes, approve, override_status, test_attributes, test_procedure, sample_ids, sample_rationale, auth_token } = await req.json();
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

    // Resolve org: owner first, then fall back to org_members for invited auditors/admins.
    let orgId: string | null = null;
    const { data: ownedOrg } = await userClient
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();
    if (ownedOrg) {
      orgId = ownedOrg.id;
    } else {
      const { data: membership } = await userClient
        .from("org_members")
        .select("org_id")
        .eq("user_id", user.id)
        .maybeSingle();
      orgId = membership?.org_id ?? null;
    }
    if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

    const update: Record<string, unknown> = {
      tested_by: user.id,
      tested_by_email: user.email ?? null,
      tested_at: new Date().toISOString(),
      test_notes: test_notes ?? null,
    };
    const allowedProcedures = ["inspection","observation","inquiry","reperformance","caat","other"] as const;
    if (test_procedure && (allowedProcedures as readonly string[]).includes(test_procedure)) {
      update.test_procedure = test_procedure;
    } else if (test_procedure === null) {
      update.test_procedure = null;
    }
    if (typeof sample_ids === "string") update.sample_ids = sample_ids.trim() || null;
    if (typeof sample_rationale === "string") update.sample_rationale = sample_rationale.trim() || null;
    if (test_attributes && typeof test_attributes === "object") {
      // Accept only the four known attribute keys with valid values.
      const allowed = ["pass", "fail", "na"] as const;
      const keys = ["complete", "accurate", "authorized", "timely"] as const;
      const sanitized: Record<string, string> = {};
      for (const k of keys) {
        const v = (test_attributes as Record<string, unknown>)[k];
        if (typeof v === "string" && (allowed as readonly string[]).includes(v)) sanitized[k] = v;
      }
      update.test_attributes = Object.keys(sanitized).length > 0 ? sanitized : null;
    }
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
      .eq("org_id", orgId)
      .eq("control_id", control_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Audit log
    await userClient.from("activity_events").insert({
      org_id: orgId,
      type: "control_change",
      title: approve ? `Control ${control_id} approved` : `Control ${control_id} tested`,
      detail: `${user.email} ${approve ? "approved" : "recorded test"}${override_status ? ` • status → ${override_status}` : ""}${test_notes ? ` • ${test_notes.slice(0, 120)}` : ""}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
