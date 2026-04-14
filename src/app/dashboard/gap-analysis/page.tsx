"use client";
import { useState } from "react";
import { mockControls } from "@/lib/mock-data";
import { useOrg } from "@/lib/org-context";
import { generateGapAnalysisPDF } from "@/lib/pdf";

const criteriaInfo: Record<string, { name: string; description: string; color: string }> = {
  CC1: { name: "Control Environment", description: "Organization structure, oversight, accountability", color: "bg-blue-50 border-blue-200 text-blue-700" },
  CC2: { name: "Communication", description: "Information quality and internal/external communication", color: "bg-purple-50 border-purple-200 text-purple-700" },
  CC3: { name: "Risk Assessment", description: "Risk identification, fraud risk, change risk", color: "bg-orange-50 border-orange-200 text-orange-700" },
  CC4: { name: "Monitoring", description: "Ongoing evaluation and deficiency communication", color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
  CC5: { name: "Control Activities", description: "Selection and deployment of control activities", color: "bg-green-50 border-green-200 text-green-700" },
  CC6: { name: "Logical Access", description: "Access security, user registration, credentials", color: "bg-red-50 border-red-200 text-red-700" },
  CC7: { name: "System Operations", description: "Infrastructure monitoring, incident response", color: "bg-indigo-50 border-indigo-200 text-indigo-700" },
  CC8: { name: "Change Management", description: "Change authorization, testing, deployment", color: "bg-teal-50 border-teal-200 text-teal-700" },
  CC9: { name: "Risk Mitigation", description: "Vendor management and risk mitigation", color: "bg-pink-50 border-pink-200 text-pink-700" },
  A1:  { name: "Availability", description: "Capacity planning and system recovery", color: "bg-cyan-50 border-cyan-200 text-cyan-700" },
  C1:  { name: "Confidentiality", description: "Data classification and disposal", color: "bg-violet-50 border-violet-200 text-violet-700" },
  PI1: { name: "Processing Integrity", description: "Complete, accurate, timely processing", color: "bg-lime-50 border-lime-200 text-lime-700" },
  P1:  { name: "Privacy", description: "Collection, use, and disclosure of personal info", color: "bg-rose-50 border-rose-200 text-rose-700" },
};

const statusConfig = {
  compliant:     { label: "Compliant",      color: "bg-green-100 text-green-700",  dot: "bg-green-500",  icon: "✓" },
  partial:       { label: "Partial",        color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-400", icon: "~" },
  non_compliant: { label: "Non-Compliant",  color: "bg-red-100 text-red-700",      dot: "bg-red-500",    icon: "✗" },
  not_assessed:  { label: "Not Assessed",   color: "bg-gray-100 text-gray-500",    dot: "bg-gray-300",   icon: "?" },
};

const severityConfig = {
  critical: "bg-red-100 text-red-700",
  high:     "bg-orange-100 text-orange-700",
  medium:   "bg-yellow-100 text-yellow-700",
  low:      "bg-blue-100 text-blue-700",
};

// Flat list of all controls from mock data categories
const allControls = mockControls.byCategory.flatMap((cat, catIdx) => {
  const prefix = ["CC", "A1", "C1", "PI1", "P1"][catIdx] || "CC";
  return Array.from({ length: cat.total }, (_, i) => {
    const idx = i;
    const isCompliant = idx < cat.compliant;
    const isPartial = !isCompliant && idx < cat.compliant + cat.partial;
    const isNonCompliant = !isCompliant && !isPartial && idx < cat.compliant + cat.partial + cat.non_compliant;
    const status = isCompliant ? "compliant" : isPartial ? "partial" : isNonCompliant ? "non_compliant" : "not_assessed";
    const severities: ("critical"|"high"|"medium"|"low")[] = ["critical","high","high","medium","medium","low","low","medium","high","critical"];
    const severity = status === "non_compliant" ? severities[i % severities.length] : status === "partial" ? "medium" : "low";
    const catKey = catIdx === 0 ? `CC${Math.floor(i / 3) + 1}` : ["A1","C1","PI1","P1"][catIdx - 1] || prefix;
    const controlNames: Record<string, string[]> = {
      CC1: ["Board oversight and governance", "Organizational structure defined", "Authority and responsibility assigned", "Competence commitment demonstrated", "Accountability enforced"],
      CC2: ["Information quality maintained", "Internal communication processes", "External communication channels"],
      CC3: ["Risk objectives specified", "Risk identification process", "Fraud risk considered", "Change risk assessed"],
      CC4: ["Ongoing monitoring performed", "Deficiencies communicated timely"],
      CC5: ["Controls selected and developed", "Technology controls implemented", "Policies deployed across org"],
      CC6: ["Logical access security software", "User registration and authorization", "Access removal on termination", "Physical access restrictions", "Access modification procedures", "Data in transit protected", "System component changes authorized", "Vulnerability management program"],
      CC7: ["Infrastructure configuration monitoring", "Security event monitoring", "Security incident evaluation", "Incident response procedures", "Incident root cause remediation"],
      CC8: ["Change authorization and testing"],
      CC9: ["Third-party risk mitigation", "Vendor risk assessment process"],
      A1: ["Capacity planning and monitoring", "Recovery objectives defined", "Recovery plan tested"],
      C1: ["Confidential info identified", "Confidential info disposal"],
      PI1: ["Processing definitions maintained", "Input validation controls", "Processing validation controls", "Output delivery controls", "Error handling procedures"],
      P1: ["Privacy notice provided", "Consent obtained", "Collection limitation enforced", "Use and retention limited", "Access rights provided", "Third-party disclosure controlled", "Data quality maintained", "Complaints addressed"],
    };
    const names = controlNames[catKey] || ["Control assessment"];
    return {
      id: `${catKey}.${i + 1}`,
      category: catKey,
      title: names[i % names.length] || `${catKey} Control ${i + 1}`,
      status,
      severity: status === "compliant" || status === "not_assessed" ? "low" as const : severity,
    };
  });
});

export default function GapAnalysisPage() {
  const [filter, setFilter] = useState<"all"|"non_compliant"|"partial"|"compliant">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = ["all", "CC1","CC2","CC3","CC4","CC5","CC6","CC7","CC8","CC9","A1","C1","PI1","P1"];

  const filtered = allControls.filter(c =>
    (filter === "all" || c.status === filter) &&
    (selectedCategory === "all" || c.category === selectedCategory)
  );

  const counts = {
    all: allControls.length,
    non_compliant: allControls.filter(c => c.status === "non_compliant").length,
    partial: allControls.filter(c => c.status === "partial").length,
    compliant: allControls.filter(c => c.status === "compliant").length,
  };

  const criticalCount = allControls.filter(c => c.status === "non_compliant" && c.severity === "critical").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gap Analysis Report</h1>
          <p className="text-sm text-gray-500 mt-1">Full assessment of your SOC 2 control posture across all Trust Services Criteria</p>
        </div>
        <DownloadPdfButton controls={allControls} />
      </div>

      {/* Critical alert */}
      {criticalCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-red-500 text-lg"></span>
          <div>
            <p className="text-sm font-semibold text-red-800">{criticalCount} critical gaps require immediate attention</p>
            <p className="text-xs text-red-600 mt-0.5">These are audit blockers — address before scheduling your SOC 2 audit.</p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["all","compliant","partial","non_compliant"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`rounded-xl border p-4 text-left transition ${filter === s ? "ring-2 ring-blue-500 border-blue-300" : "border-gray-200 hover:border-gray-300"} bg-white`}>
            <div className={`text-2xl font-black ${s === "compliant" ? "text-green-600" : s === "partial" ? "text-yellow-600" : s === "non_compliant" ? "text-red-600" : "text-gray-800"}`}>
              {counts[s]}
            </div>
            <div className="text-xs text-gray-500 capitalize mt-0.5">{s === "all" ? "Total Controls" : s.replace("_", " ")}</div>
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(cat)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${selectedCategory === cat ? "bg-navy text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {cat === "all" ? "All Categories" : cat}
          </button>
        ))}
      </div>

      {/* Controls list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">No controls match your filters.</div>
        )}
        {filtered.map(control => {
          const s = statusConfig[control.status as keyof typeof statusConfig];
          const catInfo = criteriaInfo[control.category as keyof typeof criteriaInfo];
          const isExpanded = expandedId === control.id;
          return (
            <div key={control.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button onClick={() => setExpandedId(isExpanded ? null : control.id)}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${s.dot} text-white`}>
                  {s.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-gray-400">{control.id}</span>
                    <span className="text-sm font-medium text-gray-800">{control.title}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {control.status === "non_compliant" && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${severityConfig[control.severity]}`}>
                      {control.severity}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
                  <span className="text-gray-400 text-sm">{isExpanded ? "▲" : "▼"}</span>
                </div>
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-semibold text-gray-400 uppercase mb-1">Category</div>
                      {catInfo && (
                        <span className={`inline-block text-xs px-2 py-1 rounded border ${catInfo.color}`}>
                          {control.category} — {catInfo.name}
                        </span>
                      )}
                      <p className="text-xs text-gray-500 mt-1">{catInfo?.description}</p>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-400 uppercase mb-1">
                        {control.status === "non_compliant" ? "Required Action" : control.status === "partial" ? "Improvement Needed" : "Evidence"}
                      </div>
                      <p className="text-xs text-gray-600">
                        {control.status === "compliant"
                          ? "This control is operating effectively. Maintain evidence collection on schedule."
                          : control.status === "partial"
                          ? "Control exists but has gaps. Review implementation and strengthen documentation."
                          : control.status === "non_compliant"
                          ? "This control is missing or ineffective. Remediate before audit. See Remediation page for tasks."
                          : "Control has not been assessed yet. Run a Prowler scan or manually assess."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface PdfCtl { id?: string; control_id?: string; category: string; title: string; status: string; severity?: string; }

function DownloadPdfButton({ controls }: { controls: PdfCtl[] }) {
  const { org } = useOrg();
  const [busy, setBusy] = useState(false);
  const handleDownload = async () => {
    setBusy(true);
    try {
      generateGapAnalysisPDF({ name: org?.name, frameworks: org?.frameworks as string[] | undefined }, controls);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button onClick={handleDownload} disabled={busy}
      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition">
      <span>⬇</span> {busy ? "Generating…" : "Download PDF Report"}
    </button>
  );
}
