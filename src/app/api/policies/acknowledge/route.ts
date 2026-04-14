import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { policy_key, policy_version = "v1", auth_token } = await req.json();
    if (!policy_key || !auth_token) {
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

    // Find org — user is owner or member
    const { data: ownerOrg } = await userClient
      .from("organizations").select("id").eq("owner_id", user.id).maybeSingle();
    const { data: memberOrg } = await userClient
      .from("org_members").select("org_id").eq("user_id", user.id).not("accepted_at", "is", null).maybeSingle();

    const orgId = ownerOrg?.id ?? memberOrg?.org_id;
    if (!orgId) return NextResponse.json({ error: "No org context" }, { status: 404 });

    const { error } = await userClient
      .from("policy_acknowledgements")
      .upsert({
        org_id: orgId,
        user_id: user.id,
        policy_key,
        policy_version,
        acknowledged_at: new Date().toISOString(),
      }, { onConflict: "org_id,user_id,policy_key,policy_version" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
