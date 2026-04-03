/**
 * Evidence collector for SOC 2 compliance
 * Captures raw API responses and config snapshots as audit evidence
 */

import { createClient } from "@supabase/supabase-js";

export interface EvidenceRecord {
  org_id: string;
  control_id: string;
  scan_id?: string;
  evidence_type: "api_response" | "config_snapshot" | "log_excerpt";
  evidence_data: Record<string, unknown>;
  collected_at: string;
}

/**
 * Collect evidence for a passing control by capturing the relevant API response
 */
export async function collectControlEvidence(
  supabase: ReturnType<typeof createClient>,
  evidence: EvidenceRecord
): Promise<string | null> {
  try {
    // Type assertion needed since control_evidence table may not exist in generated types yet
    const result = await (supabase.from("control_evidence") as unknown as {
      insert: (data: Omit<EvidenceRecord, "collected_at"> & { collected_at?: string }) => {
        select: (cols: string) => { single: () => Promise<{ data: { id: string } | null; error: unknown }> }
      }
    }).insert({
      org_id: evidence.org_id,
      control_id: evidence.control_id,
      scan_id: evidence.scan_id,
      evidence_type: evidence.evidence_type,
      evidence_data: evidence.evidence_data,
      collected_at: evidence.collected_at,
    }).select("id").single();

    const { data, error } = result;
    if (error || !data) {
      console.warn("Evidence insert warning:", error);
      return null;
    }

    // Update control's latest_evidence_id reference
    await (supabase.from("controls") as unknown as {
      update: (data: { latest_evidence_id: string }) => {
        eq: (col: string, val: string) => { eq: (col: string, val: string) => Promise<void> }
      }
    }).update({ latest_evidence_id: data.id }).eq("org_id", evidence.org_id).eq("control_id", evidence.control_id);

    return data.id;
  } catch (err) {
    console.error("Evidence collection error:", err);
    return null;
  }
}

/**
 * Build evidence package for a specific control — returns all evidence records
 */
export async function getControlEvidence(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  controlId: string,
  limit = 10
): Promise<EvidenceRecord[]> {
  const { data } = await supabase
    .from("control_evidence")
    .select("*")
    .eq("org_id", orgId)
    .eq("control_id", controlId)
    .order("collected_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as EvidenceRecord[];
}

/**
 * Generate an auditor-ready evidence summary for a control
 */
export function generateEvidenceSummary(
  controlId: string,
  controlTitle: string,
  evidence: EvidenceRecord[]
): string {
  if (evidence.length === 0) {
    return `No evidence collected for ${controlId}: ${controlTitle}`;
  }

  const latest = evidence[0];
  return [
    `=== SOC 2 Control Evidence: ${controlId} ===`,
    `Control: ${controlTitle}`,
    `Evidence collected: ${latest.collected_at}`,
    `Total records: ${evidence.length}`,
    ``,
    `Latest Evidence (${latest.evidence_type}):`,
    JSON.stringify(latest.evidence_data, null, 2),
  ].join("\n");
}
