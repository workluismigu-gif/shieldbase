import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseProwlerOutput, generateSummary } from "@/lib/prowler-mapper";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { org_id, scan_data, auth_token } = body;

    if (!org_id || !scan_data) {
      return NextResponse.json({ error: "Missing org_id or scan_data" }, { status: 400 });
    }

    // Use service role key for server-side writes (falls back to anon for now)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      auth_token ? { global: { headers: { Authorization: `Bearer ${auth_token}` } } } : undefined
    );

    // Parse Prowler findings
    const controls = parseProwlerOutput(scan_data);
    const summary = generateSummary(controls);

    // Save raw scan result
    const { error: scanError } = await supabase.from("scan_results").insert({
      org_id,
      scanner: "prowler",
      scan_type: "aws",
      findings: scan_data,
      summary,
    });
    if (scanError) throw scanError;

    // Upsert controls
    const controlRows = controls.map(c => ({
      org_id,
      category: c.category,
      control_id: c.control_id,
      title: c.title,
      description: c.description,
      status: c.status,
      severity: c.severity,
      updated_at: new Date().toISOString(),
    }));

    if (controlRows.length > 0) {
      const { error: controlError } = await supabase
        .from("controls")
        .upsert(controlRows, { onConflict: "org_id,control_id" });
      if (controlError) console.warn("Control upsert warning:", controlError.message);
    }

    // Update org readiness score
    await supabase
      .from("organizations")
      .update({ readiness_score: summary.score })
      .eq("id", org_id);

    return NextResponse.json({ ok: true, summary, controls_mapped: controls.length });
  } catch (err: unknown) {
    console.error("Scan upload error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
