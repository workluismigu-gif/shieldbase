"use client";
import { useState } from "react";

const mockDocuments = [
  { id: "1", title: "SOC 2 Gap Analysis Report", type: "gap_analysis", status: "draft", updated: "Not yet generated", icon: "" },
  { id: "2", title: "Information Security Policy", type: "policy", status: "draft", updated: "Not yet generated", icon: "" },
  { id: "3", title: "Access Control Policy", type: "policy", status: "draft", updated: "Not yet generated", icon: "" },
  { id: "4", title: "Incident Response Plan", type: "policy", status: "draft", updated: "Not yet generated", icon: "" },
  { id: "5", title: "Data Classification Policy", type: "policy", status: "draft", updated: "Not yet generated", icon: "" },
  { id: "6", title: "Change Management Policy", type: "policy", status: "draft", updated: "Not yet generated", icon: "" },
  { id: "7", title: "Vendor Management Policy", type: "policy", status: "draft", updated: "Not yet generated", icon: "" },
  { id: "8", title: "Business Continuity Plan", type: "policy", status: "draft", updated: "Not yet generated", icon: "" },
  { id: "9", title: "Risk Assessment Policy", type: "policy", status: "draft", updated: "Not yet generated", icon: "" },
  { id: "10", title: "Evidence Collection Runbook", type: "evidence_runbook", status: "draft", updated: "Not yet generated", icon: "" },
  { id: "11", title: "Remediation Roadmap", type: "remediation_plan", status: "draft", updated: "Not yet generated", icon: "" },
];

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-slate",
  review: "bg-yellow-50 text-yellow-600",
  approved: "bg-green/10 text-green",
};

const typeLabels: Record<string, string> = {
  gap_analysis: "Gap Analysis",
  policy: "Policy",
  evidence_runbook: "Runbook",
  remediation_plan: "Remediation",
};

export default function DocumentsPage() {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? mockDocuments : mockDocuments.filter(d => d.type === filter);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">Documents</h1>
          <p className="text-slate text-sm mt-1">Your policies, reports, and compliance documents</p>
        </div>
        <button className="bg-blue hover:bg-blue-dark text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition">
           Generate All with AI
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {[
          { key: "all", label: "All" },
          { key: "policy", label: "Policies" },
          { key: "gap_analysis", label: "Gap Analysis" },
          { key: "evidence_runbook", label: "Runbooks" },
          { key: "remediation_plan", label: "Remediation" },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === f.key ? "bg-navy text-white" : "bg-gray-100 text-slate hover:bg-gray-200"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Info banner */}
      <div className="bg-blue/5 border border-blue/20 rounded-xl p-5 mb-6 flex items-start gap-4">
        <span className="text-2xl"></span>
        <div>
          <h3 className="text-sm font-semibold text-navy">AI-Generated Documents</h3>
          <p className="text-sm text-slate mt-1">
            Connect your cloud infrastructure first, then click &quot;Generate All with AI&quot; to create customized documents based on your actual tech stack and scan results.
          </p>
        </div>
      </div>

      {/* Document list */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-gray-100 text-xs font-semibold text-slate uppercase">
          <span></span>
          <span>Document</span>
          <span>Type</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {filtered.map((doc) => (
          <div key={doc.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-4 border-b border-gray-50 last:border-0 items-center hover:bg-gray-50 transition">
            <span className="text-xl">{doc.icon}</span>
            <div>
              <div className="text-sm font-medium text-navy">{doc.title}</div>
              <div className="text-xs text-slate">{doc.updated}</div>
            </div>
            <span className="text-xs bg-gray-100 text-slate px-2 py-1 rounded-md font-medium">
              {typeLabels[doc.type]}
            </span>
            <span className={`text-xs px-2 py-1 rounded-md font-medium ${statusColors[doc.status]}`}>
              {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
            </span>
            <div className="flex gap-2">
              <button className="text-xs text-blue hover:text-blue-dark font-medium">View</button>
              <button className="text-xs text-slate hover:text-navy font-medium">Download</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
