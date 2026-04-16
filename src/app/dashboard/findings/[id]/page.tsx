"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useOrg } from "@/lib/org-context";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, MessageSquare, Send, Trash2, Save } from "lucide-react";
import Glossary from "@/components/Glossary";

interface Finding {
  id: string;
  org_id: string;
  control_id: string | null;
  title: string;
  description: string | null;
  severity: "critical" | "high" | "medium" | "low" | "informational";
  disposition: "observation" | "deficiency" | "significant_deficiency" | "material_weakness" | "not_a_deficiency";
  status: "open" | "remediating" | "resolved" | "accepted" | "deferred";
  management_response: string | null;
  remediation_owner_email: string | null;
  remediation_target_date: string | null;
  auditor_conclusion: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

interface FindingEvent {
  id: string;
  event_type: "comment" | "status_change" | "disposition_change" | "management_response" | "auditor_note";
  author_email: string | null;
  body: string | null;
  from_value: string | null;
  to_value: string | null;
  created_at: string;
}

export default function FindingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { role } = useOrg();
  const isAuditor = role === "auditor_readonly";
  const isOwner = role === "owner" || role === "admin";
  // Any org member participates on findings. Auditors drive status/disposition/conclusion;
  // owners drive management_response/remediation. Comments open to all.
  const canParticipate = !!role;

  const [finding, setFinding] = useState<Finding | null>(null);
  const [events, setEvents] = useState<FindingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [comment, setComment] = useState("");

  // Local editable state (saved on blur / button)
  const [status, setStatus] = useState<Finding["status"]>("open");
  const [disposition, setDisposition] = useState<Finding["disposition"]>("observation");
  const [mgmtResponse, setMgmtResponse] = useState("");
  const [remediationOwner, setRemediationOwner] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [auditorConclusion, setAuditorConclusion] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: s } = await supabase.auth.getSession();
    const token = s?.session?.access_token;
    if (!token) { setLoading(false); return; }
    const res = await fetch(`/api/findings/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const j = await res.json();
    if (!res.ok) { setErr(j.error || "Failed to load"); setLoading(false); return; }
    setFinding(j.finding);
    setEvents(j.events ?? []);
    setStatus(j.finding.status);
    setDisposition(j.finding.disposition);
    setMgmtResponse(j.finding.management_response ?? "");
    setRemediationOwner(j.finding.remediation_owner_email ?? "");
    setTargetDate(j.finding.remediation_target_date ?? "");
    setAuditorConclusion(j.finding.auditor_conclusion ?? "");
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = async (updates: Partial<Finding>) => {
    setSaving(true); setErr("");
    const { data: s } = await supabase.auth.getSession();
    const token = s?.session?.access_token;
    if (!token) { setErr("Not signed in"); setSaving(false); return; }
    const res = await fetch(`/api/findings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates),
    });
    const j = await res.json();
    setSaving(false);
    if (!res.ok) { setErr(j.error || "Failed to save"); return; }
    await load();
  };

  const postComment = async () => {
    if (!comment.trim()) return;
    const { data: s } = await supabase.auth.getSession();
    const token = s?.session?.access_token;
    if (!token) return;
    const res = await fetch(`/api/findings/${id}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ body: comment.trim(), event_type: isAuditor ? "auditor_note" : "comment" }),
    });
    if (res.ok) { setComment(""); load(); }
  };

  const del = async () => {
    if (!confirm("Delete this finding permanently?")) return;
    const { data: s } = await supabase.auth.getSession();
    const token = s?.session?.access_token;
    if (!token) return;
    const res = await fetch(`/api/findings/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) router.push("/dashboard/findings");
  };

  if (loading) return <div className="text-center py-12 text-[var(--color-muted)] text-sm">Loading...</div>;
  if (!finding) return <div className="text-center py-12 text-[var(--color-danger)] text-sm">{err || "Not found"}</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/dashboard/findings" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)]">
        <ArrowLeft className="w-4 h-4" /> Back to findings
      </Link>

      <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-[var(--color-muted)] mb-1">
              Logged {new Date(finding.created_at).toLocaleString()} · updated {new Date(finding.updated_at).toLocaleString()}
              {finding.control_id && <> · <span className="font-mono">{finding.control_id}</span></>}
            </div>
            <h1 className="text-xl font-semibold text-[var(--color-foreground)]">{finding.title}</h1>
            {finding.description && <p className="text-sm text-[var(--color-foreground-subtle)] mt-2 whitespace-pre-wrap">{finding.description}</p>}
          </div>
          {canParticipate && (
            <button onClick={del} title="Delete finding"
              className="p-2 text-[var(--color-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] rounded-lg transition">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-[var(--color-foreground-subtle)] block mb-1">Status</label>
            <select value={status} onChange={e => { setStatus(e.target.value as Finding["status"]); patch({ status: e.target.value as Finding["status"] }); }}
              disabled={!canParticipate || saving}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm disabled:opacity-60">
              <option value="open">Open</option>
              <option value="remediating">Remediating</option>
              <option value="resolved">Resolved</option>
              <option value="accepted">Accepted</option>
              <option value="deferred">Deferred</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--color-foreground-subtle)] block mb-1"><Glossary term="disposition">Disposition</Glossary> {!isAuditor && <span className="text-[var(--color-muted)]">(auditor only)</span>}</label>
            <select value={disposition} onChange={e => { setDisposition(e.target.value as Finding["disposition"]); patch({ disposition: e.target.value as Finding["disposition"] }); }}
              disabled={!isAuditor || saving}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm disabled:opacity-60">
              <option value="observation">Observation</option>
              <option value="deficiency">Deficiency</option>
              <option value="significant_deficiency">Significant Deficiency</option>
              <option value="material_weakness">Material Weakness</option>
              <option value="not_a_deficiency">Not a Deficiency</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--color-foreground-subtle)] block mb-1">Severity</label>
            <div className="text-sm font-medium text-[var(--color-foreground)] uppercase">{finding.severity}</div>
          </div>
        </div>
      </div>

      {/* Management Response (owner) */}
      <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[var(--color-foreground)]">Management Response {!isOwner && <span className="text-xs text-[var(--color-muted)] font-normal ml-2">(owner only)</span>}</h2>
        </div>
        <textarea value={mgmtResponse} onChange={e => setMgmtResponse(e.target.value)} rows={4}
          disabled={!isOwner}
          placeholder="Management's response to this finding: remediation plan, compensating controls, acceptance rationale, etc."
          className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm disabled:opacity-60 resize-y" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-[var(--color-foreground-subtle)] block mb-1">Remediation owner email</label>
            <input type="email" value={remediationOwner} onChange={e => setRemediationOwner(e.target.value)}
              disabled={!isOwner}
              placeholder="owner@company.com"
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm disabled:opacity-60" />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--color-foreground-subtle)] block mb-1">Remediation target date</label>
            <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
              disabled={!isOwner}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm disabled:opacity-60" />
          </div>
        </div>
        {isOwner && (
          <button onClick={() => patch({ management_response: mgmtResponse || null, remediation_owner_email: remediationOwner || null, remediation_target_date: targetDate || null })}
            disabled={saving}
            className="inline-flex items-center gap-1.5 bg-[var(--color-foreground)] text-[var(--color-surface)] hover:opacity-90 disabled:opacity-40 text-sm px-4 py-2 rounded-lg font-medium">
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Save response"}
          </button>
        )}
      </div>

      {/* Auditor Conclusion */}
      {isAuditor && (
        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-6 space-y-3">
          <h2 className="font-semibold text-[var(--color-foreground)]">Auditor Conclusion</h2>
          <p className="text-xs text-[var(--color-muted)]">This text flows into the workpaper. Use formal audit language.</p>
          <textarea value={auditorConclusion} onChange={e => setAuditorConclusion(e.target.value)} rows={5}
            placeholder="Based on the inquiry, inspection of [artifact], and reperformance of [procedure], the control [was/was not] operating effectively during the period..."
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm resize-y" />
          <button onClick={() => patch({ auditor_conclusion: auditorConclusion || null })} disabled={saving}
            className="inline-flex items-center gap-1.5 bg-[var(--color-foreground)] text-[var(--color-surface)] hover:opacity-90 disabled:opacity-40 text-sm px-4 py-2 rounded-lg font-medium">
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Save conclusion"}
          </button>
        </div>
      )}
      {!isAuditor && finding.auditor_conclusion && (
        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-6">
          <h2 className="font-semibold text-[var(--color-foreground)] mb-2">Auditor Conclusion</h2>
          <p className="text-sm text-[var(--color-foreground-subtle)] whitespace-pre-wrap">{finding.auditor_conclusion}</p>
        </div>
      )}

      {/* Thread */}
      <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-6">
        <h2 className="font-semibold text-[var(--color-foreground)] mb-4 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> Activity
        </h2>
        <div className="space-y-3">
          {events.length === 0 && <p className="text-sm text-[var(--color-muted)]">No activity yet.</p>}
          {events.map(e => (
            <div key={e.id} className="flex gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center text-xs font-semibold text-[var(--color-foreground-subtle)] flex-shrink-0">
                {(e.author_email ?? "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-medium text-[var(--color-foreground)]">{e.author_email ?? "System"}</span>
                  <span className="text-xs text-[var(--color-muted)]">{new Date(e.created_at).toLocaleString()}</span>
                </div>
                {e.event_type === "comment" && <div className="text-[var(--color-foreground-subtle)] whitespace-pre-wrap mt-0.5">{e.body}</div>}
                {e.event_type === "auditor_note" && (
                  <div className="mt-1 bg-[var(--color-info-bg)] border border-[var(--color-info)]/30 rounded-lg p-2 text-[var(--color-info)] whitespace-pre-wrap text-xs">
                    <span className="font-semibold uppercase tracking-wider mr-2">Auditor Note</span>{e.body}
                  </div>
                )}
                {e.event_type === "management_response" && (
                  <div className="mt-1 text-[var(--color-foreground-subtle)] whitespace-pre-wrap">
                    <span className="text-xs text-[var(--color-muted)] font-medium">Updated management response: </span>{e.body}
                  </div>
                )}
                {e.event_type === "status_change" && (
                  <div className="text-[var(--color-muted)] text-xs mt-0.5">
                    changed status: <span className="font-medium">{e.from_value}</span> → <span className="font-medium">{e.to_value}</span>
                  </div>
                )}
                {e.event_type === "disposition_change" && (
                  <div className="text-[var(--color-muted)] text-xs mt-0.5">
                    changed disposition: <span className="font-medium">{e.from_value}</span> → <span className="font-medium">{e.to_value}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {canParticipate && (
          <div className="mt-4 flex gap-2">
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
              placeholder={isAuditor ? "Add an auditor note..." : "Add a comment..."}
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm focus:outline-none focus:border-[var(--color-foreground)] resize-y" />
            <button onClick={postComment} disabled={!comment.trim()}
              className="bg-[var(--color-foreground)] text-[var(--color-surface)] hover:opacity-90 disabled:opacity-40 p-2.5 rounded-lg self-start">
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {err && <div className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-bg)] px-3 py-2 rounded-lg">{err}</div>}
    </div>
  );
}
