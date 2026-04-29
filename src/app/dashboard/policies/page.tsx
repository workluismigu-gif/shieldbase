"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useOrg } from "@/lib/org-context";
import { FileText, Plus, Check, ClipboardList, Sparkles } from "lucide-react";
import { DEFAULT_ANSWERS, type PolicyAnswers } from "@/lib/policy-templates";

interface PolicyDoc {
  id: string;
  type: string;
  title: string;
  content: string | null;
  status: "draft" | "review" | "approved" | "needs_update";
  created_at: string;
  updated_at: string;
}

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  approved:     { label: "Approved",     cls: "bg-[var(--color-success-bg)] text-[var(--color-success)]" },
  review:       { label: "In Review",    cls: "bg-[var(--color-info-bg)] text-[var(--color-info)]" },
  draft:        { label: "Draft",        cls: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]" },
  needs_update: { label: "Needs Update", cls: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]" },
};

export default function PoliciesPage() {
  const { org, canWrite } = useOrg();
  const [docs, setDocs] = useState<PolicyDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<PolicyDoc | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  const load = useCallback(async () => {
    if (!org?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("documents")
      .select("id, type, title, content, status, created_at, updated_at")
      .eq("org_id", org.id)
      .order("updated_at", { ascending: false });
    setDocs((data ?? []) as PolicyDoc[]);
    setLoading(false);
  }, [org?.id]);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === "all" ? docs : docs.filter(d => d.status === filter);
  const counts = {
    all: docs.length,
    approved: docs.filter(d => d.status === "approved").length,
    draft: docs.filter(d => d.status === "draft").length,
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("documents").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  // Detail view
  if (selected) {
    const s = STATUS_STYLE[selected.status] ?? STATUS_STYLE.draft;
    return (
      <div className="space-y-4 max-w-4xl">
        <button onClick={() => { setSelected(null); load(); }} className="text-sm text-[var(--color-info)] hover:underline">
          ← Back to policies
        </button>
        <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
            <div>
              <h1 className="text-xl font-semibold text-[var(--color-foreground)]">{selected.title}</h1>
              <p className="text-xs text-[var(--color-muted)] mt-1">Updated {new Date(selected.updated_at).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.cls}`}>{s.label}</span>
              {canWrite && selected.status === "draft" && (
                <button onClick={() => updateStatus(selected.id, "approved")}
                  className="bg-[var(--color-foreground)] text-[var(--color-surface)] px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
                  Approve policy
                </button>
              )}
            </div>
          </div>
          <div className="p-6">
            <div className="prose prose-sm max-w-none text-[var(--color-foreground-subtle)] leading-relaxed whitespace-pre-wrap text-sm">
              {selected.content || "No content yet."}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Policies</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            {docs.length > 0
              ? `${counts.approved} approved, ${counts.draft} drafts. Click any policy to review and approve.`
              : "Generate your SOC 2 policy library in 2 minutes. Answer a few questions, we write the drafts."}
          </p>
        </div>
      </div>

      {/* Empty state / generate CTA */}
      {!loading && docs.length === 0 && (
        <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-12 text-center">
          <ClipboardList className="w-10 h-10 text-[var(--color-muted)] mx-auto mb-4" strokeWidth={1.4} />
          <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">No policies yet</h2>
          <p className="text-sm text-[var(--color-muted)] max-w-md mx-auto mb-6">
            SOC 2 requires documented policies. Answer 15 questions about your company and we'll generate 8 tailored policy drafts you can review and approve.
          </p>
          <button onClick={() => setShowWizard(true)}
            className="inline-flex items-center gap-2 bg-[var(--color-foreground)] text-[var(--color-surface)] px-6 py-3 rounded-lg text-sm font-medium hover:opacity-90">
            <Sparkles className="w-4 h-4" /> Generate my policies
          </button>
        </div>
      )}

      {/* Policy list */}
      {docs.length > 0 && (
        <>
          <div className="flex items-center gap-3">
            {(["all", "draft", "approved"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-sm px-3 py-1.5 rounded-lg transition ${filter === f ? "bg-[var(--color-foreground)] text-[var(--color-surface)]" : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"}`}>
                {f === "all" ? `All (${counts.all})` : f === "draft" ? `Drafts (${counts.draft})` : `Approved (${counts.approved})`}
              </button>
            ))}
            <div className="flex-1" />
            <button onClick={() => setShowWizard(true)}
              className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] border border-[var(--color-border)] px-3 py-1.5 rounded-lg">
              <Plus className="w-3.5 h-3.5" /> Regenerate
            </button>
          </div>

          <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] overflow-hidden divide-y divide-[var(--color-border)]">
            {loading ? (
              <div className="p-8 text-center text-sm text-[var(--color-muted)]">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-[var(--color-muted)]">No policies match this filter.</div>
            ) : filtered.map(doc => {
              const s = STATUS_STYLE[doc.status] ?? STATUS_STYLE.draft;
              return (
                <button key={doc.id} onClick={() => setSelected(doc)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-[var(--color-surface-2)] transition text-left">
                  <div className="w-9 h-9 rounded-lg bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-foreground-subtle)] flex-shrink-0">
                    <FileText className="w-[18px] h-[18px]" strokeWidth={1.6} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--color-foreground)]">{doc.title}</div>
                    <div className="text-xs text-[var(--color-muted)] mt-0.5">Updated {new Date(doc.updated_at).toLocaleDateString()}</div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${s.cls}`}>{s.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {showWizard && org?.id && (
        <PolicyWizard orgId={org.id} orgName={org.name ?? ""} onClose={() => setShowWizard(false)} onDone={() => { setShowWizard(false); load(); }} />
      )}
    </div>
  );
}

// ─── QUESTIONNAIRE WIZARD ─────────────────────────────────────────────

function PolicyWizard({ orgId, orgName, onClose, onDone }: { orgId: string; orgName: string; onClose: () => void; onDone: () => void }) {
  const [answers, setAnswers] = useState<PolicyAnswers>({ ...DEFAULT_ANSWERS, company_name: orgName });
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [err, setErr] = useState("");

  const set = <K extends keyof PolicyAnswers>(k: K, v: PolicyAnswers[K]) =>
    setAnswers(prev => ({ ...prev, [k]: v }));

  const generate = async () => {
    if (!answers.company_name.trim()) { setErr("Company name required"); return; }
    setGenerating(true); setErr("");
    const { data: s } = await supabase.auth.getSession();
    const token = s?.session?.access_token;
    if (!token) { setErr("Not signed in"); setGenerating(false); return; }
    const res = await fetch("/api/policies/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ org_id: orgId, answers }),
    });
    const j = await res.json();
    setGenerating(false);
    if (!res.ok) { setErr(j.error ?? "Failed"); return; }
    onDone();
  };

  const STEPS = [
    // Step 0: Company basics
    () => (
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--color-foreground)]">About your company</h3>
        <Field label="Company name" value={answers.company_name} onChange={v => set("company_name", v)} />
        <Field label="Company email domain" value={answers.domain} onChange={v => set("domain", v)} placeholder="yourcompany.com" />
        <Select label="Team size" value={answers.employee_count} onChange={v => set("employee_count", v)}
          options={[["1-10","1-10 people"],["11-50","11-50"],["51-200","51-200"],["200+","200+"]]} />
        <Toggle label="Team works remotely (at least partially)" checked={answers.remote_work} onChange={v => set("remote_work", v)} />
      </div>
    ),
    // Step 1: Infrastructure
    () => (
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--color-foreground)]">Infrastructure and data</h3>
        <Select label="Primary cloud provider" value={answers.cloud_provider} onChange={v => set("cloud_provider", v)}
          options={[["AWS","AWS"],["GCP","Google Cloud"],["Azure","Azure"],["Multi-cloud","Multi-cloud"]]} />
        <Select label="Data you handle" value={answers.data_types} onChange={v => set("data_types", v)}
          options={[["General SaaS","General SaaS data"],["PII","Personally Identifiable Information (PII)"],["PHI","Protected Health Information (PHI)"],["Financial","Financial data"]]} />
        <Select label="Backup frequency" value={answers.backup_frequency} onChange={v => set("backup_frequency", v)}
          options={[["Continuous","Continuous replication"],["Daily","Daily"],["Weekly","Weekly"]]} />
        <Select label="Data retention" value={answers.retention_days} onChange={v => set("retention_days", v)}
          options={[["30","30 days"],["90","90 days"],["365","1 year"]]} />
      </div>
    ),
    // Step 2: Security practices
    () => (
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--color-foreground)]">Security practices</h3>
        <Field label="Security lead (name or title)" value={answers.security_lead} onChange={v => set("security_lead", v)} placeholder="CTO" />
        <Field label="Incident reporting email" value={answers.incident_email} onChange={v => set("incident_email", v)} placeholder="security@yourcompany.com" />
        <Toggle label="MFA enforced for cloud access" checked={answers.mfa_enforced} onChange={v => set("mfa_enforced", v)} />
        <Select label="Minimum password length" value={answers.password_min_length} onChange={v => set("password_min_length", v)}
          options={[["8","8 characters"],["12","12 characters"],["14","14 characters"]]} />
        <Select label="Access review frequency" value={answers.access_review_frequency} onChange={v => set("access_review_frequency", v)}
          options={[["Monthly","Monthly"],["Quarterly","Quarterly"],["Annually","Annually"]]} />
        <Select label="Vendor security review" value={answers.vendor_review} onChange={v => set("vendor_review", v)}
          options={[["Annually","Annually"],["Per-engagement","Per engagement"],["Not yet","Not yet"]]} />
      </div>
    ),
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Generate your policies</h2>
            <p className="text-xs text-[var(--color-muted)] mt-1">Step {step + 1} of {STEPS.length}. We'll create 8 tailored drafts.</p>
          </div>
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div key={i} className={`w-8 h-1 rounded-full transition ${i <= step ? "bg-[var(--color-foreground)]" : "bg-[var(--color-border)]"}`} />
            ))}
          </div>
        </div>

        {STEPS[step]()}

        {err && <div className="mt-4 text-sm text-[var(--color-danger)] bg-[var(--color-danger-bg)] px-3 py-2 rounded-lg">{err}</div>}

        <div className="flex justify-between mt-6 pt-4 border-t border-[var(--color-border)]">
          <button onClick={() => step > 0 ? setStep(step - 1) : onClose()}
            className="text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)]">
            {step > 0 ? "Back" : "Cancel"}
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(step + 1)}
              className="bg-[var(--color-foreground)] text-[var(--color-surface)] px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
              Next
            </button>
          ) : (
            <button onClick={generate} disabled={generating}
              className="inline-flex items-center gap-2 bg-[var(--color-foreground)] text-[var(--color-surface)] px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
              <Sparkles className="w-4 h-4" />
              {generating ? "Generating 8 policies..." : "Generate policies"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── FORM HELPERS ─────────────────────────────────────────────

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-[var(--color-foreground-subtle)] block mb-1">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-foreground)] transition" />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div>
      <label className="text-xs font-medium text-[var(--color-foreground-subtle)] block mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-foreground)]">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-[var(--color-foreground-subtle)] cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-[var(--color-border)]" />
      {label}
    </label>
  );
}
