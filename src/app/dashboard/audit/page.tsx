"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useOrg } from "@/lib/org-context";
import { supabase } from "@/lib/supabase";
import {
  Gavel, ClipboardList, AlertOctagon, ShieldCheck, Activity, ArrowUpRight,
  CheckCircle2, AlertCircle, Clock, X, FileSearch, Beaker, Download
} from "lucide-react";
import { formatDateOnly, isPast, formatDateRange } from "@/lib/dates";
import { generateWorkpaperPdf, type WorkpaperData } from "@/lib/workpaper-pdf";

interface PbcRequest {
  id: string;
  title: string;
  status: "requested" | "provided" | "accepted" | "rejected";
  due_date: string | null;
  created_at: string;
  control_id: string | null;
}

export default function AuditPage() {
  const { org, role, controls, scanHistory, userEmail } = useOrg();
  const isAuditor = role === "auditor_readonly";
  const [pbc, setPbc] = useState<PbcRequest[] | null>(null);
  const [exporting, setExporting] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const handleBulkSignoff = useCallback(async () => {
    if (!org?.id) return;
    if (!isAuditor) return;
    if (!userEmail) { alert("No user email on record."); return; }
    if (!confirm(
      `Auto sign-off will approve every currently compliant control with evidence from the last 45 days. ` +
      `Partial and failing controls are skipped. Continue as ${userEmail}?`
    )) return;
    setBulkBusy(true);
    try {
      // Pull compliant controls with their latest evidence
      const { data: evRows } = await supabase
        .from("control_evidence")
        .select("control_id, collected_at")
        .eq("org_id", org.id)
        .order("collected_at", { ascending: false });
      const latestByControl = new Map<string, string>();
      for (const r of evRows ?? []) {
        if (!latestByControl.has(r.control_id)) latestByControl.set(r.control_id, r.collected_at);
      }
      const freshCutoff = Date.now() - 45 * 86400000;
      const eligible = controls.filter(c => {
        if (c.status !== "compliant") return false;
        const latest = latestByControl.get(c.control_id);
        if (!latest) return false;
        return new Date(latest).getTime() >= freshCutoff;
      });
      if (eligible.length === 0) { alert("No eligible controls (compliant + evidence < 45d old)."); return; }

      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) { alert("Not signed in."); return; }

      let signed = 0;
      for (const ctrl of eligible) {
        const res = await fetch("/api/controls/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            control_id: ctrl.control_id,
            test_notes: `Auto sign-off: evidence within 45 days of ${new Date().toISOString().slice(0, 10)}`,
            approve: true,
            auth_token: token,
          }),
        });
        if (res.ok) signed += 1;
      }
      alert(`Signed off ${signed} of ${eligible.length} eligible controls.`);
      if (typeof window !== "undefined") window.location.reload();
    } finally {
      setBulkBusy(false);
    }
  }, [org?.id, isAuditor, userEmail, controls]);

  const loadPbc = useCallback(async () => {
    if (!org?.id) return;
    const { data } = await supabase
      .from("pbc_requests")
      .select("id, title, status, due_date, created_at, control_id")
      .eq("org_id", org.id)
      .order("created_at", { ascending: false });
    setPbc((data as PbcRequest[]) ?? []);
  }, [org?.id]);

  useEffect(() => { loadPbc(); }, [loadPbc]);

  const stats = useMemo(() => {
    const compliant = controls.filter(c => c.status === "compliant").length;
    const failing = controls.filter(c => c.status === "non_compliant").length;
    const partial = controls.filter(c => c.status === "partial").length;
    const notAssessed = controls.filter(c => c.status === "not_assessed").length;
    const inSample = controls.filter(c => c.in_sample).length;
    return { compliant, failing, partial, notAssessed, total: controls.length, inSample };
  }, [controls]);

  const pbcStats = useMemo(() => {
    if (!pbc) return null;
    const counts = { requested: 0, provided: 0, accepted: 0, rejected: 0 };
    pbc.forEach(p => { counts[p.status]++; });
    const overdue = pbc.filter(p => p.status === "requested" && p.due_date && isPast(p.due_date)).length;
    return { ...counts, overdue, total: pbc.length };
  }, [pbc]);

  const exceptions = useMemo(() => controls.filter(c => c.status === "non_compliant" || c.status === "partial"), [controls]);
  const lastScanIso = scanHistory[0]?.created_at;

  const handleExport = useCallback(async () => {
    if (!org?.id || exporting) return;
    setExporting(true);
    try {
      const sampleIds = controls.filter(c => c.in_sample).map(c => c.control_id);

      const { data: sampleRows } = sampleIds.length > 0
        ? await supabase
            .from("controls")
            .select("control_id, title, status, severity, test_notes, test_attributes, tested_at, approved_at")
            .eq("org_id", org.id)
            .in("control_id", sampleIds)
        : { data: [] as Array<{ control_id: string; title: string; status: string; severity: string | null; test_notes: string | null; test_attributes: Record<string, string> | null; tested_at: string | null; approved_at: string | null }> };

      const { data: commentRows } = sampleIds.length > 0
        ? await supabase
            .from("control_comments")
            .select("control_id, author_email, body, created_at")
            .eq("org_id", org.id)
            .in("control_id", sampleIds)
            .order("created_at", { ascending: true })
        : { data: [] as Array<{ control_id: string; author_email: string | null; body: string; created_at: string }> };

      const commentsBy = new Map<string, { author_email: string | null; body: string; created_at: string }[]>();
      for (const c of commentRows ?? []) {
        const arr = commentsBy.get(c.control_id) ?? [];
        arr.push({ author_email: c.author_email, body: c.body, created_at: c.created_at });
        commentsBy.set(c.control_id, arr);
      }

      // New: findings + test iterations for Type II defensibility
      const { data: findingsRows } = await supabase
        .from("findings")
        .select("control_id, title, severity, disposition, status, management_response, remediation_owner_email, remediation_target_date, auditor_conclusion")
        .eq("org_id", org.id)
        .order("created_at", { ascending: true });
      const { data: instanceRows } = await supabase
        .from("test_instances")
        .select("control_id, period_start, period_end, tested_by_email, tested_at, test_procedure, sample_ids, conclusion")
        .eq("org_id", org.id)
        .order("tested_at", { ascending: true });

      const scope = (org.scope_config ?? {}) as Record<string, unknown>;
      const data: WorkpaperData = {
        org_name: org.name ?? "Organization",
        generated_at: new Date().toISOString(),
        generated_by: userEmail ?? "unknown",
        frameworks: ((org.frameworks ?? []) as string[]),
        audit_period_start: (scope.audit_period_start as string) ?? null,
        audit_period_end: (scope.audit_period_end as string) ?? null,
        scope_notes: (scope.scope_notes as string) ?? null,
        sample_controls: (sampleRows ?? []).map(r => ({
          control_id: r.control_id,
          title: r.title,
          status: r.status,
          severity: r.severity,
          test_notes: r.test_notes,
          test_attributes: r.test_attributes,
          tested_at: r.tested_at,
          approved_at: r.approved_at,
          comments: commentsBy.get(r.control_id) ?? [],
        })),
        exceptions: exceptions.map(e => ({
          control_id: e.control_id,
          title: e.title,
          status: e.status,
          severity: e.severity,
        })),
        pbc: (pbc ?? []).map(p => ({
          title: p.title,
          status: p.status,
          created_at: p.created_at,
          provided_at: null,
          reviewed_at: null,
          control_id: p.control_id,
        })),
        findings: (findingsRows ?? []) as WorkpaperData["findings"],
        test_instances: (instanceRows ?? []) as WorkpaperData["test_instances"],
      };

      const blob = generateWorkpaperPdf(data);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const slug = (org.name ?? "workpaper").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      a.download = `${slug}-workpaper-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Workpaper export failed", err);
      alert("Workpaper export failed. Check console for details.");
    } finally {
      setExporting(false);
    }
  }, [org, controls, exceptions, pbc, userEmail, exporting]);

  const frameworks = (org?.frameworks ?? []) as string[];
  const scope = (org?.scope_config ?? {}) as Record<string, unknown>;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-muted)] bg-[var(--color-surface-2)] px-2.5 py-1 rounded-md mb-3">
            <Gavel className="w-3.5 h-3.5" strokeWidth={1.8} />
            Audit Workspace
          </div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)] tracking-tight">
            {isAuditor ? "Engagement overview" : "Audit readiness"}
          </h1>
          <p className="text-sm text-[var(--color-muted)] mt-1.5 max-w-2xl">
            {isAuditor
              ? "Everything you need to plan, sample, request evidence, and document findings for this engagement."
              : "What your auditor sees. Use this to track readiness and respond to outstanding requests."}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {isAuditor && (
            <button onClick={handleBulkSignoff} disabled={bulkBusy}
              title="Sign off all compliant controls whose most recent evidence is < 45 days old. Skips partials/failures. Sign-off is typed-email-authenticated in bulk."
              className="inline-flex items-center gap-2 bg-[var(--color-bg)] text-[var(--color-foreground)] border border-[var(--color-border)] hover:bg-[var(--color-surface-2)] disabled:opacity-50 text-sm font-medium px-4 py-2 rounded-lg transition">
              {bulkBusy ? "Signing…" : "Auto sign-off fresh compliant"}
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={exporting || !org?.id}
            className="inline-flex items-center gap-2 bg-[var(--color-foreground)] text-[var(--color-surface)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium px-4 py-2 rounded-lg transition"
            title={stats.inSample === 0 ? "Mark controls as in-sample first" : "Download a PDF workpaper of the engagement"}
          >
            <Download className="w-4 h-4" strokeWidth={1.8} />
            {exporting ? "Generating…" : "Export workpaper"}
          </button>
        </div>
      </div>

      {/* Engagement scope */}
      <Section title="Engagement scope">
        <div className="grid md:grid-cols-3 gap-3">
          <ScopeCard label="Frameworks" value={frameworks.length > 0 ? frameworks.map(formatFramework).join(" · ") : "Not set"} />
          <ScopeCard label="Audit period" value={(scope.audit_period_start as string) || (scope.audit_period_end as string)
            ? formatDateRange(scope.audit_period_start as string, scope.audit_period_end as string)
            : "Not defined"} hint={!scope.audit_period_start ? "Set this in Audit Scope" : undefined} />
          <ScopeCard label="Last scan" value={lastScanIso ? new Date(lastScanIso).toLocaleString() : "No scans yet"} />
        </div>
        <div className="flex justify-end mt-3">
          <Link href="/dashboard/scope" className="text-xs text-[var(--color-info)] hover:underline inline-flex items-center gap-1">
            Edit scope <ArrowUpRight className="w-3 h-3" strokeWidth={1.8} />
          </Link>
        </div>
      </Section>

      {/* Top-level metrics */}
      <div className="grid md:grid-cols-5 gap-3">
        <MetricCard label="Controls compliant" value={`${stats.compliant}/${stats.total}`}
          sub={stats.total > 0 ? `${Math.round((stats.compliant / stats.total) * 100)}%` : "—"}
          tone="success" Icon={ShieldCheck} href="/dashboard/controls" />
        <MetricCard label="In sample" value={String(stats.inSample)}
          sub={stats.inSample === 0 ? "none selected" : `of ${stats.total} total`}
          tone="info" Icon={Beaker} href="/dashboard/controls" />
        <MetricCard label="Exceptions" value={String(stats.failing + stats.partial)}
          sub={stats.failing > 0 ? `${stats.failing} failing` : "all passing"}
          tone={stats.failing > 0 ? "danger" : stats.partial > 0 ? "warning" : "success"}
          Icon={AlertOctagon} href="/dashboard/controls" />
        <MetricCard label="PBC requests" value={pbcStats ? String(pbcStats.total) : "—"}
          sub={pbcStats ? `${pbcStats.accepted} accepted · ${pbcStats.provided} pending review` : "no requests"}
          tone={pbcStats?.overdue ? "warning" : "info"} Icon={ClipboardList} href="/dashboard/pbc" />
        <MetricCard label="Not yet assessed" value={String(stats.notAssessed)}
          sub={stats.notAssessed > 0 ? "needs evidence" : "all reviewed"}
          tone={stats.notAssessed > 0 ? "warning" : "success"} Icon={FileSearch} href="/dashboard/controls" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* PBC summary */}
        <Section title="Outstanding PBC requests"
          actionLabel="Open PBC" actionHref="/dashboard/pbc">
          {!pbc ? (
            <div className="text-sm text-[var(--color-muted)]">Loading…</div>
          ) : pbc.length === 0 ? (
            <div className="text-sm text-[var(--color-muted)] italic">
              {isAuditor ? "No requests created yet." : "No outstanding requests from your auditor."}
            </div>
          ) : (
            <div className="space-y-2">
              {pbc.filter(p => p.status === "requested" || p.status === "provided" || p.status === "rejected").slice(0, 6).map(p => (
                <Link key={p.id} href="/dashboard/pbc"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-surface)] transition">
                  <PbcStatusDot status={p.status} />
                  <span className="text-sm text-[var(--color-foreground-subtle)] flex-1 truncate">{p.title}</span>
                  {p.due_date && (
                    <span className={`text-xs ${isPast(p.due_date) && p.status === "requested" ? "text-[var(--color-danger)] font-medium" : "text-[var(--color-muted)]"}`}>
                      Due {formatDateOnly(p.due_date)}
                    </span>
                  )}
                </Link>
              ))}
              {pbc.filter(p => p.status === "requested" || p.status === "provided" || p.status === "rejected").length === 0 && (
                <div className="text-sm text-[var(--color-muted)] italic">Nothing outstanding — all caught up.</div>
              )}
            </div>
          )}
        </Section>

        {/* Exceptions */}
        <Section title="Exceptions" actionLabel="Open Controls" actionHref="/dashboard/controls">
          {exceptions.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-[var(--color-success)]">
              <CheckCircle2 className="w-4 h-4" strokeWidth={1.8} />
              No exceptions — every assessed control is passing.
            </div>
          ) : (
            <div className="space-y-2">
              {exceptions.slice(0, 8).map(e => (
                <Link key={e.control_id} href="/dashboard/controls"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-surface)] transition">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${e.status === "non_compliant" ? "bg-[var(--color-danger)]" : "bg-[var(--color-warning)]"}`} />
                  <span className="font-mono text-xs text-[var(--color-muted)] flex-shrink-0 w-16">{e.control_id}</span>
                  <span className="text-sm text-[var(--color-foreground-subtle)] flex-1 truncate">{e.title}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${e.status === "non_compliant" ? "bg-[var(--color-danger-bg)] text-[var(--color-danger)]" : "bg-[var(--color-warning-bg)] text-[var(--color-warning)]"}`}>
                    {e.status.replace("_", " ")}
                  </span>
                </Link>
              ))}
              {exceptions.length > 8 && (
                <div className="text-xs text-[var(--color-muted)] pt-1 px-3">+ {exceptions.length - 8} more</div>
              )}
            </div>
          )}
        </Section>
      </div>

      {/* Engagement milestones */}
      <Section title="Engagement milestones">
        <EngagementMilestones orgId={org?.id} canAdd={isAuditor} />
      </Section>

      {/* Recent activity */}
      <Section title="Recent activity" actionLabel="Full overview" actionHref="/dashboard">
        <RecentActivity orgId={org?.id} />
      </Section>
    </div>
  );
}

function EngagementMilestones({ orgId, canAdd }: { orgId: string | undefined; canAdd: boolean }) {
  const [events, setEvents] = useState<{ id: string; title: string; detail: string | null; timestamp: string }[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!orgId) return;
    supabase.from("activity_events").select("id, title, detail, timestamp")
      .eq("org_id", orgId).eq("type", "engagement_milestone")
      .order("timestamp", { ascending: false }).limit(20)
      .then(({ data }) => setEvents(data ?? []));
  }, [orgId]);
  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;
      await fetch("/api/audit/milestone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          detail: detail.trim() || null,
          timestamp: date ? new Date(date + "T00:00:00").toISOString() : null,
          auth_token: session.session.access_token,
        }),
      });
      setTitle(""); setDetail(""); setDate(""); setShowForm(false);
      await load();
    } finally { setBusy(false); }
  };

  if (events === null) return <div className="text-sm text-[var(--color-muted)]">Loading…</div>;

  return (
    <div className="space-y-3">
      {events.length === 0 ? (
        <div className="text-sm text-[var(--color-muted)] italic">
          No milestones recorded yet. Use this to log kickoff, walkthroughs, exit interviews, or subsequent events.
        </div>
      ) : (
        <div className="space-y-2">
          {events.map(e => (
            <div key={e.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-[var(--color-surface)]">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-info)] flex-shrink-0 mt-2" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--color-foreground)]">{e.title}</div>
                {e.detail && <div className="text-xs text-[var(--color-muted)] mt-0.5">{e.detail}</div>}
              </div>
              <time className="text-xs text-[var(--color-muted)] flex-shrink-0" dateTime={e.timestamp}>
                {new Date(e.timestamp).toLocaleDateString()}
              </time>
            </div>
          ))}
        </div>
      )}
      {canAdd && !showForm && (
        <button onClick={() => setShowForm(true)}
          className="text-xs text-[var(--color-info)] hover:underline">
          + Add milestone
        </button>
      )}
      {canAdd && showForm && (
        <form onSubmit={submit} className="space-y-2 bg-[var(--color-surface)] rounded-lg p-3 border border-[var(--color-border)]">
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
            placeholder="e.g. Walkthrough of access provisioning held"
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm text-[var(--color-foreground)]" />
          <input type="text" value={detail} onChange={e => setDetail(e.target.value)}
            placeholder="Optional detail (attendees, outcome, follow-ups)"
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1.5 text-xs text-[var(--color-foreground-subtle)]" />
          <div className="flex items-center gap-2">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1.5 text-xs text-[var(--color-foreground)]" />
            <span className="text-[10px] text-[var(--color-muted)]">leave blank for today</span>
            <div className="flex-1" />
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-[var(--color-muted)] px-2 py-1">Cancel</button>
            <button type="submit" disabled={busy || !title.trim()}
              className="text-xs bg-[var(--color-foreground)] text-[var(--color-surface)] px-3 py-1.5 rounded hover:opacity-90 disabled:opacity-50">
              {busy ? "Saving…" : "Add"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Section({ title, children, actionLabel, actionHref }: { title: string; children: React.ReactNode; actionLabel?: string; actionHref?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider">{title}</h2>
        {actionLabel && actionHref && (
          <Link href={actionHref} className="text-xs text-[var(--color-info)] hover:underline inline-flex items-center gap-1">
            {actionLabel} <ArrowUpRight className="w-3 h-3" strokeWidth={1.8} />
          </Link>
        )}
      </div>
      <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-4">
        {children}
      </div>
    </div>
  );
}

function ScopeCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3">
      <div className="text-[10px] font-medium text-[var(--color-muted)] uppercase tracking-wider">{label}</div>
      <div className="text-sm font-medium text-[var(--color-foreground)] mt-1 truncate">{value}</div>
      {hint && <div className="text-[11px] text-[var(--color-warning)] mt-1">{hint}</div>}
    </div>
  );
}

function MetricCard({ label, value, sub, tone, Icon, href }: {
  label: string; value: string; sub: string;
  tone: "success" | "danger" | "warning" | "info";
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  href: string;
}) {
  const colorMap = {
    success: "text-[var(--color-success)] bg-[var(--color-success-bg)]",
    danger:  "text-[var(--color-danger)] bg-[var(--color-danger-bg)]",
    warning: "text-[var(--color-warning)] bg-[var(--color-warning-bg)]",
    info:    "text-[var(--color-info)] bg-[var(--color-info-bg)]",
  } as const;
  return (
    <Link href={href} className="block bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-5 hover:border-[var(--color-border-strong)] transition">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-medium text-[var(--color-muted)] uppercase tracking-wider">{label}</div>
        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${colorMap[tone]}`}>
          <Icon className="w-[14px] h-[14px]" strokeWidth={1.8} />
        </div>
      </div>
      <div className="text-2xl font-semibold text-[var(--color-foreground)] tabular-nums">{value}</div>
      <div className="text-xs text-[var(--color-muted)] mt-0.5">{sub}</div>
    </Link>
  );
}

function PbcStatusDot({ status }: { status: PbcRequest["status"] }) {
  if (status === "accepted") return <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] flex-shrink-0" strokeWidth={1.8} />;
  if (status === "rejected") return <X className="w-4 h-4 text-[var(--color-danger)] flex-shrink-0" strokeWidth={1.8} />;
  if (status === "provided") return <AlertCircle className="w-4 h-4 text-[var(--color-info)] flex-shrink-0" strokeWidth={1.8} />;
  return <Clock className="w-4 h-4 text-[var(--color-warning)] flex-shrink-0" strokeWidth={1.8} />;
}

function RecentActivity({ orgId }: { orgId: string | undefined }) {
  const [events, setEvents] = useState<{ id: string; title: string; detail: string | null; type: string; timestamp: string }[] | null>(null);
  useEffect(() => {
    if (!orgId) return;
    supabase.from("activity_events").select("id, title, detail, type, timestamp")
      .eq("org_id", orgId).order("timestamp", { ascending: false }).limit(10)
      .then(({ data }) => setEvents(data ?? []));
  }, [orgId]);
  if (events === null) return <div className="text-sm text-[var(--color-muted)]">Loading…</div>;
  if (events.length === 0) return <div className="text-sm text-[var(--color-muted)] italic">No activity yet.</div>;
  return (
    <div className="space-y-2">
      {events.map(e => (
        <div key={e.id} className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-surface)] transition">
          <Activity className="w-3.5 h-3.5 text-[var(--color-muted)] flex-shrink-0 mt-1" strokeWidth={1.8} />
          <div className="flex-1 min-w-0">
            <div className="text-sm text-[var(--color-foreground-subtle)]">{e.title}</div>
            {e.detail && <div className="text-xs text-[var(--color-muted)] truncate">{e.detail}</div>}
          </div>
          <time className="text-xs text-[var(--color-muted)] flex-shrink-0" dateTime={e.timestamp}>
            {new Date(e.timestamp).toLocaleString()}
          </time>
        </div>
      ))}
    </div>
  );
}

function formatFramework(f: string): string {
  return f === "soc2" ? "SOC 2 Type I"
    : f === "iso27001" ? "ISO 27001"
    : f === "hipaa" ? "HIPAA"
    : f === "pci" ? "PCI DSS"
    : f.toUpperCase();
}
