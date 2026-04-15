"use client";
import { useState, useEffect, Suspense } from "react";
import { useOrg, type ControlRow, type RawFinding } from "@/lib/org-context";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import { generateEvidencePackage, downloadEvidencePackage, generateBulkEvidencePackage } from "@/lib/evidence-package";
import {
  Lock, Eye, GitBranch, Shield, HardDrive, Gauge, AlertTriangle, Radio,
  Users, MessageSquare, GitPullRequest, ShieldCheck, Search, FolderTree,
  Building2, Cloud, ChevronDown, ChevronUp, Download, RefreshCw, Info, Mail, Hexagon
} from "lucide-react";
import { Github } from "@/components/icons/GithubIcon";
import ActivityFeed from "@/components/ActivityFeed";
import ProviderEmptyState from "@/components/ProviderEmptyState";

type LucideIcon = React.ComponentType<{ className?: string; strokeWidth?: number }>;

// ─── AWS CATEGORIES ───────────────────────────────────────────────────────────

const AWS_CATEGORIES: Record<string, {
  label: string; Icon: LucideIcon; soc2: string;
  howToFix: string; controls: string[];
}> = {
  CC6: { label: "Logical Access Controls", Icon: Lock, soc2: "CC6 — Logical & Physical Access",
    howToFix: "Enable MFA for all IAM users, remove unused access keys, restrict public S3 access, close SSH/RDP ports from internet, and enforce least-privilege IAM policies.",
    controls: ["CC6.1", "CC6.2", "CC6.3", "CC6.6", "CC.6.1", "CC.6.3", "CC.6.6"] },
  CC7: { label: "System Monitoring & Operations", Icon: Eye, soc2: "CC7 — System Operations",
    howToFix: "Enable CloudTrail in all regions with log validation, enable GuardDuty, enable VPC Flow Logs, configure CloudWatch log retention, and enable AWS Security Hub.",
    controls: ["CC7.1", "CC7.2", "CC7.3", "CC7.4", "CC.7.2", "CC.7.3", "CC.7.4"] },
  CC8: { label: "Change Management", Icon: GitBranch, soc2: "CC8 — Change Management",
    howToFix: "Implement change control processes. Ensure all infrastructure changes go through approved pipelines with review and testing before deployment.",
    controls: ["CC8.1", "CC.8.1"] },
  C1: { label: "Confidentiality & Encryption", Icon: Shield, soc2: "C1 — Confidentiality",
    howToFix: "Enable encryption at rest for all S3 buckets, RDS instances, and EBS volumes. Enable KMS key rotation. Enforce TLS 1.2+ on all load balancers.",
    controls: ["C1.1", "C1.2", "CC.C.1.2"] },
  A1: { label: "Availability", Icon: HardDrive, soc2: "A1 — Availability",
    howToFix: "Enable automated backups for RDS with multi-region retention. Enable DynamoDB point-in-time recovery. Test backup restoration quarterly.",
    controls: ["A1.1", "A1.2", "CC.A.1.1"] },
  PI1: { label: "Processing Integrity", Icon: Gauge, soc2: "PI1 — Processing Integrity",
    howToFix: "Enable CloudTrail object-level logging for S3, configure CloudWatch alerts, and ensure data processing pipelines have audit logging.",
    controls: ["PI.1.2", "PI.1.3", "PI.1.4", "PI.1.5"] },
  CC3: { label: "Risk Assessment", Icon: AlertTriangle, soc2: "CC3 — Risk Assessment",
    howToFix: "Enable AWS Config in all regions to track configuration changes and compliance drift. Conduct periodic risk assessments.",
    controls: ["CC.3.1", "CC.3.3", "CC.3.4"] },
  CC2: { label: "Communication", Icon: MessageSquare, soc2: "CC2 — Communication",
    howToFix: "Ensure CloudTrail is logging across all regions and delivering to a centralized S3 bucket with access controls.",
    controls: ["CC.2.1"] },
  CC1: { label: "Control Environment", Icon: Users, soc2: "CC1 — Control Environment",
    howToFix: "Remove overly permissive IAM policies. No IAM policy should grant full admin (*:*) access. Use permission boundaries and SCPs.",
    controls: ["CC.1.3"] },
  CC5: { label: "Control Activities", Icon: Radio, soc2: "CC5 — Control Activities",
    howToFix: "Set up CloudWatch metric filters and alarms for NACL changes, security group changes, and IAM policy changes.",
    controls: ["CC.5.2"] },
};

function getControlCategory(controlId: string): string {
  const id = controlId.toUpperCase();
  for (const [key, cat] of Object.entries(AWS_CATEGORIES)) {
    if (cat.controls.some(c => id.startsWith(c.toUpperCase()) || id === c.toUpperCase())) {
      return key;
    }
  }
  return "OTHER";
}

const statusConfig = {
  compliant:     { label: "Pass",    color: "text-[var(--color-success)] bg-[var(--color-success-bg)]",   dot: "bg-green-500",  icon: "✓" },
  non_compliant: { label: "Fail",    color: "text-[var(--color-danger)] bg-[var(--color-danger-bg)]",       dot: "bg-red-500",    icon: "✗" },
  partial:       { label: "Warning", color: "text-[var(--color-warning)] bg-[var(--color-warning-bg)]", dot: "bg-yellow-400", icon: "!" },
  not_assessed:  { label: "Unknown", color: "text-[var(--color-muted)] bg-[var(--color-surface)]",     dot: "bg-gray-300",   icon: "?" },
};

const impactConfig: Record<string, string> = {
  critical: "text-[var(--color-danger)] bg-[var(--color-danger-bg)]",
  high: "text-[var(--color-warning)] bg-orange-100",
  medium: "text-[var(--color-warning)] bg-yellow-100",
  low: "text-[var(--color-info)] bg-[var(--color-info-bg)]",
};

function AWSCategoryCard({ catKey, controls }: { catKey: string; controls: ControlRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const cat = AWS_CATEGORIES[catKey] ?? { label: catKey, Icon: Shield as LucideIcon, soc2: catKey, howToFix: "", controls: [] };

  const passing = controls.filter(c => c.status === "compliant").length;
  const failing = controls.filter(c => c.status === "non_compliant").length;
  const partial = controls.filter(c => c.status === "partial").length;
  const allPass = failing === 0 && partial === 0;

  return (
    <div className={`bg-[var(--color-bg)] rounded-xl border ${allPass ? "border-[var(--color-success)]" : failing > 0 ? "border-[var(--color-danger)]" : "border-[var(--color-warning)]"} overflow-hidden`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full p-4 flex items-center gap-4 text-left hover:bg-[var(--color-surface)] transition">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${allPass ? "bg-[var(--color-success-bg)] text-[var(--color-success)]" : failing > 0 ? "bg-[var(--color-danger-bg)] text-[var(--color-danger)]" : "bg-[var(--color-warning-bg)] text-[var(--color-warning)]"}`}>
          <cat.Icon className="w-[18px] h-[18px]" strokeWidth={1.6} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-[var(--color-foreground)]">{cat.label}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${allPass ? "bg-[var(--color-success-bg)] text-[var(--color-success)]" : failing > 0 ? "bg-[var(--color-danger-bg)] text-[var(--color-danger)]" : "bg-[var(--color-warning-bg)] text-[var(--color-warning)]"}`}>
              {allPass ? "All passing" : failing > 0 ? `${failing} failing` : `${partial} partial`}
            </span>
          </div>
          <div className="text-xs text-[var(--color-muted)] mt-0.5">SOC 2: {cat.soc2}</div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-xs text-[var(--color-muted)] tabular-nums">{passing}/{controls.length}</div>
          <div className="w-20 bg-[var(--color-surface-2)] rounded-full h-1 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${allPass ? "bg-[var(--color-success)]" : failing > 0 ? "bg-[var(--color-danger)]" : "bg-[var(--color-warning)]"}`}
              style={{ width: `${controls.length > 0 ? (passing / controls.length) * 100 : 0}%` }} />
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-[var(--color-muted)]" strokeWidth={1.8} /> : <ChevronDown className="w-4 h-4 text-[var(--color-muted)]" strokeWidth={1.8} />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--color-border)]">
          {(failing > 0 || partial > 0) && cat.howToFix && (
            <div className="mx-4 my-3 bg-[var(--color-info-bg)] border border-[var(--color-info)]/30 rounded-lg p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-info)] mb-1"><Info className="w-3.5 h-3.5" strokeWidth={1.8} /> How to fix</p>
              <p className="text-xs text-[var(--color-info)]">{cat.howToFix}</p>
            </div>
          )}
          <div className="divide-y divide-[var(--color-border)]">
            {controls.map(ctrl => {
              const s = statusConfig[ctrl.status] ?? statusConfig.not_assessed;
              return (
                <div key={ctrl.control_id} className={`flex items-start gap-3 px-4 py-3 ${ctrl.status === "non_compliant" ? "bg-[var(--color-danger-bg)]/40" : ctrl.status === "partial" ? "bg-[var(--color-warning-bg)]/30" : ""}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5 ${s.dot}`}>{s.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <div className="text-sm font-medium text-[var(--color-foreground-subtle)]">{ctrl.title}</div>
                        <div className="text-xs text-[var(--color-muted)] mt-0.5">{ctrl.control_id}</div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${impactConfig[ctrl.severity] || ""}`}>{ctrl.severity}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AWSMonitoring({ controls, lastScan, realtimeConnected }: { controls: ControlRow[]; lastScan: string | null; realtimeConnected: boolean }) {
  const passing = controls.filter(c => c.status === "compliant").length;
  const failing = controls.filter(c => c.status === "non_compliant").length;
  const partial = controls.filter(c => c.status === "partial").length;
  const score = controls.length > 0 ? Math.round((passing / controls.length) * 100) : 0;

  // Group controls by category
  const grouped: Record<string, ControlRow[]> = {};
  for (const ctrl of controls) {
    const key = getControlCategory(ctrl.control_id);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(ctrl);
  }
  // Sort: failing categories first
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    const aFail = grouped[a].filter(c => c.status === "non_compliant").length;
    const bFail = grouped[b].filter(c => c.status === "non_compliant").length;
    return bFail - aFail;
  });

  if (controls.length === 0) {
    return (
      <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-12 text-center">
        <Cloud className="w-10 h-10 text-[var(--color-muted)] mx-auto mb-4" strokeWidth={1.4} />
        <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">No AWS scan data yet</h2>
        <a href="/dashboard/settings" className="inline-flex items-center gap-2 bg-[var(--color-foreground)] text-[var(--color-surface)] px-6 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition mt-2">Connect AWS</a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-2xl font-black text-[var(--color-foreground)]">{score}%</div>
            <div className="text-xs text-[var(--color-muted)]">{passing} passing · {failing} failing · {partial} partial · {controls.length} total</div>
          </div>
          <div className="flex items-center gap-2">
            {failing > 0 && <div className="bg-[var(--color-danger-bg)] border border-[var(--color-danger)] rounded-lg px-3 py-2 text-xs text-[var(--color-danger)] font-medium"> {failing} to fix</div>}
            {lastScan && <div className="text-xs text-[var(--color-muted)]">Last scan: {lastScan} {realtimeConnected && <span className="text-[var(--color-success)]">● live</span>}</div>}
          </div>
        </div>
        <div className="w-full bg-[var(--color-surface-2)] rounded-full h-2 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-400 to-green-500 rounded-full transition-all duration-700"
            style={{ width: `${score}%` }} />
        </div>
      </div>

      {/* Category cards */}
      {sortedKeys.map(key => (
        <AWSCategoryCard key={key} catKey={key} controls={grouped[key]} />
      ))}
    </div>
  );
}

// ─── GITHUB ───────────────────────────────────────────────────────────────────

const GITHUB_CATEGORIES: Record<string, { label: string; Icon: LucideIcon; soc2: string; checks: string[]; howToFix: string }> = {
  branch_protection: { label: "Branch Protection", Icon: GitPullRequest, soc2: "CC8.1 — Change Management",
    howToFix: "Go to each repo → Settings → Branches → Add branch protection rule for 'main'. Enable: Require PR reviews, Restrict force pushes, Restrict deletions, Apply to admins, Require status checks, Require linear history, Require conversation resolution.",
    checks: ["repository_default_branch_protection_enabled","repository_default_branch_disallows_force_push","repository_default_branch_deletion_disabled","repository_default_branch_protection_applies_to_admins","repository_default_branch_status_checks_required","repository_default_branch_requires_linear_history","repository_default_branch_requires_conversation_resolution"] },
  code_review: { label: "Code Review", Icon: ShieldCheck, soc2: "CC8.1 — Change Management",
    howToFix: "In branch protection rules, enable 'Require approvals' (min 2). Enable 'Require review from Code Owners'. Create a CODEOWNERS file in the root of each repo.",
    checks: ["repository_default_branch_requires_multiple_approvals","repository_default_branch_requires_codeowners_review","repository_has_codeowners_file"] },
  secret_scanning: { label: "Secret & Vulnerability Scanning", Icon: Search, soc2: "CC7.1 — System Monitoring",
    howToFix: "Go to each repo → Settings → Code security → Enable 'Secret scanning' and 'Dependabot alerts'. For org-wide: Org Settings → Code security → enable for all repos.",
    checks: ["repository_secret_scanning_enabled","repository_dependency_scanning_enabled"] },
  repo_hygiene: { label: "Repository Hygiene", Icon: FolderTree, soc2: "CC6.1 — Access Control",
    howToFix: "Enable 'Automatically delete head branches' in repo Settings → General. Enable 'Require signed commits' in branch protection. Add a SECURITY.md with your vulnerability disclosure policy.",
    checks: ["repository_branch_delete_on_merge_enabled","repository_default_branch_requires_signed_commits","repository_immutable_releases_enabled","repository_public_has_securitymd_file","repository_inactive_not_archived"] },
  org_security: { label: "Organization Security", Icon: Building2, soc2: "CC1.2 — Organization",
    howToFix: "Apply for a GitHub Verified badge via Org Settings → Profile → Verified domains.",
    checks: ["organization_verified_badge"] },
};

function GithubCategoryCard({ category, findings }: { category: typeof GITHUB_CATEGORIES[string]; findings: RawFinding[] }) {
  const [expanded, setExpanded] = useState(false);
  const catFindings = findings.filter(f => category.checks.includes(f.metadata?.event_code || f.check_id || ""));
  if (catFindings.length === 0) return null;

  const passing = catFindings.filter(f => (f.status_code || f.status) === "PASS").length;
  const failing = catFindings.filter(f => (f.status_code || f.status) === "FAIL").length;
  const allPass = failing === 0;

  return (
    <div className={`bg-[var(--color-bg)] rounded-xl border ${allPass ? "border-[var(--color-success)]" : "border-[var(--color-danger)]"} overflow-hidden`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full p-4 flex items-center gap-4 text-left hover:bg-[var(--color-surface)] transition">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${allPass ? "bg-[var(--color-success-bg)] text-[var(--color-success)]" : "bg-[var(--color-danger-bg)] text-[var(--color-danger)]"}`}>
          <category.Icon className="w-[18px] h-[18px]" strokeWidth={1.6} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-[var(--color-foreground)]">{category.label}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${allPass ? "bg-[var(--color-success-bg)] text-[var(--color-success)]" : "bg-[var(--color-danger-bg)] text-[var(--color-danger)]"}`}>
              {allPass ? "All passing" : `${failing} failing`}
            </span>
          </div>
          <div className="text-xs text-[var(--color-muted)] mt-0.5">SOC 2: {category.soc2}</div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-xs text-[var(--color-muted)] tabular-nums">{passing}/{catFindings.length}</div>
          <div className="w-20 bg-[var(--color-surface-2)] rounded-full h-1 overflow-hidden">
            <div className={`h-full rounded-full ${allPass ? "bg-[var(--color-success)]" : "bg-[var(--color-danger)]"}`} style={{ width: `${catFindings.length > 0 ? (passing / catFindings.length) * 100 : 0}%` }} />
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-[var(--color-muted)]" strokeWidth={1.8} /> : <ChevronDown className="w-4 h-4 text-[var(--color-muted)]" strokeWidth={1.8} />}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-[var(--color-border)]">
          {failing > 0 && (
            <div className="mx-4 my-3 bg-[var(--color-info-bg)] border border-[var(--color-info)]/30 rounded-lg p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-info)] mb-1"><Info className="w-3.5 h-3.5" strokeWidth={1.8} /> How to fix</p>
              <p className="text-xs text-[var(--color-info)]">{category.howToFix}</p>
            </div>
          )}
          <div className="divide-y divide-[var(--color-border)]">
            {catFindings.map((f, i) => {
              const sCode = f.status_code || f.status || "PASS";
              const pass = sCode === "PASS";
              return (
                <div key={i} className={`flex items-start gap-3 px-4 py-3 ${!pass ? "bg-[var(--color-danger-bg)]/40" : ""}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5 ${pass ? "bg-green-500" : "bg-red-500"}`}>{pass ? "✓" : "✗"}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--color-foreground-subtle)]">{f.finding_info?.title || f.metadata?.event_code || ""}</div>
                    {(f.status_detail || f.message) && <div className="text-xs text-[var(--color-muted)] mt-0.5">{f.status_detail || f.message}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SlackMonitoring({ findings, lastScan }: { findings: RawFinding[]; lastScan: string | null }) {
  if (findings.length === 0) {
    return (
      <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-12 text-center">
        <MessageSquare className="w-10 h-10 text-[var(--color-muted)] mx-auto mb-4" strokeWidth={1.4} />
        <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">No Slack scan data yet</h2>
        <p className="text-sm text-[var(--color-muted)] mb-4">Slack is connected. A scan runs automatically on connect and nightly. Trigger one from the top-right if you want results now.</p>
      </div>
    );
  }

  const passing = findings.filter(f => (f.status_code || f.status) === "PASS").length;
  const failing = findings.filter(f => (f.status_code || f.status) === "FAIL").length;
  const score = Math.round((passing / findings.length) * 100);

  return (
    <div className="space-y-4">
      <div className="bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-2xl font-black text-[var(--color-foreground)]">{score}%</div>
            <div className="text-xs text-[var(--color-muted)]">{passing} passing · {failing} failing · {findings.length} total checks</div>
          </div>
          <div className="flex items-center gap-2">
            {failing > 0 && <div className="bg-[var(--color-danger-bg)] border border-[var(--color-danger)] rounded-lg px-3 py-2 text-xs text-[var(--color-danger)] font-medium">{failing} to fix</div>}
            {lastScan && <div className="text-xs text-[var(--color-muted)] text-right">Last scan: {lastScan}</div>}
          </div>
        </div>
        <div className="w-full bg-[var(--color-surface-2)] rounded-full h-2 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: `${score}%` }} />
        </div>
      </div>
      <div className="bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
        {findings.map((f, i) => {
          const sCode = f.status_code || f.status || "PASS";
          const pass = sCode === "PASS";
          const title = (f as RawFinding & { check_title?: string; description?: string }).check_title
            || f.finding_info?.title
            || f.check_id
            || "Slack check";
          const desc = (f as RawFinding & { description?: string }).description || f.status_detail || f.message;
          return (
            <div key={i} className={`flex items-start gap-3 px-4 py-3 ${!pass ? "bg-[var(--color-danger-bg)]/40" : ""}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5 ${pass ? "bg-green-500" : "bg-red-500"}`}>{pass ? "✓" : "✗"}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--color-foreground-subtle)]">{title}</div>
                {desc && <div className="text-xs text-[var(--color-muted)] mt-0.5">{desc}</div>}
              </div>
              {!pass && f.severity && (
                <span className="text-xs px-1.5 py-0.5 rounded font-bold capitalize bg-[var(--color-danger-bg)] text-[var(--color-danger)]">{f.severity}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GitHubMonitoring({ findings, lastScan }: { findings: RawFinding[]; lastScan: string | null }) {
  if (findings.length === 0) {
    return (
      <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-12 text-center">
        <Github className="w-10 h-10 text-[var(--color-muted)] mx-auto mb-4" strokeWidth={1.4} />
        <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">No GitHub scan data yet</h2>
        <p className="text-sm text-[var(--color-muted)] mb-4">GitHub is connected. A scan will run automatically within 15 minutes, or trigger one manually.</p>
        <button className="inline-flex items-center gap-2 bg-[var(--color-surface-2)] text-[var(--color-muted)] px-6 py-2.5 rounded-lg font-semibold text-sm" disabled>
          Scan pending...
        </button>
      </div>
    );
  }

  const passing = findings.filter(f => (f.status_code || f.status) === "PASS").length;
  const failing = findings.filter(f => (f.status_code || f.status) === "FAIL").length;
  const score = Math.round((passing / findings.length) * 100);

  return (
    <div className="space-y-4">
      <div className="bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-2xl font-black text-[var(--color-foreground)]">{score}%</div>
            <div className="text-xs text-[var(--color-muted)]">{passing} passing · {failing} failing · {findings.length} total checks</div>
          </div>
          <div className="flex items-center gap-2">
            {failing > 0 && <div className="bg-[var(--color-danger-bg)] border border-[var(--color-danger)] rounded-lg px-3 py-2 text-xs text-[var(--color-danger)] font-medium"> {failing} to fix</div>}
            {lastScan && <div className="text-xs text-[var(--color-muted)] text-right">Last scan: {lastScan}</div>}
          </div>
        </div>
        <div className="w-full bg-[var(--color-surface-2)] rounded-full h-2 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" style={{ width: `${score}%` }} />
        </div>
      </div>
      {Object.values(GITHUB_CATEGORIES).map(cat => <GithubCategoryCard key={cat.label} category={cat} findings={findings} />)}
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

function MonitoringPage() {
  const { controls, lastScan, lastGithubScan, lastSlackScan, loading, realtimeConnected, githubFindings, slackFindings, org, pushActivityEvent, canWrite } = useOrg();
  const searchParams = useSearchParams();
  type ProviderKey = "aws" | "github" | "slack" | "google_workspace" | "azure";
  const initialProvider = (searchParams.get("provider") as ProviderKey) || "aws";
  const [provider, setProvider] = useState<ProviderKey>(["aws", "github", "slack", "google_workspace", "azure"].includes(initialProvider) ? initialProvider : "aws");

  useEffect(() => {
    const p = searchParams.get("provider");
    if (p && ["aws", "github", "slack", "google_workspace", "azure"].includes(p)) setProvider(p as ProviderKey);
  }, [searchParams]);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState("");
  const [exporting, setExporting] = useState(false);

  const handleExportEvidence = async () => {
    setExporting(true);
    try {
      if (!org?.id) return;
      const bulk = await generateBulkEvidencePackage(supabase as unknown as ReturnType<typeof import("@supabase/supabase-js").createClient>, org.id);
      const blob = new Blob([JSON.stringify(bulk, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SOC2-evidence-package-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Evidence export error:", err);
    } finally {
      setExporting(false);
    }
  };

  const triggerScan = async () => {
    setScanning(true);
    setScanMsg("");
    const providerLabel = provider === "github" ? "GitHub" : "AWS";
    // Log initiation immediately to activity center
    pushActivityEvent({
      type: "scan",
      title: `${providerLabel} scan initiated`,
      detail: `Manual trigger — results in ~${provider === "github" ? "2" : "10-15"} minutes`,
      timestamp: new Date().toISOString(),
    });
    try {
      const res = await fetch("/api/scan/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer shieldbase-internal-2026" },
        body: JSON.stringify({ org_id: org?.id, provider }),
      });
      const json = await res.json();
      setScanMsg(res.ok
        ? `Scan triggered — updates in ~${provider === "github" ? "2" : "10-15"} minutes.`
        : `Error: ${json.error}`);
      if (!res.ok) {
        pushActivityEvent({
          type: "scan",
          title: `${providerLabel} scan failed to trigger`,
          detail: json.error || "Unknown error",
          timestamp: new Date().toISOString(),
        });
      }
    } catch {
      setScanMsg("Failed to trigger scan.");
      pushActivityEvent({
        type: "scan",
        title: `${providerLabel} scan failed to trigger`,
        detail: "Network error",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setScanning(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-[var(--color-muted)] text-sm">Loading monitoring data...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Continuous Monitoring</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">Real-time security checks across your connected integrations</p>
        </div>
        <div className="flex items-center gap-3">
          {realtimeConnected && (
            <span className="flex items-center gap-1.5 text-xs text-[var(--color-success)] font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" /> Live
            </span>
          )}
          <button onClick={handleExportEvidence} disabled={exporting || !org?.id}
            className="inline-flex items-center gap-2 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)] disabled:opacity-50 text-sm px-4 py-2 rounded-lg font-medium transition">
            <Download className="w-4 h-4" strokeWidth={1.8} />
            {exporting ? "Exporting..." : "Export Evidence"}
          </button>
          {canWrite && (
            <button onClick={triggerScan} disabled={scanning || !org?.id}
              className="inline-flex items-center gap-2 bg-[var(--color-foreground)] text-[var(--color-surface)] hover:opacity-90 disabled:opacity-50 text-sm px-4 py-2 rounded-lg font-medium transition">
              <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} strokeWidth={1.8} />
              {scanning ? "Scanning..." : `Scan ${provider === "github" ? "GitHub" : provider === "slack" ? "Slack" : provider === "google_workspace" ? "Google" : provider === "azure" ? "Azure" : "AWS"} Now`}
            </button>
          )}
        </div>
      </div>

      {scanMsg && (
        <div className={`text-sm px-4 py-3 rounded-lg ${scanMsg.startsWith("Error") ? "bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)]" : "bg-[var(--color-info-bg)] text-[var(--color-info)] border border-[var(--color-info)]"}`}>
          {scanMsg}
        </div>
      )}

      {(() => {
        const tech = (org?.tech_stack ?? {}) as Record<string, unknown>;
        const tabs: { key: ProviderKey; label: string; Icon: LucideIcon; connected: boolean; count?: number }[] = [
          { key: "aws", label: "AWS", Icon: Cloud, connected: !!tech.aws_role_arn, count: controls.length },
          { key: "github", label: "GitHub", Icon: Github, connected: !!tech.github_token, count: githubFindings.length },
          { key: "slack", label: "Slack", Icon: MessageSquare, connected: !!tech.slack_access_token, count: slackFindings.length },
          { key: "google_workspace", label: "Google", Icon: Mail, connected: !!tech.google_access_token },
          { key: "azure", label: "Azure", Icon: Hexagon, connected: !!tech.azure_access_token || !!tech.azure_subscription_id },
        ];
        return (
          <div className="flex gap-2 border-b border-[var(--color-border)] pb-1 overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setProvider(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition border-b-2 -mb-px flex-shrink-0 ${
                  provider === t.key ? "border-[var(--color-foreground)] text-[var(--color-foreground)]" : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-foreground-subtle)]"
                }`}>
                <t.Icon className="w-4 h-4" strokeWidth={1.8} /> {t.label}
                {scanning && provider === t.key && <span className="w-2 h-2 rounded-full bg-[var(--color-warning)] animate-pulse" />}
                {t.connected && t.count !== undefined && t.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${provider === t.key ? "bg-[var(--color-surface-2)] text-[var(--color-foreground)]" : "bg-[var(--color-surface-2)] text-[var(--color-muted)]"}`}>{t.count}</span>
                )}
                {!t.connected && (
                  <span className="text-[10px] text-[var(--color-muted)] ml-1">off</span>
                )}
              </button>
            ))}
          </div>
        );
      })()}

      {(() => {
        const tech = (org?.tech_stack ?? {}) as Record<string, unknown>;
        if (provider === "aws") {
          if (!tech.aws_role_arn) return <ProviderEmptyState Icon={Cloud} providerLabel="AWS" state="not_connected" />;
          return <AWSMonitoring controls={controls} lastScan={lastScan} realtimeConnected={realtimeConnected} />;
        }
        if (provider === "github") {
          if (!tech.github_token) return <ProviderEmptyState Icon={Github} providerLabel="GitHub" state="not_connected" />;
          return <GitHubMonitoring findings={githubFindings} lastScan={lastGithubScan} />;
        }
        if (provider === "slack") {
          if (!tech.slack_access_token) return <ProviderEmptyState Icon={MessageSquare} providerLabel="Slack" state="not_connected" />;
          return <SlackMonitoring findings={slackFindings} lastScan={lastSlackScan} />;
        }
        if (provider === "google_workspace") {
          if (!tech.google_access_token) return <ProviderEmptyState Icon={Mail} providerLabel="Google Workspace" state="not_connected" />;
          return <ProviderEmptyState Icon={Mail} providerLabel="Google Workspace" state="lambda_unsupported"
            detail="Workspace scanning is queued — your Lambda needs a `provider === 'google_workspace'` handler. Connection saved and idle." />;
        }
        if (provider === "azure") {
          if (!tech.azure_access_token && !tech.azure_subscription_id) return <ProviderEmptyState Icon={Hexagon} providerLabel="Azure" state="not_connected" />;
          return <ProviderEmptyState Icon={Hexagon} providerLabel="Azure" state="lambda_unsupported"
            detail="Azure scanning is queued — your Lambda needs a `provider === 'azure'` handler. Connection saved and idle." />;
        }
        return null;
      })()}

      <ActivityFeed limit={20} />
    </div>
  );
}

export default function MonitoringPageWrapper() {
  return (
    <Suspense fallback={null}>
      <MonitoringPage />
    </Suspense>
  );
}
