"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useOrg } from "@/lib/org-context";
import { supabase } from "@/lib/supabase";
import { Target, ArrowRight, AlertOctagon, Plug, FileWarning, ClipboardList, Beaker, RefreshCcw } from "lucide-react";

type LucideIcon = React.ComponentType<{ className?: string; strokeWidth?: number }>;

interface Action {
  id: string;
  priority: "critical" | "high" | "medium";
  Icon: LucideIcon;
  title: string;
  detail: string;
  href: string;
  cta: string;
}

const PRIORITY_RANK = { critical: 0, high: 1, medium: 2 } as const;
const PRIORITY_STYLE = {
  critical: { bg: "bg-[var(--color-danger-bg)]", text: "text-[var(--color-danger)]", label: "Critical" },
  high: { bg: "bg-[var(--color-warning-bg)]", text: "text-[var(--color-warning)]", label: "High" },
  medium: { bg: "bg-[var(--color-info-bg)]", text: "text-[var(--color-info)]", label: "Medium" },
} as const;

export default function NextBestActions() {
  const { org, controls, scanHistory } = useOrg();
  const [overduePbc, setOverduePbc] = useState(0);
  const [openPbc, setOpenPbc] = useState(0);

  useEffect(() => {
    if (!org?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("pbc_requests")
        .select("status, due_date")
        .eq("org_id", org.id);
      if (!data || cancelled) return;
      const now = Date.now();
      let overdue = 0;
      let open = 0;
      for (const r of data) {
        if (r.status !== "requested") continue;
        open++;
        if (r.due_date && new Date(r.due_date).getTime() < now) overdue++;
      }
      setOverduePbc(overdue);
      setOpenPbc(open);
    })();
    return () => { cancelled = true; };
  }, [org]);

  const actions: Action[] = useMemo(() => {
    const out: Action[] = [];
    const tech = (org?.tech_stack ?? {}) as Record<string, unknown>;

    // 1. Critical/high failing controls (top 1 each)
    const critFails = controls.filter(c => c.status === "non_compliant" && c.severity === "critical");
    const highFails = controls.filter(c => c.status === "non_compliant" && c.severity === "high");
    if (critFails.length > 0) {
      out.push({
        id: "crit-fails",
        priority: "critical",
        Icon: AlertOctagon,
        title: `${critFails.length} critical control${critFails.length === 1 ? "" : "s"} failing`,
        detail: `Including ${critFails[0].control_id} — ${critFails[0].title}`,
        href: "/dashboard/remediation",
        cta: "Open remediation",
      });
    }
    if (highFails.length > 0 && critFails.length === 0) {
      out.push({
        id: "high-fails",
        priority: "high",
        Icon: AlertOctagon,
        title: `${highFails.length} high-severity control${highFails.length === 1 ? "" : "s"} failing`,
        detail: `Start with ${highFails[0].control_id} — ${highFails[0].title}`,
        href: "/dashboard/remediation",
        cta: "Open remediation",
      });
    }

    // 2. Overdue PBC
    if (overduePbc > 0) {
      out.push({
        id: "overdue-pbc",
        priority: "high",
        Icon: ClipboardList,
        title: `${overduePbc} PBC request${overduePbc === 1 ? "" : "s"} overdue`,
        detail: "Auditor is waiting on evidence past its due date",
        href: "/dashboard/pbc",
        cta: "Review requests",
      });
    } else if (openPbc > 0) {
      out.push({
        id: "open-pbc",
        priority: "medium",
        Icon: ClipboardList,
        title: `${openPbc} open PBC request${openPbc === 1 ? "" : "s"}`,
        detail: "Provide evidence so the auditor can sign off",
        href: "/dashboard/pbc",
        cta: "Provide evidence",
      });
    }

    // 3. Stale scan (no scan in last 48h while integrations connected)
    const lastScanIso = scanHistory[0]?.created_at;
    const integrationsConnected = !!(tech.aws_role_arn || tech.github_token || tech.google_access_token || tech.slack_access_token);
    const stale = integrationsConnected && lastScanIso && Date.now() - new Date(lastScanIso).getTime() > 48 * 3600_000;
    if (stale) {
      out.push({
        id: "stale-scan",
        priority: "medium",
        Icon: RefreshCcw,
        title: "Last scan is over 48 hours old",
        detail: "Trigger a manual scan to refresh evidence",
        href: "/dashboard/monitoring",
        cta: "Scan now",
      });
    }

    // 4. Disconnected integrations (only nag if zero, otherwise it's noise)
    if (!integrationsConnected) {
      out.push({
        id: "no-integrations",
        priority: "high",
        Icon: Plug,
        title: "No integrations connected",
        detail: "Connect AWS or GitHub to start collecting evidence automatically",
        href: "/dashboard/settings",
        cta: "Connect first integration",
      });
    }

    // 5. In-sample controls without test attributes
    type SampleControl = (typeof controls)[number] & { test_attributes?: unknown };
    const inSample = controls.filter(c => (c as SampleControl).in_sample);
    const untested = inSample.filter(c => !(c as SampleControl).test_attributes);
    if (inSample.length > 0 && untested.length > 0) {
      out.push({
        id: "untested-sample",
        priority: "medium",
        Icon: Beaker,
        title: `${untested.length} sample control${untested.length === 1 ? "" : "s"} not tested yet`,
        detail: "Fill out test attributes (complete/accurate/authorized/timely)",
        href: "/dashboard/audit",
        cta: "Open audit workspace",
      });
    }

    // 6. No policies (CC2.x gap)
    // Skipped — needs policies query, kept widget light.

    return out
      .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
      .slice(0, 5);
  }, [controls, scanHistory, org, overduePbc, openPbc]);

  if (actions.length === 0) {
    return (
      <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-success-bg)] text-[var(--color-success)] flex items-center justify-center">
          <Target className="w-5 h-5" strokeWidth={1.8} />
        </div>
        <div>
          <div className="text-sm font-semibold text-[var(--color-foreground)]">You&apos;re on track</div>
          <div className="text-xs text-[var(--color-muted)] mt-0.5">No urgent actions. Keep monitoring drift and evidence freshness.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center gap-2">
        <Target className="w-4 h-4 text-[var(--color-foreground-subtle)]" strokeWidth={1.8} />
        <div className="text-sm font-semibold text-[var(--color-foreground)]">Next best actions</div>
        <div className="text-xs text-[var(--color-muted)]">· prioritized for today</div>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {actions.map(a => {
          const style = PRIORITY_STYLE[a.priority];
          return (
            <Link key={a.id} href={a.href} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--color-surface)] transition group">
              <div className={`w-9 h-9 rounded-lg ${style.bg} ${style.text} flex items-center justify-center flex-shrink-0`}>
                <a.Icon className="w-4 h-4" strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-[var(--color-foreground)]">{a.title}</span>
                  <span className={`text-[10px] font-semibold ${style.text} ${style.bg} px-1.5 py-0.5 rounded`}>{style.label}</span>
                </div>
                <div className="text-xs text-[var(--color-muted)] mt-0.5 truncate">{a.detail}</div>
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-[var(--color-foreground-subtle)] flex-shrink-0">
                {a.cta}
                <ArrowRight className="w-3.5 h-3.5 transition group-hover:translate-x-0.5" strokeWidth={1.8} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
