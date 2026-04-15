"use client";
import { useEffect, useState } from "react";
import { useOrg } from "@/lib/org-context";
import { supabase } from "@/lib/supabase";
import { FileSearch, Plus, Check, X as XIcon } from "lucide-react";

interface Ipe {
  id: string;
  report_name: string;
  source_system: string | null;
  query_or_source: string | null;
  completeness_tested: boolean;
  completeness_method: string | null;
  accuracy_tested: boolean;
  accuracy_method: string | null;
  tested_by_email: string | null;
  tested_at: string | null;
  notes: string | null;
  created_at: string;
}

export default function IpePage() {
  const { org, role } = useOrg();
  const canEdit = role === "owner" || role === "admin" || role === "auditor_readonly";
  const [items, setItems] = useState<Ipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    if (!org?.id) return;
    setLoading(true);
    const { data: s } = await supabase.auth.getSession();
    const token = s?.session?.access_token;
    if (!token) { setLoading(false); return; }
    const res = await fetch(`/api/ipe?org_id=${org.id}`, { headers: { Authorization: `Bearer ${token}` } });
    const j = await res.json();
    setItems(j.items ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [org?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)] flex items-center gap-2">
            <FileSearch className="w-6 h-6 text-[var(--color-foreground-subtle)]" strokeWidth={1.8} /> IPE Walkthroughs
          </h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">Information Produced by Entity — track reports you rely on as audit evidence, plus completeness and accuracy testing.</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-[var(--color-foreground)] text-[var(--color-surface)] hover:opacity-90 text-sm px-4 py-2 rounded-lg font-medium">
            <Plus className="w-4 h-4" /> New IPE
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--color-muted)] text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-12 text-center">
          <FileSearch className="w-10 h-10 text-[var(--color-muted)] mx-auto mb-3" strokeWidth={1.4} />
          <p className="text-[var(--color-foreground-subtle)] font-medium mb-1">No IPE reports logged</p>
          <p className="text-sm text-[var(--color-muted)]">Each client-produced report you test for completeness & accuracy should be recorded here.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map(ipe => (
            <div key={ipe.id} className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-5">
              <div className="font-semibold text-[var(--color-foreground)] mb-1">{ipe.report_name}</div>
              {ipe.source_system && <div className="text-xs text-[var(--color-muted)] mb-2">Source: {ipe.source_system}</div>}
              {ipe.query_or_source && <pre className="text-xs font-mono bg-[var(--color-surface-2)] rounded-lg p-2 mb-3 overflow-x-auto whitespace-pre-wrap">{ipe.query_or_source}</pre>}
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  {ipe.completeness_tested ? <Check className="w-4 h-4 text-[var(--color-success)]" /> : <XIcon className="w-4 h-4 text-[var(--color-danger)]" />}
                  <span className="text-[var(--color-foreground-subtle)]">Completeness tested</span>
                  {ipe.completeness_method && <span className="text-xs text-[var(--color-muted)]">— {ipe.completeness_method}</span>}
                </div>
                <div className="flex items-center gap-2">
                  {ipe.accuracy_tested ? <Check className="w-4 h-4 text-[var(--color-success)]" /> : <XIcon className="w-4 h-4 text-[var(--color-danger)]" />}
                  <span className="text-[var(--color-foreground-subtle)]">Accuracy tested</span>
                  {ipe.accuracy_method && <span className="text-xs text-[var(--color-muted)]">— {ipe.accuracy_method}</span>}
                </div>
              </div>
              {ipe.tested_by_email && <div className="text-xs text-[var(--color-muted)] mt-3">Tested by {ipe.tested_by_email} {ipe.tested_at && `· ${new Date(ipe.tested_at).toLocaleDateString()}`}</div>}
              {ipe.notes && <p className="text-xs text-[var(--color-foreground-subtle)] mt-2 whitespace-pre-wrap">{ipe.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {showForm && org?.id && <IpeForm orgId={org.id} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function IpeForm({ orgId, onClose, onSaved }: { orgId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    report_name: "", source_system: "", query_or_source: "",
    completeness_tested: false, completeness_method: "",
    accuracy_tested: false, accuracy_method: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!form.report_name.trim()) { setErr("Report name required"); return; }
    setSaving(true); setErr("");
    const { data: s } = await supabase.auth.getSession();
    const token = s?.session?.access_token;
    if (!token) { setErr("Not signed in"); setSaving(false); return; }
    const res = await fetch("/api/ipe", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ org_id: orgId, ...form }),
    });
    const j = await res.json();
    setSaving(false);
    if (!res.ok) { setErr(j.error || "Failed"); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-6 max-w-lg w-full space-y-3 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="font-semibold text-[var(--color-foreground)]">New IPE walkthrough</h2>

        <div>
          <label className="text-xs font-medium text-[var(--color-foreground-subtle)] block mb-1">Report name</label>
          <input value={form.report_name} onChange={e => setForm({ ...form, report_name: e.target.value })}
            placeholder="e.g. Terminated-user access removal report"
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--color-foreground-subtle)] block mb-1">Source system</label>
          <input value={form.source_system} onChange={e => setForm({ ...form, source_system: e.target.value })}
            placeholder="e.g. Workday, Okta, PostgreSQL"
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--color-foreground-subtle)] block mb-1">Query or source detail</label>
          <textarea value={form.query_or_source} onChange={e => setForm({ ...form, query_or_source: e.target.value })} rows={3}
            placeholder="SQL, report ID, dashboard URL — anything that lets a reviewer reproduce the report."
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-mono" />
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={form.completeness_tested} onChange={e => setForm({ ...form, completeness_tested: e.target.checked })} className="mt-1" />
          <span>
            <span className="font-medium text-[var(--color-foreground)]">Completeness tested</span>
            <span className="block text-xs text-[var(--color-muted)]">All in-scope records are included.</span>
          </span>
        </label>
        {form.completeness_tested && (
          <input value={form.completeness_method} onChange={e => setForm({ ...form, completeness_method: e.target.value })}
            placeholder="e.g. Re-ran query with same filter; record count matched."
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm" />
        )}

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={form.accuracy_tested} onChange={e => setForm({ ...form, accuracy_tested: e.target.checked })} className="mt-1" />
          <span>
            <span className="font-medium text-[var(--color-foreground)]">Accuracy tested</span>
            <span className="block text-xs text-[var(--color-muted)]">Values in the report match source.</span>
          </span>
        </label>
        {form.accuracy_tested && (
          <input value={form.accuracy_method} onChange={e => setForm({ ...form, accuracy_method: e.target.value })}
            placeholder="e.g. Spot-checked 5 rows against raw source — all matched."
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm" />
        )}

        <div>
          <label className="text-xs font-medium text-[var(--color-foreground-subtle)] block mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm" />
        </div>

        {err && <div className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-bg)] px-3 py-2 rounded-lg">{err}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[var(--color-muted)]">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="bg-[var(--color-foreground)] text-[var(--color-surface)] hover:opacity-90 disabled:opacity-40 text-sm px-4 py-2 rounded-lg font-medium">
            {saving ? "Saving…" : "Save walkthrough"}
          </button>
        </div>
      </div>
    </div>
  );
}
