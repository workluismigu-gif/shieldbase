"use client";
import { useState } from "react";
import { mockEvidenceItems } from "@/lib/mock-data";

interface EvidenceItem {
  name: string;
  source: string;
  how: string;
  frequency: string;
  collected: boolean;
}

const evidenceDetails: Record<string, EvidenceItem[]> = {
  "Access Control": [
    { name: "IAM credential report", source: "AWS IAM", how: "AWS Console → IAM → Users → Download credential report", frequency: "Quarterly", collected: true },
    { name: "MFA enrollment status", source: "AWS IAM", how: "IAM Credential Report → mfa_active column", frequency: "Quarterly", collected: true },
    { name: "Root account MFA", source: "AWS IAM", how: "IAM → Dashboard → Security Status → Screenshot", frequency: "Quarterly", collected: true },
    { name: "Access key age report", source: "AWS IAM", how: "Credential Report → access_key_last_rotated column", frequency: "Quarterly", collected: true },
    { name: "User access review", source: "Manual", how: "Manager sign-off on access list", frequency: "Quarterly", collected: false },
    { name: "MFA enforcement policy", source: "Google Workspace", how: "Admin Console → Security → 2SV → Screenshot", frequency: "Quarterly", collected: false },
    { name: "GitHub 2FA enforcement", source: "GitHub", how: "Org → Settings → Security → Require 2FA", frequency: "Quarterly", collected: false },
    { name: "Offboarding checklist", source: "HR", how: "Completed offboarding form for departed employees", frequency: "Per termination", collected: false },
  ],
  "Change Management": [
    { name: "Branch protection rules", source: "GitHub", how: "Repo → Settings → Branches → Screenshot", frequency: "Quarterly", collected: true },
    { name: "Sample PRs with approvals", source: "GitHub", how: "Export 5 merged PRs showing reviewer approvals", frequency: "Monthly", collected: true },
    { name: "Deployment logs", source: "CI/CD", how: "GitHub Actions → recent deployments → export", frequency: "Monthly", collected: true },
    { name: "Change tickets", source: "Linear/Jira", how: "Filter change/release tickets → CSV export", frequency: "Monthly", collected: false },
    { name: "CI/CD pipeline config", source: "GitHub", how: "Export .github/workflows/ directory", frequency: "Quarterly", collected: false },
  ],
  "Encryption": [
    { name: "S3 bucket encryption config", source: "AWS S3", how: "aws s3api get-bucket-encryption for each bucket", frequency: "Quarterly", collected: true },
    { name: "RDS encryption status", source: "AWS RDS", how: "RDS Console → each instance → Configuration → Storage encrypted", frequency: "Quarterly", collected: true },
    { name: "EBS volume encryption", source: "AWS EC2", how: "aws ec2 describe-volumes → Encrypted column", frequency: "Quarterly", collected: true },
    { name: "TLS configuration", source: "AWS ELB", how: "Load Balancers → Listeners → TLS policy screenshot", frequency: "Quarterly", collected: true },
    { name: "KMS key rotation status", source: "AWS KMS", how: "aws kms describe-key → KeyRotationEnabled", frequency: "Quarterly", collected: false },
  ],
  "Monitoring & Logging": [
    { name: "CloudTrail configuration", source: "AWS CloudTrail", how: "CloudTrail → Trails → enabled, multi-region screenshot", frequency: "Quarterly", collected: true },
    { name: "Log file validation enabled", source: "AWS CloudTrail", how: "Trail details → Log file validation: Enabled", frequency: "Quarterly", collected: true },
    { name: "GuardDuty status", source: "AWS GuardDuty", how: "GuardDuty Console → Settings → Screenshot", frequency: "Quarterly", collected: false },
    { name: "VPC Flow Logs", source: "AWS VPC", how: "VPC → Flow Logs → enabled screenshot", frequency: "Quarterly", collected: false },
    { name: "CloudWatch alarms", source: "AWS CloudWatch", how: "aws cloudwatch describe-alarms → export", frequency: "Quarterly", collected: false },
    { name: "Security Hub findings", source: "AWS Security Hub", how: "Security Hub → Findings → export CSV", frequency: "Monthly", collected: false },
  ],
  "Incident Response": [
    { name: "Incident response plan", source: "Policy", how: "Signed IR plan document", frequency: "Annually", collected: true },
    { name: "Incident tickets", source: "Linear/Jira", how: "Filter security incident tickets → export", frequency: "Per incident", collected: false },
    { name: "IR tabletop test results", source: "Internal", how: "Meeting notes from tabletop exercise", frequency: "Annually", collected: false },
  ],
  "Vulnerability Mgmt": [
    { name: "Vulnerability scan reports", source: "AWS Inspector", how: "Inspector → Findings → export", frequency: "Monthly", collected: false },
    { name: "Dependency scan results", source: "GitHub", how: "Dependabot alerts → export", frequency: "Monthly", collected: false },
    { name: "Pen test results", source: "External", how: "Report from penetration testing firm", frequency: "Annually", collected: false },
  ],
  "HR & Training": [
    { name: "Security training completion", source: "LMS/Email", how: "Training completion records for all employees", frequency: "Annually", collected: true },
    { name: "Policy acknowledgments", source: "HR", how: "Signed policy receipt records", frequency: "Annually", collected: true },
    { name: "Background check records", source: "HR", how: "Completion confirmation for all employees", frequency: "Per hire", collected: false },
    { name: "Onboarding checklist", source: "HR", how: "Completed new hire security onboarding", frequency: "Per hire", collected: false },
  ],
  "Vendor Management": [
    { name: "AWS SOC 2 report", source: "AWS Artifact", how: "AWS Console → Artifact → Download AWS SOC 2 report", frequency: "Annually", collected: false },
    { name: "Critical vendor assessments", source: "Internal", how: "Completed vendor risk questionnaire for each critical vendor", frequency: "Annually", collected: false },
    { name: "Vendor contracts with DPAs", source: "Legal", how: "Signed DPAs from data processors", frequency: "Per vendor", collected: false },
  ],
  "BCP/DR": [
    { name: "RDS backup configuration", source: "AWS RDS", how: "RDS → each instance → Maintenance & backups", frequency: "Quarterly", collected: true },
    { name: "Backup restoration test", source: "Internal", how: "Documented test restore with date, RTO achieved", frequency: "Quarterly", collected: false },
    { name: "BCP/DR plan document", source: "Policy", how: "Signed BCP/DR plan", frequency: "Annually", collected: false },
  ],
  "Policies & Governance": [
    { name: "All signed security policies", source: "Policy", how: "PDF exports of approved, signed policies", frequency: "Annually", collected: true },
    { name: "Policy review records", source: "Internal", how: "Meeting notes showing annual policy review", frequency: "Annually", collected: true },
    { name: "Risk assessment document", source: "Internal", how: "Current risk register with ratings and treatment plans", frequency: "Annually", collected: true },
    { name: "Risk review evidence", source: "Internal", how: "Evidence of quarterly risk register review", frequency: "Quarterly", collected: true },
    { name: "Board security report", source: "Internal", how: "Security metrics presented to leadership/board", frequency: "Quarterly", collected: false },
  ],
};

export default function EvidencePage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [tasks, setTasks] = useState(() => {
    const init: Record<string, boolean[]> = {};
    for (const [cat, items] of Object.entries(evidenceDetails)) {
      init[cat] = items.map(i => i.collected);
    }
    return init;
  });

  const toggleItem = (cat: string, idx: number) => {
    setTasks(prev => {
      const updated = [...prev[cat]];
      updated[idx] = !updated[idx];
      return { ...prev, [cat]: updated };
    });
  };

  const totalItems = mockEvidenceItems.reduce((a, b) => a + b.items, 0);
  const totalCollected = Object.values(tasks).reduce((sum, arr) => sum + arr.filter(Boolean).length, 0);
  const overallPct = Math.round(totalCollected / totalItems * 100);

  if (selectedCategory) {
    const items = evidenceDetails[selectedCategory] || [];
    const collectedCount = tasks[selectedCategory]?.filter(Boolean).length || 0;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedCategory(null)} className="text-sm text-blue-600 hover:underline">
            ← Back to evidence
          </button>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-700">{selectedCategory}</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{selectedCategory}</h2>
              <p className="text-sm text-gray-500">{collectedCount}/{items.length} items collected</p>
            </div>
            <div className="text-2xl font-black text-blue-600">{Math.round(collectedCount/items.length*100)}%</div>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className={`flex items-start gap-4 p-4 rounded-xl border transition ${tasks[selectedCategory]?.[idx] ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                <button onClick={() => toggleItem(selectedCategory, idx)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition ${tasks[selectedCategory]?.[idx] ? "bg-green-500 border-green-500 text-white" : "border-gray-300 hover:border-green-400"}`}>
                  {tasks[selectedCategory]?.[idx] && <span className="text-xs">✓</span>}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-gray-800">{item.name}</span>
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{item.source}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{item.frequency}</span>
                  </div>
                  <p className="text-xs text-gray-500">{item.how}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Evidence Collection</h1>
          <p className="text-sm text-gray-500 mt-1">Track and collect the evidence your auditor needs for each control area</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold text-gray-700">{totalCollected}/{totalItems} collected</span>
          <span className={`px-3 py-1.5 rounded-lg font-medium ${overallPct >= 80 ? "bg-green-100 text-green-700" : overallPct >= 50 ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}>
            {overallPct}% complete
          </span>
        </div>
      </div>

      {/* Overall progress */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>Overall evidence collection</span>
          <span className="font-semibold text-gray-800">{overallPct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div className="bg-blue-500 h-3 rounded-full transition-all duration-500" style={{ width: `${overallPct}%` }} />
        </div>
      </div>

      {/* Evidence categories grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {mockEvidenceItems.map((item, i) => {
          const details = evidenceDetails[item.category] || [];
          const collected = tasks[item.category]?.filter(Boolean).length || 0;
          const total = details.length || item.items;
          const pct = Math.round(collected / total * 100);
          return (
            <button key={i} onClick={() => setSelectedCategory(item.category)}
              className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:border-blue-300 hover:shadow-sm transition group">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition">{item.category}</h3>
                <span className={`text-lg font-black ${pct === 100 ? "text-green-600" : pct >= 50 ? "text-blue-600" : "text-gray-400"}`}>{pct}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                <div className={`h-2 rounded-full ${pct === 100 ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">{collected}/{total} items collected</span>
                <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition">View details →</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
