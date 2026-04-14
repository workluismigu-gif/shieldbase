"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useOrg } from "@/lib/org-context";
import { supabase } from "@/lib/supabase";
import { ShieldCheck, KeyRound, UserMinus, Plus, Calendar } from "lucide-react";
import { formatDateOnly } from "@/lib/dates";

type ReviewType = "quarterly_access" | "privileged_access" | "termination";

interface Review {
  id: string;
  review_type: ReviewType;
  period_label: string | null;
  reviewed_at: string;
  reviewer_email: string | null;
  scope: string | null;
  accounts_reviewed: number | null;
  accounts_revoked: number | null;
  notes: string | null;
  evidence_url: string | null;
  terminated_user: string | null;
  termination_date: string | null;
  access_revoked_by_email: string | null;
  access_revoked_at: string | null;
  created_at: string;
}

const TYPE_META: Record<ReviewType, { label: string; Icon: typeof ShieldCheck; description: string }> = {
  quarterly_access: { label: "Quarterly access reviews", Icon: ShieldCheck, description: "Periodic review of who has access to which systems." },
  privileged_access: { label: "Privileged access reviews", Icon: KeyRound, description: "Audit of admin / root / production credentials." },
  termination: { label: "Termination access removal", Icon: UserMinus, description: "Evidence access was revoked when employees left." },
};

export default function AccessReviewsPage() {
  const { org, canWrite, role } = useOrg();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [tab, setTab] = useState<ReviewType>("quarterly_access");
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    if (!org?.id) return;
    const { data } = await supabase
      .from("access_reviews").select("*")
      .eq("org_id", org.id)
      .order("reviewed_at", { ascending: false });
    setReviews((data as Review[]) ?? []);
  }, [org?.id]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => (reviews ?? []).filter(r => r.review_type === tab), [reviews, tab]);
  const meta = TYPE_META[tab];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-muted)] bg-[var(--color-surface-2)] px-2.5 py-1 rounded-md mb-3">
            <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.8} />
            Access Reviews
          </div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)] tracking-tight">Access reviews</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1.5 max-w-2xl">
            {role === "auditor_readonly"
              ? "Auditors sample these records to verify the client periodically reviews who has access to what — a core SOC 2 requirement (CC6.2, CC6.3)."
              : "Log periodic access reviews and access removals here. Auditors will sample these records during testing."}
          </p>
        </div>
        {canWrite && (
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-[var(--color-foreground)] text-[var(--color-surface)] hover:opacity-90 text-sm px-4 py-2 rounded-lg font-medium transition flex-shrink-0">
            <Plus className="w-4 h-4" strokeWidth={1.8} />
            Log review
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {(Object.keys(TYPE_META) as ReviewType[]).map(t => {
          const m = TYPE_META[t];
          const count = (reviews ?? []).filter(r => r.review_type === t).length;
          return (
            <button key={t} onClick={() => setTab(t)}
              className={`inline-flex items-center gap-2 text-sm px-3.5 py-2 rounded-lg transition border ${
                tab === t
                  ? "bg-[var(--color-foreground)] text-[var(--color-surface)] border-[var(--color-foreground)]"
                  : "bg-[var(--color-bg)] text-[var(--color-foreground-subtle)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
              }`}>
              <m.Icon className="w-4 h-4" strokeWidth={1.8} />
              {m.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${tab === t ? "bg-white/20" : "bg-[var(--color-surface-2)]"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="text-xs text-[var(--color-muted)]">{meta.description}</div>

      {reviews === null ? (
        <div className="text-sm text-[var(--color-muted)]">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-12 text-center">
          <meta.Icon className="w-10 h-10 text-[var(--color-muted)] mx-auto mb-3" strokeWidth={1.4} />
          <p className="text-sm text-[var(--color-muted)]">No records yet for {meta.label.toLowerCase()}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r.id} className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {r.period_label && (
                      <span className="text-xs font-semibold text-[var(--color-foreground)]">{r.period_label}</span>
                    )}
                    {r.terminated_user && (
                      <span className="text-xs font-semibold text-[var(--color-foreground)]">{r.terminated_user}</span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[10px] text-[var(--color-muted)]">
                      <Calendar className="w-3 h-3" strokeWidth={1.8} />
                      {formatDateOnly(r.reviewed_at)}
                    </span>
                    {r.reviewer_email && (
                      <span className="text-[10px] text-[var(--color-muted)]">by {r.reviewer_email}</span>
                    )}
                  </div>
                  {r.scope && <div className="text-sm text-[var(--color-foreground-subtle)]">{r.scope}</div>}
                  {r.notes && <div className="text-xs text-[var(--color-muted)] mt-1">{r.notes}</div>}
                  <div className="flex gap-3 text-xs text-[var(--color-muted)] mt-1.5">
                    {r.accounts_reviewed != null && <span>{r.accounts_reviewed} accounts reviewed</span>}
                    {r.accounts_revoked != null && <span>{r.accounts_revoked} revoked</span>}
                    {r.access_revoked_at && <span>Revoked {formatDateOnly(r.access_revoked_at.split("T")[0])}</span>}
                    {r.evidence_url && <a href={r.evidence_url} target="_blank" rel="noopener noreferrer" className="text-[var(--color-info)] hover:underline">Evidence link</a>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <LogReviewModal type={tab} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
      )}
    </div>
  );
}

function LogReviewModal({ type, onClose, onSaved }: {
  type: ReviewType;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({ reviewed_at: new Date().toISOString().slice(0, 10) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");
      const payload: Record<string, unknown> = { review_type: type, auth_token: session.session.access_token };
      for (const [k, v] of Object.entries(form)) {
        if (v === "" || v == null) continue;
        if (k === "accounts_reviewed" || k === "accounts_revoked") payload[k] = parseInt(v);
        else payload[k] = v;
      }
      const res = await fetch("/api/access-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form onClick={e => e.stopPropagation()} onSubmit={submit}
        className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 space-y-3">
        <h2 className="text-lg font-semibold text-[var(--color-foreground)] tracking-tight">Log {TYPE_META[type].label.toLowerCase()}</h2>

        {type === "termination" ? (
          <>
            <Field label="Terminated employee" value={form.terminated_user} onChange={v => setForm(f => ({ ...f, terminated_user: v }))} required />
            <Field label="Termination date" type="date" value={form.termination_date} onChange={v => setForm(f => ({ ...f, termination_date: v }))} />
            <Field label="Access revoked by (email)" value={form.access_revoked_by_email} onChange={v => setForm(f => ({ ...f, access_revoked_by_email: v }))} />
            <Field label="Access revoked at" type="date" value={form.access_revoked_at} onChange={v => setForm(f => ({ ...f, access_revoked_at: v }))} />
            <Field label="Reviewed at" type="date" value={form.reviewed_at} onChange={v => setForm(f => ({ ...f, reviewed_at: v }))} required />
          </>
        ) : (
          <>
            <Field label="Period label" value={form.period_label} onChange={v => setForm(f => ({ ...f, period_label: v }))} placeholder="Q3 2025" />
            <Field label="Reviewed at" type="date" value={form.reviewed_at} onChange={v => setForm(f => ({ ...f, reviewed_at: v }))} required />
            <Field label="Scope" value={form.scope} onChange={v => setForm(f => ({ ...f, scope: v }))} placeholder="AWS IAM users + Okta + GitHub org members" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Accounts reviewed" type="number" value={form.accounts_reviewed} onChange={v => setForm(f => ({ ...f, accounts_reviewed: v }))} />
              <Field label="Accounts revoked" type="number" value={form.accounts_revoked} onChange={v => setForm(f => ({ ...f, accounts_revoked: v }))} />
            </div>
          </>
        )}

        <Field label="Notes" type="textarea" value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} />
        <Field label="Evidence link (optional)" type="url" value={form.evidence_url} onChange={v => setForm(f => ({ ...f, evidence_url: v }))} placeholder="https://..." />

        {error && <div className="text-sm text-[var(--color-danger)]">{error}</div>}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 border border-[var(--color-border-strong)] text-[var(--color-foreground-subtle)] py-2.5 rounded-lg font-medium text-sm hover:bg-[var(--color-surface-2)]">
            Cancel
          </button>
          <button type="submit" disabled={busy}
            className="flex-1 bg-[var(--color-foreground)] text-[var(--color-surface)] hover:opacity-90 disabled:opacity-50 py-2.5 rounded-lg font-semibold text-sm">
            {busy ? "Saving…" : "Log review"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, required }: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">{label}{required && <span className="text-[var(--color-danger)]"> *</span>}</label>
      {type === "textarea" ? (
        <textarea value={value ?? ""} onChange={e => onChange(e.target.value)} rows={2} placeholder={placeholder}
          className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-border-strong)]" />
      ) : (
        <input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
          className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-border-strong)]" />
      )}
    </div>
  );
}
