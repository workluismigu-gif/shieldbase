"use client";
import { useState } from "react";
import { useOrg, type ControlRow } from "@/lib/org-context";

const categoryIcons: Record<string, string> = {
  "CC6": "🔑",
  "CC7": "📡",
  "C1":  "🔒",
  "A1":  "💾",
  "CC8": "🔧",
  "CC9": "🌐",
};

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

function toDisplayStatus(status: ControlRow["status"]) {
  return statusConfig[status] ?? statusConfig.not_assessed;
}

export default function MonitoringPage() {
  const { controls, lastScan, loading, realtimeConnected } = useOrg();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading monitoring data...
      </div>
    );
  }

  if (controls.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Continuous Monitoring</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time security control checks from your Prowler scans</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-4">📡</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">No scan data yet</h2>
          <p className="text-sm text-gray-500 mb-6">Run a Prowler scan and upload the results to see your live security posture here.</p>
          <a href="/dashboard/scan" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition">
            Run Your First Scan →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Continuous Monitoring</h1>
          <p className="text-sm text-gray-500 mt-1">
            {lastScan ? `Last scan: ${lastScan}` : "Monitoring your security controls"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {realtimeConnected && (
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
              Live
            </span>
          )}
        </div>
      </div>

      {/* Critical failures alert */}
      {counts.non_compliant > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-red-500 text-lg flex-shrink-0">🚨</span>
          <div>
            <p className="text-sm font-semibold text-red-800">{counts.non_compliant} control{counts.non_compliant > 1 ? "s" : ""} failing — immediate attention required</p>
            <p className="text-xs text-red-600 mt-0.5">Failing controls may block your SOC 2 audit. Address these before scheduling with your auditor.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["all", "compliant", "non_compliant", "partial"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`bg-white rounded-xl border p-4 text-left transition ${filter === s ? "ring-2 ring-blue-500 border-blue-300" : "border-gray-200 hover:border-gray-300"}`}>
            <div className={`text-2xl font-black ${s === "compliant" ? "text-green-600" : s === "non_compliant" ? "text-red-600" : s === "partial" ? "text-yellow-600" : "text-gray-800"}`}>
              {counts[s]}
            </div>
            <div className="text-xs text-gray-500 capitalize mt-0.5">
              {s === "all" ? "Total Controls" : s === "compliant" ? "Passing" : s === "non_compliant" ? "Failing" : "Partial"}
            </div>
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${category === cat ? "bg-navy text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {cat === "All" ? "All" : `${categoryIcons[cat] || "🔹"} ${cat}`}
          </button>
        ))}
      </div>

      {/* Controls list */}
      <div className="space-y-2">
        {filtered.map(ctrl => {
          const s = toDisplayStatus(ctrl.status);
          return (
            <div key={ctrl.control_id} className={`bg-white rounded-xl border p-4 ${ctrl.status === "non_compliant" ? "border-red-200" : ctrl.status === "partial" ? "border-yellow-200" : "border-gray-200"}`}>
              <div className="flex items-start gap-4">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5 ${s.dot}`}>
                  {s.icon}
                </div>
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
    </div>
  );
}
