"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useOrg } from "@/lib/org-context";
import { supabase } from "@/lib/supabase";
import {
  Gavel, ClipboardList, AlertOctagon, ShieldCheck, Activity, ArrowUpRight,
  CheckCircle2, AlertCircle, Clock, X, FileSearch
} from "lucide-react";
import { formatDateOnly, isPast, formatDateRange } from "@/lib/dates";

interface PbcRequest {
  id: string;
  title: string;
  status: "requested" | "provided" | "accepted" | "rejected";
  due_date: string | null;
  created_at: string;
  control_id: string | null;
}

export default function AuditPage() {
  const { org, role, controls, scanHistory } = useOrg();
  const [pbc, setPbc] = useState<PbcRequest[] | null>(null);

  const isAuditor = role === "auditor_readonly";

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
    return { compliant, failing, partial, notAssessed, total: controls.length };
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

  const frameworks = (org?.frameworks ?? []) as string[];
  const scope = (org?.scope_config ?? {}) as Record<string, unknown>;

  return (
    <div className="space-y-8">
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
      <div className="grid md:grid-cols-4 gap-3">
        <MetricCard label="Controls compliant" value={`${stats.compliant}/${stats.total}`}
          sub={stats.total > 0 ? `${Math.round((stats.compliant / stats.total) * 100)}%` : "—"}
          tone="success" Icon={ShieldCheck} href="/dashboard/controls" />
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

      {/* Recent activity */}
      <Section title="Recent activity" actionLabel="Full overview" actionHref="/dashboard">
        <RecentActivity orgId={org?.id} />
      </Section>
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
