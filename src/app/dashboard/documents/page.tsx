"use client";
import { useState } from "react";
import { FileSearch, ShieldCheck, KeyRound, AlertOctagon, FolderTree, GitBranch, Handshake, Building2, Scale, Camera, Map, Sparkles, Info } from "lucide-react";

type LucideIcon = React.ComponentType<{ className?: string; strokeWidth?: number }>;

const mockDocuments: { id: string; title: string; type: string; status: string; updated: string; Icon: LucideIcon }[] = [
  { id: "1", title: "SOC 2 Gap Analysis Report", type: "gap_analysis", status: "draft", updated: "Not yet generated", Icon: FileSearch },
  { id: "2", title: "Information Security Policy", type: "policy", status: "draft", updated: "Not yet generated", Icon: ShieldCheck },
  { id: "3", title: "Access Control Policy", type: "policy", status: "draft", updated: "Not yet generated", Icon: KeyRound },
  { id: "4", title: "Incident Response Plan", type: "policy", status: "draft", updated: "Not yet generated", Icon: AlertOctagon },
  { id: "5", title: "Data Classification Policy", type: "policy", status: "draft", updated: "Not yet generated", Icon: FolderTree },
  { id: "6", title: "Change Management Policy", type: "policy", status: "draft", updated: "Not yet generated", Icon: GitBranch },
  { id: "7", title: "Vendor Management Policy", type: "policy", status: "draft", updated: "Not yet generated", Icon: Handshake },
  { id: "8", title: "Business Continuity Plan", type: "policy", status: "draft", updated: "Not yet generated", Icon: Building2 },
  { id: "9", title: "Risk Assessment Policy", type: "policy", status: "draft", updated: "Not yet generated", Icon: Scale },
  { id: "10", title: "Evidence Collection Runbook", type: "evidence_runbook", status: "draft", updated: "Not yet generated", Icon: Camera },
  { id: "11", title: "Remediation Roadmap", type: "remediation_plan", status: "draft", updated: "Not yet generated", Icon: Map },
];

const statusColors: Record<string, string> = {
  draft: "bg-[var(--color-surface-2)] text-[var(--color-muted)]",
  review: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
  approved: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)] tracking-tight">Documents</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">Your policies, reports, and compliance documents</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-[var(--color-foreground)] text-[var(--color-surface)] px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition">
          <Sparkles className="w-4 h-4" strokeWidth={1.8} />
          Generate All with AI
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All" },
          { key: "policy", label: "Policies" },
          { key: "gap_analysis", label: "Gap Analysis" },
          { key: "evidence_runbook", label: "Runbooks" },
          { key: "remediation_plan", label: "Remediation" },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === f.key
                ? "bg-[var(--color-foreground)] text-[var(--color-surface)]"
                : "bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex items-start gap-3 bg-[var(--color-info-bg)] border border-[var(--color-info)]/30 rounded-xl px-4 py-3">
        <Info className="w-4 h-4 text-[var(--color-info)] mt-0.5 flex-shrink-0" strokeWidth={1.8} />
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-info)]">AI-Generated Documents</h3>
          <p className="text-xs text-[var(--color-foreground-subtle)] mt-1 leading-relaxed">
            Connect your cloud infrastructure first, then click &quot;Generate All with AI&quot; to create customized documents based on your actual tech stack and scan results.
          </p>
        </div>
      </div>

      <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-[var(--color-border)] text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider bg-[var(--color-surface)]">
          <span className="w-9" />
          <span>Document</span>
          <span>Type</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {filtered.map((doc) => (
          <div key={doc.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-3.5 border-b border-[var(--color-border)] last:border-0 items-center hover:bg-[var(--color-surface)] transition">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-foreground-subtle)]">
              <doc.Icon className="w-[18px] h-[18px]" strokeWidth={1.6} />
            </div>
            <div>
              <div className="text-sm font-medium text-[var(--color-foreground)]">{doc.title}</div>
              <div className="text-xs text-[var(--color-muted)]">{doc.updated}</div>
            </div>
            <span className="text-xs bg-[var(--color-surface-2)] text-[var(--color-muted)] px-2 py-1 rounded-md font-medium">
              {typeLabels[doc.type]}
            </span>
            <span className={`text-xs px-2 py-1 rounded-md font-medium ${statusColors[doc.status]}`}>
              {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
            </span>
            <div className="flex gap-3">
              <button className="text-xs text-[var(--color-info)] font-medium hover:underline">View</button>
              <button className="text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)] font-medium">Download</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
