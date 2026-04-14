import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const controlKey = form.get("control_key") as string | null;
    const category = (form.get("category") as string | null) ?? "general";
    const notes = (form.get("notes") as string | null) ?? "";
    const authToken = form.get("auth_token") as string | null;

    if (!file || !controlKey || !authToken) {
      return NextResponse.json({ error: "Missing file, control_key, or auth_token" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds 50MB limit" }, { status: 413 });
    }

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${authToken}` } } }
    );
    const { data: userData } = await userClient.auth.getUser(authToken);
    const userId = userData?.user?.id;
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { data: org } = await userClient
      .from("organizations")
      .select("id")
      .eq("owner_id", userId)
      .single();
    if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${org.id}/${controlKey.replace(/[^a-zA-Z0-9_-]/g, "_")}/${Date.now()}_${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadErr } = await admin.storage
      .from("control-evidence")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadErr) {
      console.error("Storage upload failed:", uploadErr);
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    const { data: evidenceRow, error: dbErr } = await admin
      .from("control_evidence")
      .insert({
        org_id: org.id,
        control_id: controlKey,
        evidence_type: "upload",
        evidence_data: {
          storage_path: storagePath,
          file_name: file.name,
          mime_type: file.type,
          size: file.size,
          category,
          notes,
          uploaded_by: userId,
        },
      })
      .select("id, collected_at")
      .single();

    if (dbErr) {
      console.error("DB insert failed:", dbErr);
      await admin.storage.from("control-evidence").remove([storagePath]);
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      evidence_id: evidenceRow.id,
      storage_path: storagePath,
      collected_at: evidenceRow.collected_at,
    });
  } catch (err: unknown) {
    console.error("Evidence upload error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
