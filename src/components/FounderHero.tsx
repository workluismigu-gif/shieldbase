"use client";
import { useMemo } from "react";
import Link from "next/link";
import { useOrg } from "@/lib/org-context";
import { Compass, Sparkles, ArrowRight, CalendarCheck, Gavel } from "lucide-react";

// Founder-mode dashboard hero. Shown for owners who haven't flipped audit_mode_enabled.
// Gives the "here's where you are, here's the next step" framing Priya asked for.
export default function FounderHero() {
  const { org, role, tasks, controls, policies, lastScan } = useOrg();
  const auditModeOn = !!org?.audit_mode_enabled;
  const isOwner = role === "owner" || role === "admin";

  // Founder hero only renders for owners who haven't turned audit mode on.
  // Auditors get their own workspace; audit-mode owners get the full stack.
  if (!isOwner || auditModeOn) return null;

  const tech = (org?.tech_stack ?? {}) as Record<string, unknown>;
  const connected = {
    aws: !!tech.aws_role_arn,
    github: !!tech.github_token,
    google: !!tech.google_access_token,
    slack: !!tech.slack_access_token,
    azure: !!tech.azure_access_token || !!tech.azure_subscription_id,
  };
  const connectCount = Object.values(connected).filter(Boolean).length;

  const openTasks = tasks.filter(t => !t.completed);
  const totalTasks = tasks.length;
  const taskProgress = totalTasks > 0 ? Math.round(((totalTasks - openTasks.length) / totalTasks) * 100) : 0;

  const compliantCtrls = controls.filter(c => c.status === "compliant").length;
  const ctrlScore = controls.length > 0 ? Math.round((compliantCtrls / controls.length) * 100) : 0;

  // Blended readiness: weighted avg of connector breadth, task completion, control pass rate
  const readiness = useMemo(() => {
    const connectorWeight = Math.min(connectCount * 20, 100);     // each connector worth 20%, capped
    const taskWeight = taskProgress;
    const ctrlWeight = controls.length > 0 ? ctrlScore : 0;
    const parts = [connectorWeight, taskWeight, ctrlWeight].filter(v => v > 0 || controls.length > 0);
    if (parts.length === 0) return 0;
    return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
  }, [connectCount, taskProgress, ctrlScore, controls.length]);

  // State-aware checks for fallbacks
  const hasPolicies = policies.length > 0;
  const hasScope = !!((org?.scope_config ?? {}) as Record<string, unknown>).audit_period_start;

  // Failing controls sorted by severity (most impactful fix first)
  const failingControls = useMemo(() => {
    const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return controls
      .filter(c => c.status === "non_compliant" || c.status === "partial")
      .sort((a, b) => (sevOrder[a.severity] ?? 4) - (sevOrder[b.severity] ?? 4));
  }, [controls]);

  // Fastest wins — state-aware ladder: unconnected integrations → failing controls
  // → open checklist tasks → verified gaps (policies/scope/vendors). Never shows
  // something the user already did.
  const fastestWins = useMemo(() => {
    const wins: { title: string; href: string; impact: string }[] = [];

    // Layer 1: unconnected integrations
    if (!connected.aws) wins.push({ title: "Connect AWS", href: "/dashboard/settings", impact: "Unblocks ~30 automated controls" });
    if (!connected.github) wins.push({ title: "Connect GitHub", href: "/dashboard/settings", impact: "Code-review & branch-protection evidence" });
    if (!connected.google) wins.push({ title: "Connect Google Workspace", href: "/dashboard/settings", impact: "Identity, MFA, domain evidence" });
    if (!connected.slack) wins.push({ title: "Connect Slack", href: "/dashboard/settings", impact: "Workforce 2FA + guest channel checks" });
    if (!connected.azure) wins.push({ title: "Connect Azure", href: "/dashboard/settings", impact: "Cloud infrastructure evidence" });

    // Layer 2: failing controls — the most practical "fix this now" step
    for (const c of failingControls) {
      if (wins.length >= 3) break;
      const label = c.status === "non_compliant" ? "Failing" : "Partial";
      wins.push({
        title: `Fix ${c.control_id}: ${c.title.length > 50 ? c.title.slice(0, 47) + "…" : c.title}`,
        href: "/dashboard/controls",
        impact: `${label} · ${c.severity} severity · your auditor will test this`,
      });
    }

    // Layer 3: open checklist tasks
    for (const t of openTasks) {
      if (wins.length >= 3) break;
      wins.push({ title: t.task, href: "/dashboard/checklist", impact: t.phase ?? "Checklist task" });
    }

    // Layer 4: verified-state fallbacks (only if the thing is actually undone)
    if (wins.length < 3 && !hasPolicies) {
      wins.push({ title: "Upload your first policy", href: "/dashboard/policies", impact: "Documented policies anchor 8+ SOC 2 controls" });
    }
    if (wins.length < 3 && !hasScope) {
      wins.push({ title: "Define your audit scope", href: "/dashboard/scope", impact: "Scope narrows what your auditor tests" });
    }

    // Layer 5: if EVERYTHING is done, show the finish line
    if (wins.length === 0) {
      wins.push({ title: "Enable audit mode", href: "/dashboard/settings", impact: "You're ready — flip the toggle to invite your auditor" });
    }

    return wins.slice(0, 3);
  }, [connected, failingControls, openTasks, hasPolicies, hasScope]);

  const ready = readiness >= 80 && controls.length > 0 && connectCount >= 2;

  return (
    <div className="space-y-4">
      <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-6 relative overflow-hidden">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-info)] bg-[var(--color-info-bg)] px-2.5 py-1 rounded-md mb-3">
              <Compass className="w-3.5 h-3.5" strokeWidth={2} /> Getting SOC 2 ready
            </div>
            <h2 className="text-xl font-semibold text-[var(--color-foreground)]">
              {readiness < 30 && "Let's start your SOC 2 journey"}
              {readiness >= 30 && readiness < 60 && "You're building momentum"}
              {readiness >= 60 && readiness < 80 && "You're most of the way there"}
              {readiness >= 80 && "You're ready for an auditor"}
            </h2>
            <p className="text-sm text-[var(--color-muted)] mt-1">
              {readiness < 30 && "Connect your infrastructure and we'll pull audit-grade evidence automatically. A typical Type II readiness path is 3–6 months."}
              {readiness >= 30 && readiness < 60 && "Good progress. Keep closing the fastest wins below and your score will climb."}
              {readiness >= 60 && readiness < 80 && "A few more controls to close before you schedule fieldwork. The tile on the right shows what's left."}
              {readiness >= 80 && "Your evidence is substantial. Time to bring in an auditor to start Type II fieldwork."}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-5xl font-black tabular-nums text-[var(--color-foreground)]">{readiness}%</div>
            <div className="text-xs text-[var(--color-muted)] mt-1">Readiness score</div>
          </div>
        </div>
        <div className="w-full bg-[var(--color-surface-2)] rounded-full h-2 mt-5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              readiness >= 80 ? "bg-[var(--color-success)]" : readiness >= 60 ? "bg-[var(--color-info)]" : readiness >= 30 ? "bg-[var(--color-warning)]" : "bg-[var(--color-danger)]"
            }`}
            style={{ width: `${Math.max(readiness, 3)}%` }}
          />
        </div>
        {lastScan && <p className="text-xs text-[var(--color-muted)] mt-3">Last scan: {lastScan}</p>}
      </div>

      {fastestWins.length > 0 && (
        <div className="grid md:grid-cols-3 gap-3">
          {fastestWins.map((w, i) => (
            <Link key={i} href={w.href}
              className="bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] p-4 hover:border-[var(--color-foreground-subtle)] transition group">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-[var(--color-warning)]" strokeWidth={2} />
                <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Fastest win #{i + 1}</span>
              </div>
              <div className="text-sm font-semibold text-[var(--color-foreground)] mb-1">{w.title}</div>
              <div className="text-xs text-[var(--color-muted)] mb-2">{w.impact}</div>
              <div className="text-xs text-[var(--color-info)] font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                Take action <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className={`rounded-2xl border-2 p-5 transition-all ${
        ready
          ? "bg-[var(--color-success-bg)] border-[var(--color-success)]"
          : "bg-[var(--color-surface)] border-dashed border-[var(--color-border)] opacity-70"
      }`}>
        <div className="flex items-start gap-4 flex-wrap">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${ready ? "bg-[var(--color-success)] text-white" : "bg-[var(--color-surface-2)] text-[var(--color-muted)]"}`}>
            <CalendarCheck className="w-6 h-6" strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[var(--color-foreground)] mb-1">
              {ready ? "Ready to schedule your auditor" : "Ready-for-auditor CTA unlocks at 80%"}
            </div>
            <p className="text-sm text-[var(--color-muted)]">
              {ready
                ? "You've cleared readiness. Start Type II fieldwork — flip audit mode on in Settings to invite your audit firm and unlock the auditor workbench."
                : `You're at ${readiness}% — ${80 - readiness}% more and this unlocks. Keep closing the fastest wins above.`}
            </p>
          </div>
          {ready ? (
            <Link href="/dashboard/settings"
              className="inline-flex items-center gap-2 bg-[var(--color-foreground)] text-[var(--color-surface)] hover:opacity-90 text-sm font-medium px-4 py-2 rounded-lg flex-shrink-0">
              <Gavel className="w-4 h-4" /> Enable audit mode
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
