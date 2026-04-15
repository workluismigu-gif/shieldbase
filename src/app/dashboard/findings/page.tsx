"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useOrg } from "@/lib/org-context";
import { supabase } from "@/lib/supabase";
import { AlertOctagon, Plus, Filter, ChevronRight, Calendar, User } from "lucide-react";

interface Finding {
  id: string;
  control_id: string | null;
  title: string;
  description: string | null;
  severity: "critical" | "high" | "medium" | "low" | "informational";
  disposition: "observation" | "deficiency" | "significant_deficiency" | "material_weakness" | "not_a_deficiency";
  status: "open" | "remediating" | "resolved" | "accepted" | "deferred";
  management_response: string | null;
  remediation_owner_email: string | null;
  remediation_target_date: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

const SEV_STYLES: Record<Finding["severity"], string> = {
  critical: "bg-red-500 text-white",
  high: "bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)]",
  medium: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
  low: "bg-[var(--color-info-bg)] text-[var(--color-info)]",
  informational: "bg-[var(--color-surface-2)] text-[var(--color-muted)]",
};

const STATUS_STYLES: Record<Finding["status"], string> = {
  open: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
  remediating: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
  resolved: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
  accepted: "bg-[var(--color-info-bg)] text-[var(--color-info)]",
  deferred: "bg-[var(--color-surface-2)] text-[var(--color-muted)]",
};

const DISPOSITION_LABEL: Record<Finding["disposition"], string> = {
  observation: "Observation",
  deficiency: "Deficiency",
  significant_deficiency: "Significant Deficiency",
  material_weakness: "Material Weakness",
  not_a_deficiency: "Not a Deficiency",
};

export default function FindingsPage() {
  const { org, role, canWrite } = useOrg();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    if (!org?.id) return;
    setLoading(true);
    const { data: s } = await supabase.auth.getSession();
    const token = s?.session?.access_token;
    if (!token) { setLoading(false); return; }
    const params = new URLSearchParams({ org_id: org.id });
    if (statusFilter) params.set("status", statusFilter);
    if (severityFilter) params.set("severity", severityFilter);
    const res = await fetch(`/api/findings?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const j = await res.json();
    setFindings(j.findings ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [org?.id, statusFilter, severityFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const byStatus = useMemo(() => {
    const c = { open: 0, remediating: 0, resolved: 0, accepted: 0, deferred: 0 };
    for (const f of findings) c[f.status] += 1;
    return c;
  }, [findings]);

  const bySeverity = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0, informational: 0 };
    for (const f of findings) if (f.status === "open" || f.status === "remediating") c[f.severity] += 1;
    return c;
  }, [findings]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)] flex items-center gap-2">
            <AlertOctagon className="w-6 h-6 text-[var(--color-danger)]" strokeWidth={1.8} />
            Findings & Exceptions
          </h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">Formal record of deficiencies and exceptions identified during fieldwork.</p>
        </div>
        {canWrite && (
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 bg-[var(--color-foreground)] text-[var(--color-surface)] hover:opacity-90 text-sm px-4 py-2 rounded-lg font-medium transition">
            <Plus className="w-4 h-4" strokeWidth={2} />
            New finding
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4">
          <div className="text-xs text-[var(--color-muted)] font-medium">Open</div>
          <div className="text-2xl font-semibold text-[var(--color-danger)] tabular-nums mt-1">{byStatus.open}</div>
        </div>
        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4">
          <div className="text-xs text-[var(--color-muted)] font-medium">Remediating</div>
          <div className="text-2xl font-semibold text-[var(--color-warning)] tabular-nums mt-1">{byStatus.remediating}</div>
        </div>
        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4">
          <div className="text-xs text-[var(--color-muted)] font-medium">Resolved</div>
          <div className="text-2xl font-semibold text-[var(--color-success)] tabular-nums mt-1">{byStatus.resolved}</div>
        </div>
        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4">
          <div className="text-xs text-[var(--color-muted)] font-medium">Critical + High</div>
          <div className="text-2xl font-semibold text-[var(--color-foreground)] tabular-nums mt-1">{bySeverity.critical + bySeverity.high}</div>
        </div>
        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4">
          <div className="text-xs text-[var(--color-muted)] font-medium">Total</div>
          <div className="text-2xl font-semibold text-[var(--color-foreground)] tabular-nums mt-1">{findings.length}</div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm flex-wrap">
        <Filter className="w-4 h-4 text-[var(--color-muted)]" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm">
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="remediating">Remediating</option>
          <option value="resolved">Resolved</option>
          <option value="accepted">Accepted</option>
          <option value="deferred">Deferred</option>
        </select>
        <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm">
          <option value="">All severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="informational">Informational</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--color-muted)] text-sm">Loading findings...</div>
      ) : findings.length === 0 ? (
        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-12 text-center">
          <AlertOctagon className="w-10 h-10 text-[var(--color-muted)] mx-auto mb-3" strokeWidth={1.4} />
          <p className="text-[var(--color-foreground-subtle)] font-medium mb-1">No findings logged</p>
          <p className="text-sm text-[var(--color-muted)]">
            {role === "auditor_readonly" || role === "owner" || role === "admin"
              ? "Create one from a failing control, or start from a narrative finding."
              : "Your auditor has not recorded any findings for this engagement."}
          </p>
        </div>
      ) : (
        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
          {findings.map((f, i) => (
            <Link key={f.id} href={`/dashboard/findings/${f.id}`}
              className={`flex items-start gap-4 px-5 py-4 hover:bg-[var(--color-surface-2)] transition ${i < findings.length - 1 ? "border-b border-[var(--color-border)]" : ""}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${SEV_STYLES[f.severity]}`}>{f.severity}</span>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${STATUS_STYLES[f.status]}`}>{f.status}</span>
                  {f.disposition !== "observation" && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--color-foreground)] text-[var(--color-surface)]">{DISPOSITION_LABEL[f.disposition]}</span>
                  )}
                  {f.control_id && <span className="text-xs font-mono text-[var(--color-muted)]">{f.control_id}</span>}
                </div>
                <div className="font-medium text-[var(--color-foreground)] truncate">{f.title}</div>
                {f.description && <div className="text-sm text-[var(--color-muted)] line-clamp-2 mt-1">{f.description}</div>}
                <div className="flex items-center gap-4 text-xs text-[var(--color-muted)] mt-2">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(f.created_at).toLocaleDateString()}</span>
                  {f.remediation_owner_email && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {f.remediation_owner_email}</span>}
                  {f.remediation_target_date && <span className="flex items-center gap-1">Target: {new Date(f.remediation_target_date).toLocaleDateString()}</span>}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--color-muted)] flex-shrink-0 mt-1" />
            </Link>
          ))}
        </div>
      )}

      {showCreate && org?.id && <CreateFindingModal orgId={org.id} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

function CreateFindingModal({ orgId, onClose, onCreated }: { orgId: string; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [controlId, setControlId] = useState("");
  const [severity, setSeverity] = useState<Finding["severity"]>("medium");
  const [disposition, setDisposition] = useState<Finding["disposition"]>("observation");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!title.trim()) { setErr("Title required"); return; }
    setSaving(true); setErr("");
    const { data: s } = await supabase.auth.getSession();
    const token = s?.session?.access_token;
    if (!token) { setErr("Not signed in"); setSaving(false); return; }
    const res = await fetch("/api/findings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ org_id: orgId, title: title.trim(), description: description.trim() || null, control_id: controlId.trim() || null, severity, disposition }),
    });
    const j = await res.json();
    setSaving(false);
    if (!res.ok) { setErr(j.error || "Failed to create"); return; }
    onCreated();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-6 max-w-xl w-full space-y-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-[var(--color-foreground)]">New finding</h2>

        <div>
          <label className="text-xs font-medium text-[var(--color-foreground-subtle)] block mb-1">Title <span className="text-[var(--color-danger)]">*</span></label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm focus:outline-none focus:border-[var(--color-foreground)]"
            placeholder="e.g. Terminated employee retained AWS console access for 11 days" />
        </div>

        <div>
          <label className="text-xs font-medium text-[var(--color-foreground-subtle)] block mb-1">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm focus:outline-none focus:border-[var(--color-foreground)] resize-y"
            placeholder="Context, population tested, sample IDs, exception observed..." />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-[var(--color-foreground-subtle)] block mb-1">Control (optional)</label>
            <input value={controlId} onChange={e => setControlId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-mono focus:outline-none focus:border-[var(--color-foreground)]"
              placeholder="CC6.2" />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--color-foreground-subtle)] block mb-1">Severity</label>
            <select value={severity} onChange={e => setSeverity(e.target.value as Finding["severity"])}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm focus:outline-none focus:border-[var(--color-foreground)]">
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="informational">Informational</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--color-foreground-subtle)] block mb-1">Disposition</label>
            <select value={disposition} onChange={e => setDisposition(e.target.value as Finding["disposition"])}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm focus:outline-none focus:border-[var(--color-foreground)]">
              <option value="observation">Observation</option>
              <option value="deficiency">Deficiency</option>
              <option value="significant_deficiency">Significant Deficiency</option>
              <option value="material_weakness">Material Weakness</option>
              <option value="not_a_deficiency">Not a Deficiency</option>
            </select>
          </div>
        </div>

        {err && <div className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-bg)] px-3 py-2 rounded-lg">{err}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-foreground)]">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="bg-[var(--color-foreground)] text-[var(--color-surface)] hover:opacity-90 disabled:opacity-40 text-sm px-4 py-2 rounded-lg font-medium">
            {saving ? "Creating..." : "Create finding"}
          </button>
        </div>
      </div>
    </div>
  );
}
