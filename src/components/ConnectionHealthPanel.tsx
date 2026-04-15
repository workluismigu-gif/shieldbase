"use client";
import { useEffect, useState } from "react";
import { useOrg } from "@/lib/org-context";
import { supabase } from "@/lib/supabase";
import { Cloud, Activity, AlertCircle, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { Github } from "@/components/icons/GithubIcon";

type LucideIcon = React.ComponentType<{ className?: string; strokeWidth?: number }>;

interface ProviderStatus {
  id: "aws" | "github" | "google_workspace" | "slack" | "azure";
  label: string;
  Icon: LucideIcon;
  connected: boolean;
  lastScanAt: string | null;
  lastScore: number | null;
  lastFindingsCount: number | null;
  scansLast7d: number;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function nextScanIn(): string {
  // Daily cron at 06:00 UTC
  const now = new Date();
  const next = new Date();
  next.setUTCHours(6, 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  const ms = next.getTime() - now.getTime();
  const hrs = Math.floor(ms / 3600000);
  const min = Math.floor((ms % 3600000) / 60000);
  return hrs > 0 ? `${hrs}h ${min}m` : `${min}m`;
}

const PROVIDERS: Array<Pick<ProviderStatus, "id" | "label" | "Icon">> = [
  { id: "aws", label: "AWS", Icon: Cloud },
  { id: "github", label: "GitHub", Icon: Github },
  { id: "google_workspace", label: "Google Workspace", Icon: Activity },
  { id: "slack", label: "Slack", Icon: Activity },
];

export default function ConnectionHealthPanel() {
  const { org } = useOrg();
  const [statuses, setStatuses] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  useEffect(() => {
    if (!org?.id) return;
    let cancelled = false;

    async function load() {
      const tech = (org!.tech_stack ?? {}) as Record<string, unknown>;
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

      const { data: scans } = await supabase
        .from("scan_results")
        .select("scan_type, created_at, summary, findings")
        .eq("org_id", org!.id)
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false });

      const next: ProviderStatus[] = PROVIDERS.map(p => {
        const connected =
          p.id === "aws" ? !!tech.aws_role_arn :
          p.id === "github" ? !!tech.github_token :
          p.id === "google_workspace" ? !!tech.google_access_token :
          p.id === "slack" ? !!tech.slack_access_token : false;
        const matching = (scans ?? []).filter(s => s.scan_type === p.id);
        const last = matching[0];
        const score = (last?.summary as { score?: number } | undefined)?.score ?? null;
        const findings = Array.isArray(last?.findings) ? (last.findings as unknown[]).length : null;
        return {
          ...p,
          connected,
          lastScanAt: last?.created_at ?? null,
          lastScore: score,
          lastFindingsCount: findings,
          scansLast7d: matching.length,
        };
      });
      if (!cancelled) {
        setStatuses(next);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [org]);

  async function rescan(provider: string) {
    setRefreshing(provider);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch("/api/scan/trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ provider, org_id: org?.id }),
      });
      if (!res.ok) {
        const err = await res.text();
        alert(`Scan trigger failed: ${err}`);
      }
    } finally {
      setRefreshing(null);
    }
  }

  if (loading) {
    return (
      <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-6">
        <div className="text-sm text-[var(--color-muted)]">Loading connection health…</div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-[var(--color-foreground)]">Connection health</div>
          <div className="text-xs text-[var(--color-muted)] mt-0.5">Daily auto-scan · next run in {nextScanIn()}</div>
        </div>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {statuses.map(s => {
          const ok = s.connected && s.lastScanAt;
          const stale = s.connected && s.lastScanAt && Date.now() - new Date(s.lastScanAt).getTime() > 48 * 3600_000;
          return (
            <div key={s.id} className="px-5 py-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-foreground-subtle)] flex-shrink-0">
                <s.Icon className="w-4.5 h-4.5" strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-[var(--color-foreground)]">{s.label}</div>
                  {!s.connected ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-muted)] bg-[var(--color-surface-2)] px-1.5 py-0.5 rounded-md">
                      Not connected
                    </span>
                  ) : stale ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-warning)] bg-[var(--color-warning-bg)] px-1.5 py-0.5 rounded-md">
                      <AlertCircle className="w-3 h-3" /> Stale
                    </span>
                  ) : ok ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-success)] bg-[var(--color-success-bg)] px-1.5 py-0.5 rounded-md">
                      <CheckCircle2 className="w-3 h-3" /> Healthy
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-info)] bg-[var(--color-info-bg)] px-1.5 py-0.5 rounded-md">
                      <Clock className="w-3 h-3" /> Awaiting first scan
                    </span>
                  )}
                </div>
                <div className="text-xs text-[var(--color-muted)] mt-1 flex items-center gap-3 flex-wrap">
                  <span>Last scan: <span className="text-[var(--color-foreground-subtle)]">{timeAgo(s.lastScanAt)}</span></span>
                  {s.lastScore !== null && <span>Score: <span className="text-[var(--color-foreground-subtle)] font-medium">{s.lastScore}%</span></span>}
                  {s.lastFindingsCount !== null && <span>Findings: <span className="text-[var(--color-foreground-subtle)]">{s.lastFindingsCount}</span></span>}
                  <span>Last 7d: <span className="text-[var(--color-foreground-subtle)]">{s.scansLast7d} scan{s.scansLast7d === 1 ? "" : "s"}</span></span>
                </div>
              </div>
              {s.connected && (
                <button
                  onClick={() => rescan(s.id)}
                  disabled={refreshing === s.id}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-foreground-subtle)] hover:text-[var(--color-foreground)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] px-2.5 py-1.5 rounded-md transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing === s.id ? "animate-spin" : ""}`} strokeWidth={2} />
                  {refreshing === s.id ? "Triggering…" : "Scan now"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
