"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useOrg, type ControlRow, type RawFinding, type TimelineEvent, type TaskRow, type PolicyRow } from "@/lib/org-context";
import {
  Shield, Eye, Lock, HardDrive, GitBranch, Gauge, AlertTriangle, Circle,
  GitPullRequest, Search, FolderTree, Building2, Cloud, ChevronDown, ChevronUp,
  PlugZap, ListChecks, CheckCircle2
} from "lucide-react";
import { Github } from "@/components/icons/GithubIcon";

type LucideIcon = React.ComponentType<{ className?: string; strokeWidth?: number }>;

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#22c55e" : score >= 50 ? "#3b82f6" : "#ef4444";
  return (
    <div className="relative w-36 h-36">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle cx="60" cy="60" r="54" fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-[var(--color-foreground)]">{score}%</span>
        <span className="text-xs text-[var(--color-muted)]">Ready</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color = "text-[var(--color-foreground)]" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] p-5">
      <div className="text-xs text-[var(--color-muted)] font-medium mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-[var(--color-muted)] mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── SCAN CATEGORY MAPS ─────────────────────────────────────────────────────

const AWS_CATS: Record<string, { label: string; Icon: LucideIcon; desc: string; controls: string[] }> = {
  CC6: { label: "Access Controls", Icon: Lock, desc: "IAM, MFA, public exposure", controls: ["CC6","CC.6"] },
  CC7: { label: "Monitoring", Icon: Eye, desc: "CloudTrail, GuardDuty, logs", controls: ["CC7","CC.7"] },
  C1:  { label: "Encryption", Icon: Shield, desc: "S3, RDS, EBS, KMS", controls: ["C1","CC.C.1"] },
  A1:  { label: "Availability", Icon: HardDrive, desc: "Backups, recovery, uptime", controls: ["A1","CC.A.1"] },
  CC8: { label: "Change Mgmt", Icon: GitBranch, desc: "Infra change pipelines", controls: ["CC8","CC.8"] },
  PI1: { label: "Processing", Icon: Gauge, desc: "Audit logging, data integrity", controls: ["PI1","PI.1"] },
  CC3: { label: "Risk Assessment", Icon: AlertTriangle, desc: "AWS Config, drift detection", controls: ["CC3","CC.3"] },
  OTHER: { label: "Other", Icon: Circle, desc: "Additional checks", controls: [] },
};

const GITHUB_CATS: Record<string, { label: string; Icon: LucideIcon; desc: string; checks: string[] }> = {
  branch: { label: "Branch Protection", Icon: GitPullRequest, desc: "Force push, deletion, PRs", checks: ["repository_default_branch"] },
  scanning: { label: "Secret Scanning", Icon: Search, desc: "Secrets, Dependabot", checks: ["repository_secret","repository_dependency"] },
  hygiene: { label: "Repo Hygiene", Icon: FolderTree, desc: "Signed commits, SECURITY.md", checks: ["repository_branch_delete","repository_default_branch_requires_signed","repository_public_has_securitymd","repository_inactive","repository_immutable"] },
  org: { label: "Org Security", Icon: Building2, desc: "Verified badge, org settings", checks: ["organization"] },
};

function getAwsCat(controlId: string) {
  const id = controlId.toUpperCase();
  for (const [key, cat] of Object.entries(AWS_CATS)) {
    if (key === "OTHER") continue;
    if (cat.controls.some(p => id.startsWith(p.toUpperCase()))) return key;
  }
  return "OTHER";
}

function getGithubCat(checkId: string) {
  for (const [key, cat] of Object.entries(GITHUB_CATS)) {
    if (cat.checks.some(p => checkId.startsWith(p))) return key;
  }
  return "branch";
}

function QuestCard({ Icon, label, desc, passing, total, allPass, children }: {
  Icon: LucideIcon; label: string; desc: string;
  passing: number; total: number; allPass: boolean;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pct = total > 0 ? Math.round((passing / total) * 100) : 0;
  const failing = total - passing;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] overflow-hidden transition-all">
      <button onClick={() => setOpen(!open)} className="w-full p-4 flex items-center gap-3 text-left hover:bg-[var(--color-surface)] transition">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          allPass ? "bg-[var(--color-success-bg)] text-[var(--color-success)]"
                  : failing > 0 ? "bg-[var(--color-danger-bg)] text-[var(--color-danger)]"
                  : "bg-[var(--color-warning-bg)] text-[var(--color-warning)]"
        }`}>
          <Icon className="w-[18px] h-[18px]" strokeWidth={1.6} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-[var(--color-foreground)]">{label}</span>
            {allPass
              ? <span className="inline-flex items-center gap-1 text-[10px] text-[var(--color-success)] bg-[var(--color-success-bg)] px-1.5 py-0.5 rounded font-medium">Cleared</span>
              : <span className="inline-flex items-center text-[10px] text-[var(--color-danger)] bg-[var(--color-danger-bg)] px-1.5 py-0.5 rounded font-medium">{failing} open</span>}
          </div>
          <div className="text-xs text-[var(--color-muted)] mt-0.5">{desc}</div>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 bg-[var(--color-surface-2)] rounded-full h-1 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${
                allPass ? "bg-[var(--color-success)]" : failing > 0 ? "bg-[var(--color-danger)]" : "bg-[var(--color-warning)]"
              }`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] font-semibold text-[var(--color-muted)] flex-shrink-0 tabular-nums">{pct}%</span>
          </div>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-[var(--color-muted)] flex-shrink-0" strokeWidth={1.8} />
          : <ChevronDown className="w-4 h-4 text-[var(--color-muted)] flex-shrink-0" strokeWidth={1.8} />}
      </button>
      {open && <div className="border-t border-[var(--color-border)]">{children}</div>}
    </div>
  );
}

const sevBadge: Record<string, string> = {
  critical: "bg-red-600 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-400 text-[var(--color-foreground)]",
  low: "bg-blue-400 text-white",
};

function ScanResultsTabs({
  controls, githubFindings, hasRealData, hasGithubData, awsConnected, githubConnected
}: {
  controls: ControlRow[];
  githubFindings: RawFinding[];
  hasRealData: boolean;
  hasGithubData: boolean;
  awsConnected: boolean;
  githubConnected: boolean;
}) {
  const [tab, setTab] = useState<"aws" | "github">("aws");

  const awsFailing = controls.filter(c => c.status === "non_compliant").length;
  const ghFailing = githubFindings.filter(f => (f.status_code || f.status) === "FAIL").length;

  // Group AWS controls by category
  const awsGrouped: Record<string, ControlRow[]> = {};
  for (const ctrl of controls) {
    const key = getAwsCat(ctrl.control_id);
    if (!awsGrouped[key]) awsGrouped[key] = [];
    awsGrouped[key].push(ctrl);
  }
  const awsKeys = Object.keys(awsGrouped).sort((a, b) => {
    const af = awsGrouped[a].filter(c => c.status === "non_compliant").length;
    const bf = awsGrouped[b].filter(c => c.status === "non_compliant").length;
    return bf - af;
  });

  // Group GitHub findings by category
  const ghGrouped: Record<string, RawFinding[]> = {};
  for (const f of githubFindings) {
    const key = getGithubCat(f.metadata?.event_code || f.check_id || "");
    if (!ghGrouped[key]) ghGrouped[key] = [];
    ghGrouped[key].push(f);
  }

  return (
    <div className="bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] overflow-hidden">
      {/* Tab Header */}
      <div className="flex border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <button onClick={() => setTab("aws")}
          className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition border-b-2 ${
            tab === "aws" ? "border-[var(--color-warning)] text-[var(--color-warning)] bg-[var(--color-bg)]" : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-foreground-subtle)]"
          }`}>
          <Cloud className="w-4 h-4" strokeWidth={1.8} /> AWS
          {hasRealData && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              awsFailing > 0 ? "bg-[var(--color-danger-bg)] text-[var(--color-danger)]" : "bg-[var(--color-success-bg)] text-[var(--color-success)]"
            }`}>
              {awsFailing > 0 ? `${awsFailing} ` : "✓"}
            </span>
          )}
        </button>
        <button onClick={() => setTab("github")}
          className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition border-b-2 ${
            tab === "github" ? "border-[var(--color-foreground)] text-[var(--color-foreground)] bg-[var(--color-bg)]" : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-foreground-subtle)]"
          }`}>
          <Github className="w-4 h-4" strokeWidth={1.8} /> GitHub
          {hasGithubData && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              ghFailing > 0 ? "bg-[var(--color-danger-bg)] text-[var(--color-danger)]" : "bg-[var(--color-success-bg)] text-[var(--color-success)]"
            }`}>
              {ghFailing > 0 ? `${ghFailing} ` : "✓"}
            </span>
          )}
        </button>
        <div className="flex-1" />
        <a href="/dashboard/monitoring" className="self-center mr-4 text-xs text-[var(--color-info)] font-medium hover:underline">
          Full report →
        </a>
      </div>

      {/* AWS Tab */}
      {tab === "aws" && (
        <div className="p-5">
          {!awsConnected ? (
            <div className="text-center py-10">
              <Cloud className="w-10 h-10 text-[var(--color-muted)] mx-auto mb-3" strokeWidth={1.4} />
              <p className="text-[var(--color-muted)] text-sm mb-4">Connect AWS to start scanning your infrastructure</p>
              <a href="/dashboard/settings" className="inline-flex items-center gap-2 bg-[var(--color-foreground)] text-[var(--color-surface)] px-5 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition">Connect AWS</a>
            </div>
          ) : !hasRealData ? (
            <div className="text-center py-10">
              <Search className="w-10 h-10 text-[var(--color-muted)] mx-auto mb-3 animate-pulse" strokeWidth={1.4} />
              <p className="text-[var(--color-muted)] text-sm">Scan in progress — results will appear here shortly</p>
            </div>
          ) : (
            <>
              {/* XP bar */}
              <div className="mb-5 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 flex items-center gap-4">
                <div className="text-3xl font-black text-[var(--color-warning)]">{Math.round((controls.filter(c=>c.status==="compliant").length/controls.length)*100)}%</div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-[var(--color-muted)] mb-1">
                    <span className="font-semibold text-[var(--color-foreground-subtle)]">SOC 2 Compliance Score</span>
                    <span>{controls.filter(c=>c.status==="compliant").length}/{controls.length} checks passing</span>
                  </div>
                  <div className="w-full bg-orange-100 rounded-full h-3 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-400 to-green-500 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.round((controls.filter(c=>c.status==="compliant").length/controls.length)*100)}%` }} />
                  </div>
                </div>
                {awsFailing > 0 && <div className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg font-bold"> {awsFailing} to fix</div>}
              </div>
              <div className="space-y-3">
                {awsKeys.map(key => {
                  const cat = AWS_CATS[key];
                  const group = awsGrouped[key];
                  const passing = group.filter(c => c.status === "compliant").length;
                  const allPass = group.every(c => c.status === "compliant");
                  return (
                    <QuestCard key={key} Icon={cat.Icon} label={cat.label} desc={cat.desc}
                      passing={passing} total={group.length} allPass={allPass}>
                      <div className="divide-y divide-[var(--color-border)]">
                        {group.map(ctrl => (
                          <div key={ctrl.control_id} className={`flex items-center gap-3 px-4 py-2.5 ${
                            ctrl.status === "non_compliant" ? "bg-[var(--color-danger-bg)]/60" : ""
                          }`}>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                              ctrl.status === "compliant" ? "bg-green-500" : ctrl.status === "non_compliant" ? "bg-red-500" : "bg-yellow-400"
                            }`}>
                              {ctrl.status === "compliant" ? "✓" : ctrl.status === "non_compliant" ? "✗" : "!"}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-[var(--color-foreground-subtle)] truncate">{ctrl.title}</div>
                              <div className="text-xs text-[var(--color-muted)]">{ctrl.control_id}</div>
                            </div>
                            {ctrl.severity && ctrl.status === "non_compliant" && (
                              <span className={`text-xs px-1.5 py-0.5 rounded font-bold capitalize flex-shrink-0 ${sevBadge[ctrl.severity] || "bg-[var(--color-border)] text-[var(--color-foreground-subtle)]"}`}>
                                {ctrl.severity}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </QuestCard>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* GitHub Tab */}
      {tab === "github" && (
        <div className="p-5">
          {!githubConnected ? (
            <div className="text-center py-10">
              <Github className="w-10 h-10 text-[var(--color-muted)] mx-auto mb-3" strokeWidth={1.4} />
              <p className="text-[var(--color-muted)] text-sm mb-4">Connect GitHub to monitor your repos</p>
              <a href="/dashboard/settings" className="inline-flex items-center gap-2 bg-[var(--color-foreground)] text-[var(--color-surface)] px-5 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition">Connect GitHub</a>
            </div>
          ) : !hasGithubData ? (
            <div className="text-center py-10">
              <Search className="w-10 h-10 text-[var(--color-muted)] mx-auto mb-3 animate-pulse" strokeWidth={1.4} />
              <p className="text-[var(--color-muted)] text-sm">Scan in progress — results will appear here shortly</p>
            </div>
          ) : (
            <>
              {/* XP bar */}
              <div className="mb-5 bg-gradient-to-r from-gray-900 to-gray-700 rounded-xl p-4 flex items-center gap-4">
                <div className="text-3xl font-black text-white">{Math.round((githubFindings.filter(f=>(f.status_code||f.status)==="PASS").length/githubFindings.length)*100)}%</div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-[var(--color-muted)] mb-1">
                    <span className="font-semibold text-white">GitHub Security Score</span>
                    <span>{githubFindings.filter(f=>(f.status_code||f.status)==="PASS").length}/{githubFindings.length} checks passing</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-3 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-400 to-blue-400 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.round((githubFindings.filter(f=>(f.status_code||f.status)==="PASS").length/githubFindings.length)*100)}%` }} />
                  </div>
                </div>
                {ghFailing > 0 && <div className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg font-bold"> {ghFailing} to fix</div>}
              </div>
              <div className="space-y-3">
                {Object.entries(GITHUB_CATS).map(([key, cat]) => {
                  const group = ghGrouped[key] ?? [];
                  if (group.length === 0) return null;
                  const passing = group.filter(f => (f.status_code || f.status) === "PASS").length;
                  const allPass = group.every(f => (f.status_code || f.status) === "PASS");
                  return (
                    <QuestCard key={key} Icon={cat.Icon} label={cat.label} desc={cat.desc}
                      passing={passing} total={group.length} allPass={allPass}>
                      <div className="divide-y divide-[var(--color-border)]">
                        {group.map((f, i) => {
                          const pass = (f.status_code || f.status) === "PASS";
                          return (
                            <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${!pass ? "bg-[var(--color-danger-bg)]/60" : ""}`}>
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${pass ? "bg-green-500" : "bg-red-500"}`}>
                                {pass ? "✓" : "✗"}
                              </span>
                              <div className="text-xs font-medium text-[var(--color-foreground-subtle)] flex-1 min-w-0 truncate">
                                {f.finding_info?.title || f.metadata?.event_code || f.check_id || "Check"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </QuestCard>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CLI ACTIVITY TERMINAL ─────────────────────────────────────────────────────────

interface CliLine {
  id: string;
  ts: string;
  level: "info" | "success" | "warn" | "error" | "system";
  prefix: string;
  msg: string;
}

function toCliLines(events: TimelineEvent[]): CliLine[] {
  return events.map(e => {
    const ts = new Date(e.timestamp).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const date = new Date(e.timestamp).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" });
    let level: CliLine["level"] = "info";
    let prefix = "[SYS]";
    if (e.type === "scan") {
      const isGh = e.title.toLowerCase().includes("github");
      prefix = isGh ? "[GH] " : "[AWS]";
      if (e.title.toLowerCase().includes("initiated") || e.title.toLowerCase().includes("auto-scan")) level = "warn";
      else level = "success";
    }
    if (e.type === "integration") { level = "system"; prefix = "[INT]"; }
    if (e.type === "control_change") {
      prefix = "[CTL]";
      const t = e.title.toLowerCase();
      if (t.includes("approved") || t.includes("compliant")) level = "success";
      else if (t.includes("non_compliant") || t.includes("failed")) level = "error";
      else level = "warn";
    }
    if (e.detail?.toLowerCase().includes("fail") || e.detail?.toLowerCase().includes("error") || e.title.toLowerCase().includes("error")) level = "error";
    return { id: e.id, ts: `${date} ${ts}`, level, prefix, msg: `${e.title}${e.detail ? ` — ${e.detail}` : ""}` };
  });
}

const CLI_COLORS: Record<CliLine["level"], string> = {
  info:    "text-[var(--color-muted)]",
  success: "text-green-400",
  warn:    "text-yellow-400",
  error:   "text-[var(--color-danger)]",
  system:  "text-blue-400",
};

const CLI_PREFIX_COLORS: Record<CliLine["level"], string> = {
  info:    "text-[var(--color-muted)]",
  success: "text-[var(--color-success)]",
  warn:    "text-yellow-500",
  error:   "text-[var(--color-danger)]",
  system:  "text-[var(--color-info)]",
};

function useGithubAutoPoll(
  orgId: string | undefined,
  pushActivityEvent: (e: Omit<TimelineEvent, "id">) => void,
  intervalMs = 15 * 60 * 1000
) {
  const trigger = useCallback(async () => {
    if (!orgId) return;
    const ts = new Date().toISOString();
    pushActivityEvent({ type: "scan", title: "GitHub auto-scan initiated", detail: "Scheduled 15-min poll", timestamp: ts });
    try {
      const res = await fetch("/api/scan/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer shieldbase-internal-2026" },
        body: JSON.stringify({ org_id: orgId, provider: "github" }),
      });
      if (!res.ok) {
        pushActivityEvent({ type: "scan", title: "GitHub auto-scan error", detail: "Trigger failed", timestamp: new Date().toISOString() });
      }
    } catch {
      pushActivityEvent({ type: "scan", title: "GitHub auto-scan error", detail: "Network error", timestamp: new Date().toISOString() });
    }
  }, [orgId, pushActivityEvent]);

  useEffect(() => {
    if (!orgId) return;
    const id = setInterval(trigger, intervalMs);
    return () => clearInterval(id);
  }, [orgId, intervalMs, trigger]);
}

function ActivityTerminal({ timeline, orgId }: { timeline: TimelineEvent[]; orgId?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { pushActivityEvent } = useOrg();

  // Server-side cron handles polling — no client-side trigger needed
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [timeline]);

  const lines = toCliLines([...timeline].reverse().slice(0, 50));

  return (
    <div className="rounded-xl overflow-hidden border border-gray-800 shadow-xl">
      {/* Title bar */}
      <div className="bg-[var(--color-foreground)] px-4 py-2.5 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-[var(--color-muted)] font-mono text-xs">#</span>
          <span className="text-[var(--color-muted)] font-mono text-xs font-semibold">activity-monitor</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-[var(--color-success)] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" /> LIVE
          </span>
          <span className="text-xs text-[var(--color-muted)] font-mono">gh↓ 15m</span>
        </div>
      </div>

      {/* Log body */}
      <div ref={scrollRef} className="bg-gray-950 p-4 h-64 overflow-y-auto font-mono text-xs space-y-1 scroll-smooth">
        <div className="text-[var(--color-muted)] mb-2">--- #activity-monitor | read-only | {lines.length} events ---</div>
        {lines.length === 0 ? (
          <div className="text-[var(--color-muted)]">No activity yet. Connect an integration to start scanning.</div>
        ) : lines.map(line => (
          <div key={line.id} className="flex items-start gap-2 leading-relaxed">
            <span className="text-[var(--color-muted)] flex-shrink-0 tabular-nums">{line.ts}</span>
            <span className={`flex-shrink-0 font-bold ${CLI_PREFIX_COLORS[line.level]}`}>{line.prefix}</span>
            <span className={CLI_COLORS[line.level]}>{line.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const priorityColor = { critical: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]", high: "bg-orange-100 text-[var(--color-warning)]", medium: "bg-yellow-100 text-[var(--color-warning)]", low: "bg-[var(--color-info-bg)] text-[var(--color-info)]" };
const statusColor = { todo: "bg-[var(--color-surface-2)] text-[var(--color-muted)]", in_progress: "bg-[var(--color-info-bg)] text-[var(--color-info)]", done: "bg-[var(--color-success-bg)] text-[var(--color-success)]" };
const statusLabel = { todo: "To Do", in_progress: "In Progress", done: "Done" };
const policyStatusColor = { draft: "bg-yellow-100 text-[var(--color-warning)]", review: "bg-[var(--color-info-bg)] text-[var(--color-info)]", approved: "bg-[var(--color-success-bg)] text-[var(--color-success)]", needs_update: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]" };

export default function DashboardPage() {
  const { org, loading, controls, lastScan, scanHistory, timeline, tasks: realTasks, policies: realPolicies, realtimeConnected, githubFindings, role } = useOrg();

  // Auditors land here by default but the founder dashboard isn't framed
  // for them — send them to the audit workspace instead.
  useEffect(() => {
    if (!loading && role === "auditor_readonly") {
      window.location.replace("/dashboard/audit");
    }
  }, [loading, role]);

  // Only use real data — no fallback to mock for fresh orgs
  const activeTasks = realTasks.length > 0
    ? realTasks.filter(t => !t.completed).slice(0, 6).map(t => {
        let priority: "critical" | "high" | "medium" = "medium";
        if (t.description?.toLowerCase().includes("critical")) priority = "critical";
        else if (t.description?.toLowerCase().includes("high")) priority = "high";
        return {
          id: t.id, title: t.task, category: t.phase,
          priority, status: "todo" as const, due: "",
        };
      })
    : []; // Empty for fresh orgs

  const displayPolicies = realPolicies.length > 0
    ? realPolicies.slice(0, 6).map(p => ({
        id: p.id, title: p.title, status: p.status,
        updated: new Date(p.updated_at).toLocaleDateString(),
      }))
    : []; // Empty for fresh orgs

  const orgName = org?.name ?? "Your Organization";
  const techStack = (org?.tech_stack ?? {}) as Record<string, string>;
  const awsConnected = !!techStack.aws_role_arn;
  const githubConnected = !!techStack.github_token;
  const hasRealData = controls.length > 0;

  const realCompliant = controls.filter(c => c.status === "compliant").length;
  const realNonCompliant = controls.filter(c => c.status === "non_compliant").length;
  const realTotal = controls.length;

  const doneTasks = realTasks.length > 0 ? realTasks.filter(t => t.completed).length : 0;
  const totalTaskCount = realTasks.length;
  const inProgressTasks = 0; // Real data doesn't track in-progress separately

  const githubScans = scanHistory.filter(s => s.scan_type === "github");
  const githubCompliant = githubScans.length > 0 ? (githubScans[0].summary?.compliant ?? 0) : 0;
  const githubTotal = githubScans.length > 0 ? (githubScans[0].summary?.total ?? 0) : 0;
  const githubPct = githubTotal > 0 ? Math.round((githubCompliant / githubTotal) * 100) : 0;
  const hasGithubData = githubTotal > 0;

  // Combined score across all connected integrations + manual tasks
  const awsScore = hasRealData ? Math.round((realCompliant / realTotal) * 100) : null;
  const githubScore = hasGithubData ? githubPct : null;
  const manualScore = totalTaskCount > 0 ? Math.round((doneTasks / totalTaskCount) * 100) : null;

  const scores = [awsScore, githubScore, manualScore].filter(s => s !== null) as number[];
  // Weighted by check count so Overall matches what users expect from Automated + Manual:
  // (AWS pass + GitHub pass + tasks done) / (AWS total + GitHub total + task total)
  const totalPassing = (hasRealData ? realCompliant : 0) + (hasGithubData ? githubCompliant : 0) + doneTasks;
  const totalItems = (hasRealData ? realTotal : 0) + (hasGithubData ? githubTotal : 0) + totalTaskCount;
  const combinedScore = totalItems > 0 ? Math.round((totalPassing / totalItems) * 100) : 0;
  const score = combinedScore;
  const connectedIntegrations = [awsConnected, githubConnected].filter(Boolean).length;
  // Evidence: count controls with evidence (compliant = evidence exists)
  const totalEvidence = hasRealData ? realTotal : 0;
  const collectedEvidence = hasRealData ? realCompliant : 0;
  const approvedPolicies = realPolicies.length > 0 ? realPolicies.filter(p => p.status === "approved").length : 0;
  const totalPolicies = realPolicies.length > 0 ? realPolicies.length : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">SOC 2 Compliance Dashboard</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            {scores.length > 0
              ? `${totalPassing}/${totalItems} checks passing${lastScan ? ` • Last scanned: ${lastScan}` : ""}`
              : "Track your progress toward SOC 2 Type I certification"}
          </p>
        </div>
        {connectedIntegrations > 0 && (
          <div className="flex items-center gap-2 text-xs bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)] px-3 py-2 rounded-lg font-medium">
            {realtimeConnected ? (
              <><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" /> Live</>
            ) : ""} {connectedIntegrations} integration{connectedIntegrations > 1 ? "s" : ""} connected
          </div>
        )}
      </div>

      {/* Two-track progress */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Track 1: Automated */}
        <div className="bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-foreground-subtle)]">
                <PlugZap className="w-4 h-4" strokeWidth={1.8} />
              </div>
              <div>
                <div className="text-sm font-semibold text-[var(--color-foreground)]">Automated Checks</div>
                <div className="text-xs text-[var(--color-muted)]">Prowler security scans</div>
              </div>
            </div>
            {realtimeConnected && (
              <span className="flex items-center gap-1 text-xs text-[var(--color-success)] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                Live
              </span>
            )}
          </div>

          {/* Per-provider breakdown */}
          <div className="space-y-2 mb-3">
            {awsConnected && (
              <div className="flex items-center gap-2">
                <Cloud className="w-3.5 h-3.5 text-[var(--color-muted)]" strokeWidth={1.8} />
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-[var(--color-muted)]">AWS</span>
                    <span className="text-[var(--color-muted)]">{hasRealData ? `${realCompliant}/${realTotal}` : "pending"}</span>
                  </div>
                  <div className="w-full bg-[var(--color-surface-2)] rounded-full h-1.5">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${hasRealData ? Math.round((realCompliant / realTotal) * 100) : 0}%` }} />
                  </div>
                </div>
                <span className="text-xs font-bold text-[var(--color-foreground-subtle)] w-8 text-right">{hasRealData ? Math.round((realCompliant / realTotal) * 100) : 0}%</span>
              </div>
            )}
            {githubConnected && (
              <div className="flex items-center gap-2">
                <Github className="w-3.5 h-3.5 text-[var(--color-muted)]" strokeWidth={1.8} />
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-[var(--color-muted)]">GitHub</span>
                    <span className="text-[var(--color-muted)]">{hasGithubData ? `${githubCompliant}/${githubTotal}` : "pending..."}</span>
                  </div>
                  <div className="w-full bg-[var(--color-surface-2)] rounded-full h-1.5">
                    <div className={`h-full rounded-full transition-all duration-700 ${hasGithubData ? "bg-purple-500" : "bg-purple-300 animate-pulse"}`}
                      style={{ width: hasGithubData ? `${githubPct}%` : "30%" }} />
                  </div>
                </div>
                {hasGithubData && <span className="text-xs font-bold text-[var(--color-foreground-subtle)] w-8 text-right">{githubPct}%</span>}
              </div>
            )}
          </div>

          {(() => {
            const autoScores = [awsScore, githubScore].filter(s => s !== null) as number[];
            const autoAvg = autoScores.length > 0 ? Math.round(autoScores.reduce((a,b)=>a+b,0)/autoScores.length) : 0;
            const totalChecks = (hasRealData ? realTotal : 0) + (hasGithubData ? githubTotal : 0);
            const totalPass = (hasRealData ? realCompliant : 0) + (hasGithubData ? githubCompliant : 0);
            const totalFail = (hasRealData ? realNonCompliant : 0) + (hasGithubData ? githubTotal - githubCompliant : 0);
            return (
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black text-[var(--color-foreground)]">{autoAvg}%</span>
                  <span className="text-xs text-[var(--color-muted)]">{totalChecks > 0 ? `${totalPass}/${totalChecks} passing` : "No scan yet"}</span>
                </div>
                {totalFail > 0 && <div className="mt-1 text-xs text-[var(--color-danger)] font-medium">{totalFail} failing — needs attention</div>}
              </div>
            );
          })()}
        </div>

        {/* Track 2: Manual Evidence */}
        <a href="/dashboard/checklist" className="bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] p-5 hover:border-[var(--color-border-strong)] transition block">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-foreground-subtle)]">
              <ListChecks className="w-4 h-4" strokeWidth={1.8} />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--color-foreground)]">Manual Evidence</div>
              <div className="text-xs text-[var(--color-muted)]">Policies, training, procedures</div>
            </div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl font-black text-[var(--color-foreground)]">{totalTaskCount > 0 ? Math.round((doneTasks / totalTaskCount) * 100) : 0}%</span>
            <span className="text-xs text-[var(--color-muted)]">{doneTasks}/{totalTaskCount} complete</span>
          </div>
          <div className="w-full bg-[var(--color-surface-2)] rounded-full h-2 overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-700 rounded-full" style={{ width: `${totalTaskCount > 0 ? Math.round((doneTasks / totalTaskCount) * 100) : 0}%` }} />
          </div>
          <div className="mt-2 text-xs text-[var(--color-info)] font-medium">View roadmap →</div>
        </a>
      </div>

      {/* Integrations bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-[var(--color-muted)] font-medium">Connected:</span>
        {awsConnected ? (
          <a href="/dashboard/monitoring" className="inline-flex items-center gap-1.5 text-xs bg-[var(--color-surface-2)] text-[var(--color-foreground-subtle)] border border-[var(--color-border)] px-2.5 py-1 rounded-md font-medium hover:border-[var(--color-border-strong)] transition">
            <Cloud className="w-3.5 h-3.5" strokeWidth={1.8} /> AWS
            <span className={`w-1.5 h-1.5 rounded-full ${hasRealData ? "bg-[var(--color-success)] animate-pulse" : "bg-[var(--color-warning)]"}`} />
          </a>
        ) : (
          <a href="/dashboard/settings" className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted)] border border-dashed border-[var(--color-border-strong)] px-2.5 py-1 rounded-md hover:text-[var(--color-foreground)] transition">
            <Cloud className="w-3.5 h-3.5" strokeWidth={1.8} /> Connect AWS
          </a>
        )}
        {githubConnected ? (
          <a href="/dashboard/monitoring?provider=github" className="inline-flex items-center gap-1.5 text-xs bg-[var(--color-surface-2)] text-[var(--color-foreground-subtle)] border border-[var(--color-border)] px-2.5 py-1 rounded-md font-medium hover:border-[var(--color-border-strong)] transition">
            <Github className="w-3.5 h-3.5" strokeWidth={1.8} /> GitHub
            <span className={`w-1.5 h-1.5 rounded-full ${hasGithubData ? "bg-[var(--color-success)] animate-pulse" : "bg-[var(--color-warning)]"}`} />
          </a>
        ) : (
          <a href="/dashboard/settings" className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted)] border border-dashed border-[var(--color-border-strong)] px-2.5 py-1 rounded-md hover:text-[var(--color-foreground)] transition">
            <Github className="w-3.5 h-3.5" strokeWidth={1.8} /> Connect GitHub
          </a>
        )}
      </div>

      {/* Score + Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="md:col-span-1 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] p-6 flex flex-col items-center justify-center">
          {loading ? (
            <div className="w-36 h-36 rounded-full border-8 border-[var(--color-border)] flex items-center justify-center">
              <span className="text-[var(--color-muted)] text-sm">Loading...</span>
            </div>
          ) : (
            <ScoreRing score={score} />
          )}
          <div className="mt-3 text-sm font-medium text-[var(--color-muted)]">Overall Readiness</div>
          {scores.length > 1 && (
            <div className="mt-2 text-xs text-[var(--color-muted)] text-center space-y-1">
              {awsScore !== null && <div className="inline-flex items-center gap-1.5 justify-center"><Cloud className="w-3 h-3" strokeWidth={1.8} /> AWS: {awsScore}%</div>}
              {githubScore !== null && <div className="inline-flex items-center gap-1.5 justify-center"><Github className="w-3 h-3" strokeWidth={1.8} /> GitHub: {githubScore}%</div>}
              {manualScore !== null && <div className="inline-flex items-center gap-1.5 justify-center"><ListChecks className="w-3 h-3" strokeWidth={1.8} /> Tasks: {manualScore}%</div>}
            </div>
          )}
        </div>
        <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="AWS Controls"
            value={hasRealData ? `${realCompliant}/${realTotal}` : "—"}
            sub={hasRealData ? `${realNonCompliant} failing` : "No scan yet"}
            color={hasRealData && realNonCompliant > 0 ? "text-[var(--color-warning)]" : "text-[var(--color-success)]"}
          />
          <StatCard label="Policies" value={totalPolicies > 0 ? `${approvedPolicies}/${totalPolicies}` : "—"} sub={totalPolicies > 0 ? `${totalPolicies - approvedPolicies} to review` : "No policies yet"} color="text-[var(--color-info)]" />
          <StatCard label="Tasks Completed" value={`${doneTasks}/${totalTaskCount}`} sub={`${inProgressTasks} in progress`} color="text-[var(--color-warning)]" />
        </div>
      </div>

      {/* Gamified Scan Results Tabs */}
      <ScanResultsTabs
        controls={controls}
        githubFindings={githubFindings}
        hasRealData={hasRealData}
        hasGithubData={hasGithubData}
        awsConnected={awsConnected}
        githubConnected={githubConnected}
      />

      {/* Tasks + Policies */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Active Tasks</h2>
            <a href="/dashboard/remediation" className="text-xs text-[var(--color-info)] font-medium hover:underline">View all →</a>
          </div>
          <div className="space-y-2">
            {activeTasks.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)] text-center py-4">{totalTaskCount === 0 ? "No tasks yet — connect integrations to get started" : "All tasks complete "}</p>
            ) : activeTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--color-surface)] transition">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.priority === "critical" ? "bg-red-500" : task.priority === "high" ? "bg-orange-500" : "bg-yellow-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--color-foreground-subtle)] truncate">{task.title}</div>
                  <div className="text-xs text-[var(--color-muted)]">{task.category} · Due {task.due}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColor[task.status as keyof typeof statusColor]}`}>
                  {statusLabel[task.status as keyof typeof statusLabel]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Policies</h2>
            <a href="/dashboard/policies" className="text-xs text-[var(--color-info)] font-medium hover:underline">View all →</a>
          </div>
          <div className="space-y-2">
            {displayPolicies.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)] text-center py-4">No policies yet</p>
            ) : displayPolicies.map((policy) => (
              <div key={policy.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--color-surface)] transition">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--color-foreground-subtle)] truncate">{policy.title}</div>
                  <div className="text-xs text-[var(--color-muted)]">Updated {policy.updated}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize flex-shrink-0 ${policyStatusColor[policy.status as keyof typeof policyStatusColor] ?? "bg-[var(--color-surface-2)] text-[var(--color-muted)]"}`}>
                  {policy.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CLI Activity Center */}
      <ActivityTerminal timeline={timeline} orgId={org?.id} />
    </div>
  );
}
