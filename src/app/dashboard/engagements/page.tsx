"use client";
import { useEffect, useState } from "react";
import { useOrg } from "@/lib/org-context";
import { supabase } from "@/lib/supabase";
import { Briefcase, Plus, Calendar, ArrowRight, Copy } from "lucide-react";

interface Engagement {
  id: string;
  name: string;
  period_start: string | null;
  period_end: string | null;
  framework: string;
  status: "planning" | "fieldwork" | "review" | "issued" | "closed";
  prior_engagement_id: string | null;
  lead_auditor_email: string | null;
  report_issued_at: string | null;
  created_at: string;
}

const STATUS_STYLES: Record<Engagement["status"], string> = {
  planning:  "bg-[var(--color-info-bg)] text-[var(--color-info)]",
  fieldwork: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
  review:    "bg-purple-50 text-purple-700",
  issued:    "bg-[var(--color-success-bg)] text-[var(--color-success)]",
  closed:    "bg-[var(--color-surface-2)] text-[var(--color-muted)]",
};

export default function EngagementsPage() {
  const { org, role } = useOrg();
  const canEdit = role === "owner" || role === "admin" || role === "auditor_readonly";
  const [items, setItems] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [preselectedPriorId, setPreselectedPriorId] = useState<string>("");

  const load = async () => {
    if (!org?.id) return;
    setLoading(true);
    const { data: s } = await supabase.auth.getSession();
    const token = s?.session?.access_token;
    if (!token) { setLoading(false); return; }
    const res = await fetch(`/api/engagements?org_id=${org.id}`, { headers: { Authorization: `Bearer ${token}` } });
    const j = await res.json();
    setItems(j.engagements ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [org?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)] flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-[var(--color-foreground-subtle)]" strokeWidth={1.8} /> Engagements
          </h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">Each annual audit is its own engagement. Clone from the prior year to pull forward scope, procedures, and sampling.</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 bg-[var(--color-foreground)] text-[var(--color-surface)] hover:opacity-90 text-sm px-4 py-2 rounded-lg font-medium">
            <Plus className="w-4 h-4" /> New engagement
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--color-muted)] text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-12 text-center">
          <Briefcase className="w-10 h-10 text-[var(--color-muted)] mx-auto mb-3" strokeWidth={1.4} />
          <p className="text-[var(--color-foreground-subtle)] font-medium mb-1">No engagements yet</p>
          <p className="text-sm text-[var(--color-muted)]">Create one to kick off this year&apos;s SOC 2 audit.</p>
        </div>
      ) : (
        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
          {items.map((e, i) => (
            <div key={e.id} className={`px-5 py-4 ${i < items.length - 1 ? "border-b border-[var(--color-border)]" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                {canEdit && (e.status === "issued" || e.status === "closed") && (
                  <button onClick={() => { setPreselectedPriorId(e.id); setShowCreate(true); }}
                    title="Start next year's engagement carrying this one's scope and procedures forward"
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-2)] self-start flex-shrink-0">
                    <Copy className="w-3.5 h-3.5" /> Carry forward
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-[var(--color-foreground)]">{e.name}</span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${STATUS_STYLES[e.status]}`}>{e.status}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-foreground-subtle)]">{e.framework.replace("_"," ").toUpperCase()}</span>
                    {e.prior_engagement_id && (
                      <span className="text-[10px] text-[var(--color-muted)] inline-flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" /> Carried forward
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[var(--color-muted)]">
                    {(e.period_start || e.period_end) && (
                      <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />
                        {e.period_start ?? "?"} → {e.period_end ?? "?"}
                      </span>
                    )}
                    {e.lead_auditor_email && <span>Lead: {e.lead_auditor_email}</span>}
                    {e.report_issued_at && <span>Issued: {e.report_issued_at}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && org?.id && (
        <CreateEngagement orgId={org.id} priorList={items} preselectedPriorId={preselectedPriorId}
          onClose={() => { setShowCreate(false); setPreselectedPriorId(""); }}
          onCreated={() => { setShowCreate(false); setPreselectedPriorId(""); load(); }} />
      )}
    </div>
  );
}

function CreateEngagement({ orgId, priorList, preselectedPriorId, onClose, onCreated }: { orgId: string; priorList: Engagement[]; preselectedPriorId?: string; onClose: () => void; onCreated: () => void }) {
  const preselected = preselectedPriorId ? priorList.find(p => p.id === preselectedPriorId) : null;
  const nextYear = new Date().getFullYear();
  const [name, setName] = useState(preselected ? `SOC 2 Type II ${nextYear}` : `SOC 2 Type II ${nextYear}`);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [framework, setFramework] = useState(preselected?.framework ?? "soc2_type2");
  const [priorId, setPriorId] = useState(preselectedPriorId ?? "");
  const [clone, setClone] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setSaving(true); setErr("");
    const { data: s } = await supabase.auth.getSession();
    const token = s?.session?.access_token;
    if (!token) { setErr("Not signed in"); setSaving(false); return; }
    const res = await fetch("/api/engagements", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        org_id: orgId, name, period_start: periodStart || null, period_end: periodEnd || null,
        framework, prior_engagement_id: priorId || null, clone_procedures: clone,
      }),
    });
    const j = await res.json();
    setSaving(false);
    if (!res.ok) { setErr(j.error || "Failed"); return; }
    onCreated();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-6 max-w-lg w-full space-y-3" onClick={e => e.stopPropagation()}>
        <h2 className="font-semibold text-[var(--color-foreground)]">New engagement</h2>

        <div>
          <label className="text-xs font-medium text-[var(--color-foreground-subtle)] block mb-1">Name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-[var(--color-foreground-subtle)] block mb-1">Period start</label>
            <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--color-foreground-subtle)] block mb-1">Period end</label>
            <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--color-foreground-subtle)] block mb-1">Framework</label>
          <select value={framework} onChange={e => setFramework(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm">
            <option value="soc2_type1">SOC 2 Type I</option>
            <option value="soc2_type2">SOC 2 Type II</option>
            <option value="iso27001">ISO 27001</option>
            <option value="hipaa">HIPAA</option>
          </select>
        </div>
        {priorList.length > 0 && (
          <>
            <div>
              <label className="text-xs font-medium text-[var(--color-foreground-subtle)] block mb-1">Prior engagement (optional)</label>
              <select value={priorId} onChange={e => setPriorId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm">
                <option value="">— none —</option>
                {priorList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {priorId && (
              <label className="flex items-center gap-2 text-sm text-[var(--color-foreground-subtle)]">
                <input type="checkbox" checked={clone} onChange={e => setClone(e.target.checked)} />
                Carry forward test procedures and sampling rationale
              </label>
            )}
          </>
        )}
        {err && <div className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-bg)] px-3 py-2 rounded-lg">{err}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[var(--color-muted)]">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="bg-[var(--color-foreground)] text-[var(--color-surface)] hover:opacity-90 disabled:opacity-40 text-sm px-4 py-2 rounded-lg font-medium">
            {saving ? "Creating…" : "Create engagement"}
          </button>
        </div>
      </div>
    </div>
  );
}
