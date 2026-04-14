import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { auth_token } = await req.json();
    if (!auth_token) return NextResponse.json({ error: "Missing auth_token" }, { status: 400 });

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${auth_token}` } } }
    );
    const { data: userData } = await userClient.auth.getUser(auth_token);
    const userId = userData?.user?.id;
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { data: org } = await userClient
      .from("organizations")
      .select("id")
      .eq("owner_id", userId)
      .single();
    if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

    const { data: evidence, error } = await userClient
      .from("control_evidence")
      .select("id, control_id, evidence_type, evidence_data, collected_at")
      .eq("org_id", org.id)
      .order("collected_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, evidence: evidence ?? [] });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
