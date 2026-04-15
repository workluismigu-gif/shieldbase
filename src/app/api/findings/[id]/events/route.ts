import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function userClient(authToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${authToken}` } } },
  );
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const authToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!authToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const supabase = userClient(authToken);

  const { body, event_type } = await req.json();
  if (!body || !body.trim()) return NextResponse.json({ error: "Empty comment" }, { status: 400 });

  const { data: finding } = await supabase.from("findings").select("org_id").eq("id", id).maybeSingle();
  if (!finding) return NextResponse.json({ error: "Finding not found" }, { status: 404 });

  const { data: userData } = await supabase.auth.getUser(authToken);
  const userId = userData?.user?.id ?? null;
  const userEmail = userData?.user?.email ?? null;

  const { data, error } = await supabase
    .from("finding_events")
    .insert({
      finding_id: id,
      org_id: finding.org_id,
      event_type: event_type === "auditor_note" ? "auditor_note" : "comment",
      author_id: userId,
      author_email: userEmail,
      body: body.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data });
}
