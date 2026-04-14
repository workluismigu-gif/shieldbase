import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Action = "create" | "respond" | "review" | "delete";

interface Body {
  action: Action;
  auth_token: string;
  // create
  title?: string;
  description?: string;
  control_id?: string | null;
  due_date?: string | null;
  // respond
  request_id?: string;
  response_notes?: string;
  response_url?: string;
  response_storage_path?: string;
  // review
  decision?: "accepted" | "rejected";
  rejection_reason?: string;
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getMembership(authToken: string) {
  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${authToken}` } } }
  );
  const { data: userData } = await userClient.auth.getUser(authToken);
  const user = userData?.user;
  if (!user) return null;

  // Owner?
  const { data: ownedOrg } = await admin()
    .from("organizations")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (ownedOrg) return { user, org_id: ownedOrg.id, role: "owner" as const };

  // Member?
  const { data: member } = await admin()
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .not("accepted_at", "is", null)
    .maybeSingle();
  if (!member?.org_id) return null;
  return { user, org_id: member.org_id, role: member.role as "admin" | "auditor_readonly" };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    if (!body.action || !body.auth_token) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }
    const ctx = await getMembership(body.auth_token);
    if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const db = admin();

    if (body.action === "create") {
      // Strict separation: only the external auditor creates PBC requests.
      // The point of PBC is the auditor formally asking the client for
      // evidence; an owner asking themselves defeats the trail.
      if (ctx.role !== "auditor_readonly") {
        return NextResponse.json({ error: "Only the auditor can create PBC requests" }, { status: 403 });
      }
      if (!body.title) return NextResponse.json({ error: "title required" }, { status: 400 });
      const { data, error } = await db
        .from("pbc_requests")
        .insert({
          org_id: ctx.org_id,
          title: body.title,
          description: body.description ?? null,
          control_id: body.control_id ?? null,
          due_date: body.due_date ?? null,
          requested_by: ctx.user.id,
        })
        .select("id")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await db.from("activity_events").insert({
        org_id: ctx.org_id,
        type: "control_change",
        title: `PBC request created: ${body.title}`,
        detail: `${ctx.user.email} (${ctx.role})${body.control_id ? ` • control ${body.control_id}` : ""}`,
      });
      return NextResponse.json({ ok: true, id: data.id });
    }

    if (body.action === "respond") {
      // Only owner/admin can provide evidence.
      if (ctx.role === "auditor_readonly") {
        return NextResponse.json({ error: "Auditors cannot respond to their own requests" }, { status: 403 });
      }
      if (!body.request_id) return NextResponse.json({ error: "request_id required" }, { status: 400 });

      const { error } = await db
        .from("pbc_requests")
        .update({
          status: "provided",
          response_notes: body.response_notes ?? null,
          response_url: body.response_url ?? null,
          response_storage_path: body.response_storage_path ?? null,
          provided_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.request_id)
        .eq("org_id", ctx.org_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await db.from("activity_events").insert({
        org_id: ctx.org_id,
        type: "control_change",
        title: `PBC response submitted`,
        detail: `${ctx.user.email} provided evidence for request ${body.request_id}`,
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "review") {
      // Only the auditor can accept or reject — segregation of duties.
      if (ctx.role !== "auditor_readonly") {
        return NextResponse.json({ error: "Only the auditor can review responses" }, { status: 403 });
      }
      if (!body.request_id || !body.decision) {
        return NextResponse.json({ error: "request_id and decision required" }, { status: 400 });
      }
      if (!["accepted", "rejected"].includes(body.decision)) {
        return NextResponse.json({ error: "decision must be accepted or rejected" }, { status: 400 });
      }
      const { error } = await db
        .from("pbc_requests")
        .update({
          status: body.decision,
          rejection_reason: body.decision === "rejected" ? body.rejection_reason ?? null : null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: ctx.user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.request_id)
        .eq("org_id", ctx.org_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await db.from("activity_events").insert({
        org_id: ctx.org_id,
        type: "control_change",
        title: `PBC request ${body.decision}`,
        detail: `${ctx.user.email} (${ctx.role})${body.decision === "rejected" && body.rejection_reason ? ` • ${body.rejection_reason}` : ""}`,
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "delete") {
      // Owners or the original requester can delete.
      if (!body.request_id) return NextResponse.json({ error: "request_id required" }, { status: 400 });
      const { data: existing } = await db
        .from("pbc_requests")
        .select("requested_by")
        .eq("id", body.request_id)
        .eq("org_id", ctx.org_id)
        .maybeSingle();
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (ctx.role !== "owner" && existing.requested_by !== ctx.user.id) {
        return NextResponse.json({ error: "Only the requester or owner can delete" }, { status: 403 });
      }
      const { error } = await db.from("pbc_requests").delete().eq("id", body.request_id).eq("org_id", ctx.org_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
