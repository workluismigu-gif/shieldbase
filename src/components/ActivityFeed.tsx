"use client";
import { useEffect, useState } from "react";
import { useOrg } from "@/lib/org-context";
import { supabase } from "@/lib/supabase";
import { Activity, GitBranch, Cloud, Webhook, Search, Zap } from "lucide-react";
import { Github } from "@/components/icons/GithubIcon";

type LucideIcon = React.ComponentType<{ className?: string; strokeWidth?: number }>;

interface FeedItem {
  id: string;
  kind: "scan" | "event" | "webhook";
  Icon: LucideIcon;
  title: string;
  detail: string;
  timestamp: string;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function iconForScan(scanType: string): LucideIcon {
  if (scanType === "github") return Github;
  if (scanType === "aws") return Cloud;
  return Search;
}

export default function ActivityFeed({ limit = 25 }: { limit?: number }) {
  const { org } = useOrg();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org?.id) return;
    let cancelled = false;

    async function load() {
      const [scansRes, eventsRes, webhooksRes] = await Promise.all([
        supabase
          .from("scan_results")
          .select("id, scan_type, created_at, summary, findings")
          .eq("org_id", org!.id)
          .order("created_at", { ascending: false })
          .limit(limit),
        supabase
          .from("activity_events")
          .select("id, type, title, detail, timestamp")
          .eq("org_id", org!.id)
          .order("timestamp", { ascending: false })
          .limit(limit),
        supabase
          .from("webhook_events")
          .select("id, provider, event_type, created_at")
          .eq("org_id", org!.id)
          .order("created_at", { ascending: false })
          .limit(limit),
      ]);

      const merged: FeedItem[] = [
        ...(scansRes.data ?? []).map(s => {
          const score = (s.summary as { score?: number } | undefined)?.score ?? 0;
          const findings = Array.isArray(s.findings) ? s.findings.length : 0;
          return {
            id: `scan-${s.id}`,
            kind: "scan" as const,
            Icon: iconForScan(s.scan_type),
            title: `${s.scan_type.replace("_", " ")} scan completed`,
            detail: `${findings} findings · ${score}% score`,
            timestamp: s.created_at,
          };
        }),
        ...(eventsRes.data ?? []).map(e => ({
          id: `event-${e.id}`,
          kind: "event" as const,
          Icon: e.type === "scan_triggered" ? Zap : Activity,
          title: e.title,
          detail: e.detail ?? "",
          timestamp: e.timestamp,
        })),
        ...(webhooksRes.data ?? []).map(w => ({
          id: `webhook-${w.id}`,
          kind: "webhook" as const,
          Icon: w.provider === "github" ? GitBranch : Webhook,
          title: `${w.provider} webhook: ${w.event_type}`,
          detail: "Real-time event received",
          timestamp: w.created_at,
        })),
      ]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

      if (!cancelled) {
        setItems(merged);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [org, limit]);

  if (loading) {
    return (
      <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-6">
        <div className="text-sm text-[var(--color-muted)]">Loading activity…</div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--color-border)]">
        <div className="text-sm font-semibold text-[var(--color-foreground)]">Activity feed</div>
        <div className="text-xs text-[var(--color-muted)] mt-0.5">Recent scans, webhooks, and automated checks</div>
      </div>
      {items.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <Activity className="w-8 h-8 text-[var(--color-muted)] mx-auto mb-2" strokeWidth={1.5} />
          <div className="text-sm text-[var(--color-muted)]">No activity yet. Connect an integration to start scanning.</div>
        </div>
      ) : (
        <div className="divide-y divide-[var(--color-border)]">
          {items.map(item => (
            <div key={item.id} className="px-5 py-3 flex items-start gap-3">
              <div className="w-7 h-7 rounded-md bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-foreground-subtle)] flex-shrink-0 mt-0.5">
                <item.Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-[var(--color-foreground)] capitalize">{item.title}</div>
                <div className="text-xs text-[var(--color-muted)] mt-0.5">{item.detail}</div>
              </div>
              <div className="text-[11px] text-[var(--color-muted)] flex-shrink-0 mt-1">{timeAgo(item.timestamp)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
