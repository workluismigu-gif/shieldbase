import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { deterministicSample } from "@/lib/sampling";

// POST /api/controls/sample/bulk
// body: { auth_token, scope: "all" | "failing", n, seed }
// Auditor-only. Clears existing in_sample flags for the scope, then deterministically
// selects n controls (using seed + FNV-1a + xorshift32) and flips them in_sample=true.
export async function POST(req: NextRequest) {
  try {
    const { auth_token, scope = "all", n, seed } = await req.json();
    if (!auth_token || !n || n < 1 || !seed) {
      return NextResponse.json({ error: "auth_token, n, seed required" }, { status: 400 });
    }

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${auth_token}` } } },
    );
    const { data: userData } = await userClient.auth.getUser(auth_token);
    const user = userData?.user;
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: ownedOrg } = await admin
      .from("organizations").select("id").eq("owner_id", user.id).maybeSingle();
    let orgId: string | null = ownedOrg?.id ?? null;
    let role: "owner" | "admin" | "auditor_readonly" = "owner";
    if (!orgId) {
      const { data: member } = await admin
        .from("org_members").select("org_id, role").eq("user_id", user.id)
        .not("accepted_at", "is", null).maybeSingle();
      if (!member?.org_id) return NextResponse.json({ error: "No org" }, { status: 404 });
      orgId = member.org_id;
      role = member.role as "admin" | "auditor_readonly";
    }
    // Owner (doing self-attestation) and lead auditor can both run selection.
    // Admins and staff cannot — sample selection is a judgment call.
    if (role !== "auditor_readonly" && role !== "owner") {
      return NextResponse.json({ error: "Only the owner or lead auditor can run sample selection" }, { status: 403 });
    }

    // Pull controls for scope
    let q = admin.from("controls").select("control_id, status").eq("org_id", orgId);
    if (scope === "failing") q = q.eq("status", "non_compliant");
    const { data: controls, error: listErr } = await q;
    if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });
    if (!controls || controls.length === 0) {
      return NextResponse.json({ ok: true, selected: [], total_population: 0 });
    }

    const ids = controls.map(c => c.control_id).sort();
    const picked = deterministicSample(ids, Math.min(n, ids.length), seed);

    // Clear + set
    await admin.from("controls").update({ in_sample: false }).eq("org_id", orgId);
    const { error: updErr } = await admin
      .from("controls")
      .update({ in_sample: true })
      .eq("org_id", orgId)
      .in("control_id", picked);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    // Persist seed on org for reproducibility
    await admin.from("organizations").update({ sample_seed: seed }).eq("id", orgId);

    await admin.from("activity_events").insert({
      org_id: orgId,
      type: "control_change",
      title: `Sample selected — n=${picked.length} / ${ids.length}`,
      detail: `${user.email} (auditor) · scope=${scope} · seed=${seed}`,
    });

    return NextResponse.json({ ok: true, selected: picked, total_population: ids.length });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
