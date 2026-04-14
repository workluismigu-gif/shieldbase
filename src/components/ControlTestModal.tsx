"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface Props {
  controlId: string;
  controlTitle: string;
  currentStatus: string;
  onClose: () => void;
  onSaved?: () => void;
}

export default function ControlTestModal({ controlId, controlTitle, currentStatus, onClose, onSaved }: Props) {
  const [notes, setNotes] = useState("");
  const [overrideStatus, setOverrideStatus] = useState("");
  const [approve, setApprove] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) throw new Error("Not logged in");

      const res = await fetch("/api/controls/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          control_id: controlId,
          test_notes: notes || null,
          approve,
          override_status: overrideStatus || null,
          auth_token: sessionData.session.access_token,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--color-bg)] rounded-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[var(--color-foreground)]">Test & sign off</h2>
          <p className="text-xs text-[var(--color-muted)] mt-1">
            <span className="font-mono bg-[var(--color-surface-2)] px-1.5 py-0.5 rounded">{controlId}</span> — {controlTitle}
          </p>
          <p className="text-xs text-[var(--color-muted)] mt-1">Current status: <span className="font-medium">{currentStatus.replace("_", " ")}</span></p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--color-foreground-subtle)] mb-1 block">Test notes (tester, date, method, result)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5}
              placeholder="e.g. Tested on 2026-04-14 by Luis. Inspected CloudTrail trail config via AWS Console. Verified log file validation and multi-region capture are enabled. Evidence: CloudTrail-config-screenshot.png uploaded."
              className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--color-foreground-subtle)] mb-1 block">Override status (optional)</label>
            <select value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value)}
              className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-2 text-sm">
              <option value="">Keep current</option>
              <option value="compliant">Compliant</option>
              <option value="partial">Partial</option>
              <option value="non_compliant">Non-compliant</option>
              <option value="not_assessed">Not assessed</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-[var(--color-foreground-subtle)]">
            <input type="checkbox" checked={approve} onChange={(e) => setApprove(e.target.checked)} />
            Sign off as auditor — approve this control
          </label>

          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 border border-[var(--color-border-strong)] text-[var(--color-foreground-subtle)] py-2.5 rounded-lg font-medium text-sm hover:bg-[var(--color-surface)]">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-blue-600 hover:opacity-90 disabled:opacity-50 text-white py-2.5 rounded-lg font-semibold text-sm">
              {saving ? "Saving…" : "Save test record"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
