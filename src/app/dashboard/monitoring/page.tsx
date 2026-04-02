"use client";
import { useState } from "react";
import { useOrg, type ControlRow, type RawFinding } from "@/lib/org-context";

// ─── AWS ──────────────────────────────────────────────────────────────────────

const statusConfig = {
  compliant:     { label: "Pass",    color: "text-green-600 bg-green-50",   dot: "bg-green-500",  icon: "✓" },
  non_compliant: { label: "Fail",    color: "text-red-600 bg-red-50",       dot: "bg-red-500",    icon: "✗" },
  partial:       { label: "Warning", color: "text-yellow-600 bg-yellow-50", dot: "bg-yellow-400", icon: "!" },
  not_assessed:  { label: "Unknown", color: "text-gray-500 bg-gray-50",     dot: "bg-gray-300",   icon: "?" },
};

const impactConfig: Record<string, string> = {
  critical: "text-red-700 bg-red-100",
  high: "text-orange-700 bg-orange-100",
  medium: "text-yellow-700 bg-yellow-100",
  low: "text-blue-700 bg-blue-100",
};

function AWSMonitoring({ controls, lastScan, realtimeConnected }: { controls: ControlRow[]; lastScan: string | null; realtimeConnected: boolean }) {
  const [filter, setFilter] = useState<"all" | "compliant" | "non_compliant" | "partial">("all");
  const [category, setCategory] = useState("All");

  const categories = ["All", ...Array.from(new Set(controls.map(c => c.category)))];
  const filtered = controls.filter(c =>
    (filter === "all" || c.status === filter) &&
    (category === "All" || c.category === category)
  );
  const counts = {
    all: controls.length,
    compliant: controls.filter(c => c.status === "compliant").length,
    non_compliant: controls.filter(c => c.status === "non_compliant").length,
    partial: controls.filter(c => c.status === "partial").length,
  };

  if (controls.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <div className="text-4xl mb-4">☁️</div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">No AWS scan data yet</h2>
        <a href="/dashboard/connect" className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition mt-2">Connect AWS →</a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {counts.non_compliant > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-red-500 text-lg">🚨</span>
          <div>
            <p className="text-sm font-semibold text-red-800">{counts.non_compliant} control{counts.non_compliant > 1 ? "s" : ""} failing — immediate attention required</p>
            <p className="text-xs text-red-600 mt-0.5">Failing controls may block your SOC 2 audit.</p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["all", "compliant", "non_compliant", "partial"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`bg-white rounded-xl border p-3 text-left transition ${filter === s ? "ring-2 ring-blue-500 border-blue-300" : "border-gray-200"}`}>
            <div className={`text-xl font-black ${s === "compliant" ? "text-green-600" : s === "non_compliant" ? "text-red-600" : s === "partial" ? "text-yellow-600" : "text-gray-800"}`}>{counts[s]}</div>
            <div className="text-xs text-gray-500">{s === "all" ? "Total" : s === "compliant" ? "Passing" : s === "non_compliant" ? "Failing" : "Partial"}</div>
          </button>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${category === cat ? "bg-navy text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {cat}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map(ctrl => {
          const s = statusConfig[ctrl.status] ?? statusConfig.not_assessed;
          return (
            <div key={ctrl.control_id} className={`bg-white rounded-xl border p-4 ${ctrl.status === "non_compliant" ? "border-red-200" : ctrl.status === "partial" ? "border-yellow-200" : "border-gray-200"}`}>
              <div className="flex items-start gap-4">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5 ${s.dot}`}>{s.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{ctrl.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{ctrl.control_id} · {ctrl.category}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${impactConfig[ctrl.severity] || ""}`}>{ctrl.severity}</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {lastScan && <p className="text-xs text-gray-400 text-center">Last scan: {lastScan} {realtimeConnected && <span className="text-green-500">● live</span>}</p>}
    </div>
  );
}

// ─── GITHUB ───────────────────────────────────────────────────────────────────

const GITHUB_CATEGORIES: Record<string, { label: string; icon: string; soc2: string; checks: string[] }> = {
  branch_protection: {
    label: "Branch Protection",
    icon: "🌿",
    soc2: "CC8.1 — Change Management",
    checks: [
      "repository_default_branch_protection_enabled",
      "repository_default_branch_disallows_force_push",
      "repository_default_branch_deletion_disabled",
      "repository_default_branch_protection_applies_to_admins",
      "repository_default_branch_status_checks_required",
      "repository_default_branch_requires_linear_history",
      "repository_default_branch_requires_conversation_resolution",
    ],
  },
  code_review: {
    label: "Code Review",
    icon: "👀",
    soc2: "CC8.1 — Change Management",
    checks: [
      "repository_default_branch_requires_multiple_approvals",
      "repository_default_branch_requires_codeowners_review",
      "repository_has_codeowners_file",
    ],
  },
  secret_scanning: {
    label: "Secret & Vulnerability Scanning",
    icon: "🔍",
    soc2: "CC7.1 — System Monitoring",
    checks: [
      "repository_secret_scanning_enabled",
      "repository_dependency_scanning_enabled",
    ],
  },
  repo_hygiene: {
    label: "Repository Hygiene",
    icon: "🗂️",
    soc2: "CC6.1 — Access Control",
    checks: [
      "repository_branch_delete_on_merge_enabled",
      "repository_default_branch_requires_signed_commits",
      "repository_immutable_releases_enabled",
      "repository_public_has_securitymd_file",
      "repository_inactive_not_archived",
    ],
  },
  org_security: {
    label: "Organization Security",
    icon: "🏢",
    soc2: "CC1.2 — Organization",
    checks: ["organization_verified_badge"],
  },
};

function GithubCategoryCard({
  category,
  findings,
}: {
  category: { label: string; icon: string; soc2: string; checks: string[] };
  findings: RawFinding[];
}) {
  const [expanded, setExpanded] = useState(false);

  const catFindings = findings.filter(f => {
    const id = f.metadata?.event_code || f.check_id || "";
    return category.checks.includes(id);
  });

  if (catFindings.length === 0) return null;

  const passing = catFindings.filter(f => (f.status_code || f.status) === "PASS").length;
  const failing = catFindings.filter(f => (f.status_code || f.status) === "FAIL").length;
  const allPass = failing === 0;

  return (
    <div className={`bg-white rounded-xl border ${allPass ? "border-green-200" : "border-red-200"} overflow-hidden`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full p-4 flex items-center gap-4 text-left hover:bg-gray-50 transition">
        <span className="text-xl">{category.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">{category.label}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${allPass ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {allPass ? "✓ All passing" : `${failing} failing`}
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">SOC 2: {category.soc2}</div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-xs text-gray-500">{passing}/{catFindings.length}</div>
          <div className="w-20 bg-gray-100 rounded-full h-1.5">
            <div className={`h-full rounded-full ${allPass ? "bg-green-500" : "bg-red-400"}`} style={{ width: `${catFindings.length > 0 ? (passing / catFindings.length) * 100 : 0}%` }} />
          </div>
          <span className="text-gray-400 text-xs">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {catFindings.map((f, i) => {
            const sCode = f.status_code || f.status || "PASS";
            const pass = sCode === "PASS";
            const title = f.finding_info?.title || f.metadata?.event_code || "";
            const detail = f.status_detail || f.message || "";

            return (
              <div key={i} className={`flex items-start gap-3 px-4 py-3 ${!pass ? "bg-red-50/40" : ""}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5 ${pass ? "bg-green-500" : "bg-red-500"}`}>
                  {pass ? "✓" : "✗"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${pass ? "text-gray-700" : "text-gray-900"}`}>{title}</div>
                  {detail && <div className="text-xs text-gray-500 mt-0.5">{detail}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GitHubMonitoring({ findings }: { findings: RawFinding[] }) {
  if (findings.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <div className="text-4xl mb-4">🐙</div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">No GitHub scan data yet</h2>
        <p className="text-sm text-gray-500 mb-4">Connect GitHub to scan your repos for security issues.</p>
        <a href="/dashboard/connect" className="inline-block bg-gray-900 hover:bg-gray-800 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition">Connect GitHub →</a>
      </div>
    );
  }

  const passing = findings.filter(f => (f.status_code || f.status) === "PASS").length;
  const failing = findings.filter(f => (f.status_code || f.status) === "FAIL").length;
  const score = Math.round((passing / findings.length) * 100);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-2xl font-black text-gray-900">{score}%</div>
            <div className="text-xs text-gray-400">{passing} passing · {failing} failing · {findings.length} total checks</div>
          </div>
          {failing > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 font-medium">
              🚨 {failing} issues to fix
            </div>
          )}
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" style={{ width: `${score}%` }} />
        </div>
      </div>

      {/* Category cards */}
      {Object.values(GITHUB_CATEGORIES).map(cat => (
        <GithubCategoryCard key={cat.label} category={cat} findings={findings} />
      ))}
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function MonitoringPage() {
  const { controls, lastScan, loading, realtimeConnected, githubFindings } = useOrg();
  const [provider, setProvider] = useState<"aws" | "github">("aws");

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading monitoring data...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Continuous Monitoring</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time security checks across your connected integrations</p>
        </div>
        {realtimeConnected && (
          <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" /> Live
          </span>
        )}
      </div>

      {/* Provider tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-1">
        <button onClick={() => setProvider("aws")}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition border-b-2 -mb-px ${provider === "aws" ? "border-orange-500 text-orange-700 bg-orange-50" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
          ☁️ AWS
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${provider === "aws" ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500"}`}>{controls.length}</span>
        </button>
        <button onClick={() => setProvider("github")}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition border-b-2 -mb-px ${provider === "github" ? "border-gray-900 text-gray-900 bg-gray-50" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
          🐙 GitHub
          {githubFindings.length > 0
            ? <span className={`text-xs px-1.5 py-0.5 rounded-full ${provider === "github" ? "bg-gray-200 text-gray-700" : "bg-gray-100 text-gray-500"}`}>{githubFindings.length}</span>
            : <span className="text-xs text-gray-400 ml-1">not scanned</span>
          }
        </button>
      </div>

      {provider === "aws" && <AWSMonitoring controls={controls} lastScan={lastScan} realtimeConnected={realtimeConnected} />}
      {provider === "github" && <GitHubMonitoring findings={githubFindings} />}
    </div>
  );
}
