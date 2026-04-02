"use client";
import { useState } from "react";
import { useOrg, type ControlRow, type RawFinding } from "@/lib/org-context";

const statusConfig = {
  compliant:     { label: "Pass",    color: "text-green-600 bg-green-50",   dot: "bg-green-500",  icon: "✓" },
  non_compliant: { label: "Fail",    color: "text-red-600 bg-red-50",       dot: "bg-red-500",    icon: "✗" },
  partial:       { label: "Warning", color: "text-yellow-600 bg-yellow-50", dot: "bg-yellow-400", icon: "!" },
  not_assessed:  { label: "Unknown", color: "text-gray-500 bg-gray-50",     dot: "bg-gray-300",   icon: "?" },
};

const impactConfig: Record<string, string> = {
  critical: "text-red-700 bg-red-100",
  high:     "text-orange-700 bg-orange-100",
  medium:   "text-yellow-700 bg-yellow-100",
  low:      "text-blue-700 bg-blue-100",
};

const githubStatusConfig: Record<string, { label: string; color: string; dot: string; icon: string }> = {
  PASS: { label: "Pass", color: "text-green-600 bg-green-50", dot: "bg-green-500", icon: "✓" },
  FAIL: { label: "Fail", color: "text-red-600 bg-red-50",     dot: "bg-red-500",   icon: "✗" },
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
        <a href="/dashboard/connect" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition mt-2">Connect AWS →</a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {counts.non_compliant > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-red-500 text-lg">🚨</span>
          <div>
            <p className="text-sm font-semibold text-red-800">{counts.non_compliant} control{counts.non_compliant > 1 ? "s" : ""} failing</p>
            <p className="text-xs text-red-600 mt-0.5">Address these before scheduling with your auditor.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["all", "compliant", "non_compliant", "partial"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`bg-white rounded-xl border p-3 text-left transition ${filter === s ? "ring-2 ring-blue-500 border-blue-300" : "border-gray-200"}`}>
            <div className={`text-xl font-black ${s === "compliant" ? "text-green-600" : s === "non_compliant" ? "text-red-600" : s === "partial" ? "text-yellow-600" : "text-gray-800"}`}>{counts[s]}</div>
            <div className="text-xs text-gray-500 capitalize">{s === "all" ? "Total" : s === "compliant" ? "Passing" : s === "non_compliant" ? "Failing" : "Partial"}</div>
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
                      <div className="text-xs text-gray-400 mt-0.5">{ctrl.control_id}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${impactConfig[ctrl.severity] || ""}`}>{ctrl.severity}</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>📂 {ctrl.category}</span>
                    {ctrl.updated_at && <span>🕐 {new Date(ctrl.updated_at).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {lastScan && (
        <p className="text-xs text-gray-400 text-center">Last scan: {lastScan} {realtimeConnected && <span className="text-green-500">● live</span>}</p>
      )}
    </div>
  );
}

function GitHubMonitoring({ findings }: { findings: RawFinding[] }) {
  const [filter, setFilter] = useState<"all" | "PASS" | "FAIL">("all");

  if (findings.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <div className="text-4xl mb-4">🐙</div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">No GitHub scan data yet</h2>
        <p className="text-sm text-gray-500 mb-4">Connect GitHub to scan your repositories for security issues.</p>
        <a href="/dashboard/connect" className="inline-block bg-gray-900 hover:bg-gray-800 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition">Connect GitHub →</a>
      </div>
    );
  }

  const passing = findings.filter(f => (f.status_code || f.status) === "PASS").length;
  const failing = findings.filter(f => (f.status_code || f.status) === "FAIL").length;

  const filtered = findings.filter(f => {
    const s = f.status_code || f.status || "";
    return filter === "all" || s === filter;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {([["all", findings.length, "text-gray-800", "Total"], ["PASS", passing, "text-green-600", "Passing"], ["FAIL", failing, "text-red-600", "Failing"]] as const).map(([s, count, color, label]) => (
          <button key={s} onClick={() => setFilter(s as "all" | "PASS" | "FAIL")}
            className={`bg-white rounded-xl border p-3 text-left transition ${filter === s ? "ring-2 ring-blue-500 border-blue-300" : "border-gray-200"}`}>
            <div className={`text-xl font-black ${color}`}>{count}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((f, i) => {
          const checkId = f.metadata?.event_code || f.check_id || "";
          const title = f.finding_info?.title || checkId;
          const detail = f.status_detail || f.message || "";
          const sCode = f.status_code || f.status || "PASS";
          const s = githubStatusConfig[sCode] ?? githubStatusConfig.PASS;
          const service = f.resources?.[0]?.group?.name || f.resources?.[0]?.type || "";

          return (
            <div key={i} className={`bg-white rounded-xl border p-4 ${sCode === "FAIL" ? "border-red-200" : "border-gray-200"}`}>
              <div className="flex items-start gap-4">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5 ${s.dot}`}>{s.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{title}</div>
                      {detail && <div className="text-xs text-gray-500 mt-0.5">{detail}</div>}
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${s.color}`}>{s.label}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    {service && <span>📦 {service}</span>}
                    <span className="font-mono">{checkId}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MonitoringPage() {
  const { controls, lastScan, loading, realtimeConnected, githubFindings } = useOrg();
  const [provider, setProvider] = useState<"aws" | "github">("aws");

  const techStack = (() => {
    try { return {} as Record<string, string>; } catch { return {}; }
  })();

  const hasGithub = githubFindings.length > 0;

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading monitoring data...</div>;
  }

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
      <div className="flex gap-2">
        <button onClick={() => setProvider("aws")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${provider === "aws" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          ☁️ AWS <span className="text-xs opacity-70">({controls.length})</span>
        </button>
        <button onClick={() => setProvider("github")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${provider === "github" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          🐙 GitHub {hasGithub ? <span className="text-xs opacity-70">({githubFindings.length})</span> : <span className="text-xs opacity-50">not connected</span>}
        </button>
      </div>

      {provider === "aws" && <AWSMonitoring controls={controls} lastScan={lastScan} realtimeConnected={realtimeConnected} />}
      {provider === "github" && <GitHubMonitoring findings={githubFindings} />}
    </div>
  );
}
