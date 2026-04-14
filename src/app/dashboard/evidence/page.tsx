"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { mockEvidenceItems } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase";

interface EvidenceItemDef {
  name: string;
  source: string;
  how: string;
  frequency: string;
}

interface EvidenceRecord {
  id: string;
  control_id: string;
  evidence_type: string;
  evidence_data: {
    storage_path?: string;
    file_name?: string;
    mime_type?: string;
    size?: number;
    notes?: string;
    category?: string;
  };
  collected_at: string;
}

const evidenceDetails: Record<string, EvidenceItemDef[]> = {
  "Access Control": [
    { name: "IAM credential report", source: "AWS IAM", how: "AWS Console → IAM → Users → Download credential report", frequency: "Quarterly" },
    { name: "MFA enrollment status", source: "AWS IAM", how: "IAM Credential Report → mfa_active column", frequency: "Quarterly" },
    { name: "Root account MFA", source: "AWS IAM", how: "IAM → Dashboard → Security Status → Screenshot", frequency: "Quarterly" },
    { name: "Access key age report", source: "AWS IAM", how: "Credential Report → access_key_last_rotated column", frequency: "Quarterly" },
    { name: "User access review", source: "Manual", how: "Manager sign-off on access list", frequency: "Quarterly" },
    { name: "MFA enforcement policy", source: "Google Workspace", how: "Admin Console → Security → 2SV → Screenshot", frequency: "Quarterly" },
    { name: "GitHub 2FA enforcement", source: "GitHub", how: "Org → Settings → Security → Require 2FA", frequency: "Quarterly" },
    { name: "Offboarding checklist", source: "HR", how: "Completed offboarding form for departed employees", frequency: "Per termination" },
  ],
  "Change Management": [
    { name: "Branch protection rules", source: "GitHub", how: "Repo → Settings → Branches → Screenshot", frequency: "Quarterly" },
    { name: "Sample PRs with approvals", source: "GitHub", how: "Export 5 merged PRs showing reviewer approvals", frequency: "Monthly" },
    { name: "Deployment logs", source: "CI/CD", how: "GitHub Actions → recent deployments → export", frequency: "Monthly" },
    { name: "Change tickets", source: "Linear/Jira", how: "Filter change/release tickets → CSV export", frequency: "Monthly" },
    { name: "CI/CD pipeline config", source: "GitHub", how: "Export .github/workflows/ directory", frequency: "Quarterly" },
  ],
  "Encryption": [
    { name: "S3 bucket encryption config", source: "AWS S3", how: "aws s3api get-bucket-encryption for each bucket", frequency: "Quarterly" },
    { name: "RDS encryption status", source: "AWS RDS", how: "RDS Console → each instance → Configuration → Storage encrypted", frequency: "Quarterly" },
    { name: "EBS volume encryption", source: "AWS EC2", how: "aws ec2 describe-volumes → Encrypted column", frequency: "Quarterly" },
    { name: "TLS configuration", source: "AWS ELB", how: "Load Balancers → Listeners → TLS policy screenshot", frequency: "Quarterly" },
    { name: "KMS key rotation status", source: "AWS KMS", how: "aws kms describe-key → KeyRotationEnabled", frequency: "Quarterly" },
  ],
  "Monitoring & Logging": [
    { name: "CloudTrail configuration", source: "AWS CloudTrail", how: "CloudTrail → Trails → enabled, multi-region screenshot", frequency: "Quarterly" },
    { name: "Log file validation enabled", source: "AWS CloudTrail", how: "Trail details → Log file validation: Enabled", frequency: "Quarterly" },
    { name: "GuardDuty status", source: "AWS GuardDuty", how: "GuardDuty Console → Settings → Screenshot", frequency: "Quarterly" },
    { name: "VPC Flow Logs", source: "AWS VPC", how: "VPC → Flow Logs → enabled screenshot", frequency: "Quarterly" },
    { name: "CloudWatch alarms", source: "AWS CloudWatch", how: "aws cloudwatch describe-alarms → export", frequency: "Quarterly" },
    { name: "Security Hub findings", source: "AWS Security Hub", how: "Security Hub → Findings → export CSV", frequency: "Monthly" },
  ],
  "Incident Response": [
    { name: "Incident response plan", source: "Policy", how: "Signed IR plan document", frequency: "Annually" },
    { name: "Incident tickets", source: "Linear/Jira", how: "Filter security incident tickets → export", frequency: "Per incident" },
    { name: "IR tabletop test results", source: "Internal", how: "Meeting notes from tabletop exercise", frequency: "Annually" },
  ],
  "Vulnerability Mgmt": [
    { name: "Vulnerability scan reports", source: "AWS Inspector", how: "Inspector → Findings → export", frequency: "Monthly" },
    { name: "Dependency scan results", source: "GitHub", how: "Dependabot alerts → export", frequency: "Monthly" },
    { name: "Pen test results", source: "External", how: "Report from penetration testing firm", frequency: "Annually" },
  ],
  "HR & Training": [
    { name: "Security training completion", source: "LMS/Email", how: "Training completion records for all employees", frequency: "Annually" },
    { name: "Policy acknowledgments", source: "HR", how: "Signed policy receipt records", frequency: "Annually" },
    { name: "Background check records", source: "HR", how: "Completion confirmation for all employees", frequency: "Per hire" },
    { name: "Onboarding checklist", source: "HR", how: "Completed new hire security onboarding", frequency: "Per hire" },
  ],
  "Vendor Management": [
    { name: "AWS SOC 2 report", source: "AWS Artifact", how: "AWS Console → Artifact → Download AWS SOC 2 report", frequency: "Annually" },
    { name: "Critical vendor assessments", source: "Internal", how: "Completed vendor risk questionnaire for each critical vendor", frequency: "Annually" },
    { name: "Vendor contracts with DPAs", source: "Legal", how: "Signed DPAs from data processors", frequency: "Per vendor" },
  ],
  "BCP/DR": [
    { name: "RDS backup configuration", source: "AWS RDS", how: "RDS → each instance → Maintenance & backups", frequency: "Quarterly" },
    { name: "Backup restoration test", source: "Internal", how: "Documented test restore with date, RTO achieved", frequency: "Quarterly" },
    { name: "BCP/DR plan document", source: "Policy", how: "Signed BCP/DR plan", frequency: "Annually" },
  ],
  "Policies & Governance": [
    { name: "All signed security policies", source: "Policy", how: "PDF exports of approved, signed policies", frequency: "Annually" },
    { name: "Policy review records", source: "Internal", how: "Meeting notes showing annual policy review", frequency: "Annually" },
    { name: "Risk assessment document", source: "Internal", how: "Current risk register with ratings and treatment plans", frequency: "Annually" },
    { name: "Risk review evidence", source: "Internal", how: "Evidence of quarterly risk register review", frequency: "Quarterly" },
    { name: "Board security report", source: "Internal", how: "Security metrics presented to leadership/board", frequency: "Quarterly" },
  ],
};

function evidenceKey(category: string, name: string): string {
  return `${category}::${name}`.replace(/[^a-zA-Z0-9_:-]/g, "_");
}

export default function EvidencePage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [records, setRecords] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeKeyRef = useRef<string | null>(null);

  const inDateRange = (iso: string): boolean => {
    if (!dateFrom && !dateTo) return true;
    const ts = new Date(iso).getTime();
    if (dateFrom) {
      const from = new Date(dateFrom + "T00:00:00").getTime();
      if (ts < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59").getTime();
      if (ts > to) return false;
    }
    return true;
  };

  const loadEvidence = useCallback(async () => {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) { setLoading(false); return; }
    const res = await fetch("/api/evidence/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auth_token: sessionData.session.access_token }),
    });
    const json = await res.json();
    if (res.ok) setRecords(json.evidence as EvidenceRecord[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadEvidence(); }, [loadEvidence]);

  const recordsByKey: Record<string, EvidenceRecord[]> = {};
  for (const r of records) {
    if (!inDateRange(r.collected_at)) continue;
    if (!recordsByKey[r.control_id]) recordsByKey[r.control_id] = [];
    recordsByKey[r.control_id].push(r);
  }

  const handleUploadClick = (key: string) => {
    activeKeyRef.current = key;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const key = activeKeyRef.current;
    if (!file || !key) return;

    setUploadingKey(key);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) throw new Error("Not logged in");

      const form = new FormData();
      form.append("file", file);
      form.append("control_key", key);
      form.append("category", selectedCategory ?? "general");
      form.append("auth_token", sessionData.session.access_token);

      const res = await fetch("/api/evidence/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");

      await loadEvidence();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingKey(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAttest = async (key: string) => {
    const notes = prompt("Add a note (optional):") ?? "";
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) return;

    const form = new FormData();
    form.append("control_key", key);
    form.append("notes", notes);
    form.append("auth_token", sessionData.session.access_token);

    // Use a tiny text file to represent manual attestation
    const blob = new Blob([`Manual attestation\nNote: ${notes}\nAt: ${new Date().toISOString()}`], { type: "text/plain" });
    form.append("file", new File([blob], "attestation.txt", { type: "text/plain" }));

    const res = await fetch("/api/evidence/upload", { method: "POST", body: form });
    if (res.ok) await loadEvidence();
    else alert("Failed to record attestation");
  };

  const handleDownload = async (storagePath: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) return;
    const res = await fetch("/api/evidence/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storage_path: storagePath, auth_token: sessionData.session.access_token }),
    });
    const json = await res.json();
    if (res.ok) window.open(json.url, "_blank");
    else alert(json.error);
  };

  const collectedInCategory = (cat: string): number => {
    const items = evidenceDetails[cat] ?? [];
    return items.filter(i => (recordsByKey[evidenceKey(cat, i.name)]?.length ?? 0) > 0).length;
  };

  const totalItems = Object.values(evidenceDetails).reduce((sum, items) => sum + items.length, 0);
  const totalCollected = Object.keys(evidenceDetails).reduce((sum, cat) => sum + collectedInCategory(cat), 0);
  const overallPct = totalItems ? Math.round((totalCollected / totalItems) * 100) : 0;

  if (selectedCategory) {
    const items = evidenceDetails[selectedCategory] ?? [];
    const collectedCount = collectedInCategory(selectedCategory);
    return (
      <div className="space-y-6">
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedCategory(null)} className="text-sm text-[var(--color-info)] hover:underline">← Back to evidence</button>
          <span className="text-[var(--color-muted)]">|</span>
          <span className="text-sm font-medium text-[var(--color-foreground-subtle)]">{selectedCategory}</span>
        </div>

        <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--color-foreground)]">{selectedCategory}</h2>
              <p className="text-sm text-[var(--color-muted)]">{collectedCount}/{items.length} items collected{(dateFrom || dateTo) ? " (in range)" : ""}</p>
            </div>
            <div className="text-2xl font-black text-[var(--color-info)]">{items.length ? Math.round(collectedCount/items.length*100) : 0}%</div>
          </div>

          <div className="flex flex-wrap gap-2 items-center mb-6 pb-4 border-b border-[var(--color-border)]">
            <span className="text-xs font-medium text-[var(--color-muted)]">Filter by collected date:</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-2 py-1 text-xs text-[var(--color-foreground)]" />
            <span className="text-xs text-[var(--color-muted)]">→</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-2 py-1 text-xs text-[var(--color-foreground)]" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); }}
                className="text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)] underline ml-1">
                clear
              </button>
            )}
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => {
              const key = evidenceKey(selectedCategory, item.name);
              const hasEvidence = (recordsByKey[key]?.length ?? 0) > 0;
              const evidenceRows = recordsByKey[key] ?? [];
              return (
                <div key={idx} className={`p-4 rounded-xl border transition ${hasEvidence ? "bg-[var(--color-success-bg)] border-[var(--color-success)]" : "bg-[var(--color-surface)] border-[var(--color-border)]"}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${hasEvidence ? "bg-green-500 border-green-500 text-white" : "border-[var(--color-border-strong)]"}`}>
                      {hasEvidence && <span className="text-xs">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-[var(--color-foreground-subtle)]">{item.name}</span>
                        <span className="text-xs bg-[var(--color-border)] text-[var(--color-muted)] px-2 py-0.5 rounded-full">{item.source}</span>
                        <span className="text-xs bg-[var(--color-info-bg)] text-[var(--color-info)] px-2 py-0.5 rounded-full">{item.frequency}</span>
                      </div>
                      <p className="text-xs text-[var(--color-muted)] mb-2">{item.how}</p>

                      {evidenceRows.length > 0 && (
                        <div className="space-y-1 mb-2">
                          {evidenceRows.map((r) => (
                            <div key={r.id} className="flex items-center gap-2 text-xs">
                              <span className="text-[var(--color-muted)]">{new Date(r.collected_at).toLocaleDateString()}</span>
                              <span className="font-medium text-[var(--color-foreground-subtle)] truncate max-w-[240px]">{r.evidence_data?.file_name ?? r.evidence_type}</span>
                              {r.evidence_data?.storage_path && (
                                <button onClick={() => handleDownload(r.evidence_data.storage_path!)} className="text-[var(--color-info)] hover:underline">Download</button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleUploadClick(key)}
                          disabled={uploadingKey === key}
                          className="text-xs bg-blue-600 hover:opacity-90 disabled:opacity-50 text-white px-3 py-1.5 rounded-md font-medium"
                        >
                          {uploadingKey === key ? "Uploading…" : " Upload file"}
                        </button>
                        <button
                          onClick={() => handleAttest(key)}
                          className="text-xs border border-[var(--color-border-strong)] hover:border-gray-400 text-[var(--color-foreground-subtle)] px-3 py-1.5 rounded-md font-medium"
                        >
                          Mark collected (manual)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Evidence Collection</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">Upload evidence files and track what your auditor needs for each control area</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold text-[var(--color-foreground-subtle)]">{loading ? "…" : `${totalCollected}/${totalItems} collected`}</span>
          <span className={`px-3 py-1.5 rounded-lg font-medium ${overallPct >= 80 ? "bg-[var(--color-success-bg)] text-[var(--color-success)]" : overallPct >= 50 ? "bg-[var(--color-info-bg)] text-[var(--color-info)]" : "bg-yellow-100 text-[var(--color-warning)]"}`}>
            {overallPct}% complete
          </span>
        </div>
      </div>

      <div className="bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] p-4">
        <div className="flex justify-between text-sm text-[var(--color-muted)] mb-2">
          <span>Overall evidence collection</span>
          <span className="font-semibold text-[var(--color-foreground-subtle)]">{overallPct}%</span>
        </div>
        <div className="w-full bg-[var(--color-surface-2)] rounded-full h-3">
          <div className="bg-blue-500 h-3 rounded-full transition-all duration-500" style={{ width: `${overallPct}%` }} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {mockEvidenceItems.map((item, i) => {
          const details = evidenceDetails[item.category] ?? [];
          const collected = collectedInCategory(item.category);
          const total = details.length || item.items;
          const pct = total ? Math.round(collected / total * 100) : 0;
          return (
            <button key={i} onClick={() => setSelectedCategory(item.category)}
              className="bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] p-5 text-left hover:border-blue-300 hover:shadow-sm transition group">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-[var(--color-foreground-subtle)] group-hover:text-[var(--color-info)] transition">{item.category}</h3>
                <span className={`text-lg font-black ${pct === 100 ? "text-[var(--color-success)]" : pct >= 50 ? "text-[var(--color-info)]" : "text-[var(--color-muted)]"}`}>{pct}%</span>
              </div>
              <div className="w-full bg-[var(--color-surface-2)] rounded-full h-2 mb-3">
                <div className={`h-2 rounded-full ${pct === 100 ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[var(--color-muted)]">{collected}/{total} items collected</span>
                <span className="text-xs text-[var(--color-info)] opacity-0 group-hover:opacity-100 transition">View details →</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
