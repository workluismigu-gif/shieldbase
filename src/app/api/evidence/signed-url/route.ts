import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { storage_path, auth_token } = await req.json();
    if (!storage_path || !auth_token) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    // Verify user has access to org (storage_path = `${org_id}/...`)
    const orgId = storage_path.split("/")[0];

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${auth_token}` } } }
    );
    const { data: userData } = await userClient.auth.getUser(auth_token);
    const userId = userData?.user?.id;
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // Check org membership via RPC or direct lookup
    const { data: org } = await userClient
      .from("organizations")
      .select("id")
      .eq("id", orgId)
      .single();

    const { data: member } = await userClient
      .from("org_members")
      .select("id")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .not("accepted_at", "is", null)
      .maybeSingle();

    if (!org && !member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await admin.storage
      .from("control-evidence")
      .createSignedUrl(storage_path, 300); // 5 min

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Failed to sign URL" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url: data.signedUrl });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
