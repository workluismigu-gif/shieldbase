"use client";
import { useState, useEffect } from "react";

interface MonitorCheck {
  id: string;
  name: string;
  category: string;
  source: string;
  status: "pass" | "fail" | "warn" | "unknown";
  lastChecked: string;
  description: string;
  impact: "critical" | "high" | "medium" | "low";
  detail: string;
}

const mockChecks: MonitorCheck[] = [
  // Access Control
  { id: "mfa-aws", name: "MFA enabled for all IAM users", category: "Access Control", source: "AWS", status: "pass", lastChecked: "2 min ago", description: "All AWS IAM users with console access have MFA enabled.", impact: "critical", detail: "32/32 users compliant" },
  { id: "mfa-gws", name: "MFA enforced in Google Workspace", category: "Access Control", source: "Google Workspace", status: "pass", lastChecked: "5 min ago", description: "2-step verification is enforced org-wide.", impact: "critical", detail: "Enforcement: On (Required)" },
  { id: "mfa-github", name: "2FA required in GitHub Org", category: "Access Control", source: "GitHub", status: "pass", lastChecked: "5 min ago", description: "GitHub organization requires 2FA for all members.", impact: "high", detail: "18/18 members compliant" },
  { id: "root-access-key", name: "No root account access keys", category: "Access Control", source: "AWS", status: "pass", lastChecked: "2 min ago", description: "AWS root account has no active access keys.", impact: "critical", detail: "Root access keys: None" },
  { id: "access-review", name: "Quarterly access review", category: "Access Control", source: "Manual", status: "warn", lastChecked: "15 days ago", description: "User access review should be completed quarterly.", impact: "high", detail: "Last review: Jan 2026 — overdue" },
  { id: "unused-keys", name: "No unused IAM access keys", category: "Access Control", source: "AWS", status: "fail", lastChecked: "2 min ago", description: "IAM access keys unused for >90 days should be rotated.", impact: "high", detail: "2 keys inactive >90 days: AKIA... (user: deploy-bot), AKIA... (user: legacy-ci)" },

  // Encryption
  { id: "s3-encryption", name: "S3 buckets encrypted at rest", category: "Encryption", source: "AWS", status: "pass", lastChecked: "2 min ago", description: "All S3 buckets have default encryption enabled.", impact: "high", detail: "14/14 buckets encrypted (AES-256 / SSE-KMS)" },
  { id: "rds-encryption", name: "RDS instances encrypted", category: "Encryption", source: "AWS", status: "pass", lastChecked: "2 min ago", description: "All RDS database instances have storage encryption enabled.", impact: "critical", detail: "3/3 RDS instances encrypted" },
  { id: "ebs-encryption", name: "EBS volumes encrypted", category: "Encryption", source: "AWS", status: "warn", lastChecked: "2 min ago", description: "All EBS volumes should be encrypted.", impact: "high", detail: "18/22 volumes encrypted — 4 unencrypted volumes in dev environment" },
  { id: "tls-alb", name: "TLS 1.2+ enforced on load balancers", category: "Encryption", source: "AWS", status: "pass", lastChecked: "2 min ago", description: "All ALB/ELB listeners use TLS 1.2 or higher.", impact: "high", detail: "2/2 load balancers using ELBSecurityPolicy-TLS13-1-2-2021" },
  { id: "kms-rotation", name: "KMS key rotation enabled", category: "Encryption", source: "AWS", status: "pass", lastChecked: "2 min ago", description: "All customer-managed KMS keys have automatic rotation enabled.", impact: "medium", detail: "4/4 CMKs with rotation enabled" },

  // Logging & Monitoring
  { id: "cloudtrail", name: "CloudTrail enabled all regions", category: "Monitoring", source: "AWS", status: "pass", lastChecked: "2 min ago", description: "CloudTrail is recording API calls in all AWS regions.", impact: "critical", detail: "Multi-region trail active, log validation: enabled" },
  { id: "guardduty", name: "GuardDuty enabled", category: "Monitoring", source: "AWS", status: "pass", lastChecked: "2 min ago", description: "Amazon GuardDuty threat detection is active.", impact: "high", detail: "GuardDuty: Active — 0 high-severity findings" },
  { id: "vpc-flow", name: "VPC Flow Logs enabled", category: "Monitoring", source: "AWS", status: "fail", lastChecked: "2 min ago", description: "VPC Flow Logs should be enabled in all VPCs.", impact: "high", detail: "2/3 VPCs have flow logs — vpc-0f8... missing" },
  { id: "security-hub", name: "Security Hub enabled", category: "Monitoring", source: "AWS", status: "pass", lastChecked: "2 min ago", description: "AWS Security Hub is aggregating security findings.", impact: "medium", detail: "Security Hub: Active, 3 frameworks enabled" },
  { id: "log-retention", name: "CloudWatch log retention set", category: "Monitoring", source: "AWS", status: "warn", lastChecked: "2 min ago", description: "CloudWatch log groups should have retention policies.", impact: "medium", detail: "4/7 log groups have retention set — 3 groups: never expire" },

  // Network Security
  { id: "ssh-public", name: "SSH port not open to internet", category: "Network", source: "AWS", status: "pass", lastChecked: "2 min ago", description: "No security groups allow inbound SSH (port 22) from 0.0.0.0/0.", impact: "critical", detail: "8 security groups checked — 0 expose port 22 publicly" },
  { id: "s3-public", name: "No public S3 buckets", category: "Network", source: "AWS", status: "pass", lastChecked: "2 min ago", description: "S3 account-level public access block is enabled.", impact: "critical", detail: "Account-level public access block: All 4 settings enabled" },
  { id: "rdp-public", name: "RDP port not open to internet", category: "Network", source: "AWS", status: "pass", lastChecked: "2 min ago", description: "No security groups allow inbound RDP (port 3389) from 0.0.0.0/0.", impact: "critical", detail: "All clear" },

  // Vulnerability Management
  { id: "dependabot", name: "Dependabot alerts resolved", category: "Vulnerabilities", source: "GitHub", status: "warn", lastChecked: "5 min ago", description: "Open Dependabot security alerts should be reviewed and resolved.", impact: "high", detail: "3 open alerts: 1 high, 2 medium — review pending" },
  { id: "ecr-scan", name: "ECR image scanning enabled", category: "Vulnerabilities", source: "AWS", status: "pass", lastChecked: "2 min ago", description: "ECR repositories have vulnerability scanning on push enabled.", impact: "medium", detail: "2/2 repositories with scan-on-push enabled" },

  // Backup & Recovery
  { id: "rds-backup", name: "RDS automated backups enabled", category: "Backup & DR", source: "AWS", status: "pass", lastChecked: "2 min ago", description: "All RDS instances have automated backups configured.", impact: "high", detail: "3/3 RDS instances — 7-day retention window" },
  { id: "backup-restore", name: "Backup restoration tested", category: "Backup & DR", source: "Manual", status: "warn", lastChecked: "45 days ago", description: "Backup restoration should be tested at least quarterly.", impact: "high", detail: "Last test: Feb 2026 — schedule next test" },
];

const categoryIcons: Record<string, string> = {
  "Access Control": "🔑",
  "Encryption": "🔒",
  "Monitoring": "📡",
  "Network": "🌐",
  "Vulnerabilities": "🐛",
  "Backup & DR": "💾",
};

const statusConfig = {
  pass:    { label: "Pass",    color: "text-green-600 bg-green-50",   dot: "bg-green-500",   icon: "✓" },
  fail:    { label: "Fail",    color: "text-red-600 bg-red-50",       dot: "bg-red-500",     icon: "✗" },
  warn:    { label: "Warning", color: "text-yellow-600 bg-yellow-50", dot: "bg-yellow-400",  icon: "!" },
  unknown: { label: "Unknown", color: "text-gray-500 bg-gray-50",     dot: "bg-gray-300",    icon: "?" },
};

const impactConfig = {
  critical: "text-red-700 bg-red-100",
  high:     "text-orange-700 bg-orange-100",
  medium:   "text-yellow-700 bg-yellow-100",
  low:      "text-blue-700 bg-blue-100",
};

export default function MonitoringPage() {
  const [filter, setFilter] = useState<"all" | "pass" | "fail" | "warn">("all");
  const [category, setCategory] = useState("All");
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const categories = ["All", ...Array.from(new Set(mockChecks.map(c => c.category)))];

  const filtered = mockChecks.filter(c =>
    (filter === "all" || c.status === filter) &&
    (category === "All" || c.category === category)
  );

  const counts = {
    all: mockChecks.length,
    pass: mockChecks.filter(c => c.status === "pass").length,
    fail: mockChecks.filter(c => c.status === "fail").length,
    warn: mockChecks.filter(c => c.status === "warn").length,
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => { setRefreshing(false); setLastRefresh(new Date()); }, 2000);
  };

  // Auto-refresh every 5 min
  useEffect(() => {
    const interval = setInterval(() => setLastRefresh(new Date()), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Continuous Monitoring</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time security control checks across your connected integrations</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Last refresh: {lastRefresh.toLocaleTimeString()}</span>
          <button onClick={handleRefresh} disabled={refreshing}
            className="flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm px-4 py-2 rounded-lg transition disabled:opacity-50">
            <span className={refreshing ? "animate-spin" : ""}>🔄</span>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Critical failures alert */}
      {counts.fail > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-red-500 text-lg flex-shrink-0">🚨</span>
          <div>
            <p className="text-sm font-semibold text-red-800">{counts.fail} check{counts.fail > 1 ? "s" : ""} failing — immediate attention required</p>
            <p className="text-xs text-red-600 mt-0.5">Failing checks may block your SOC 2 audit. Address these before scheduling with your auditor.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["all", "pass", "fail", "warn"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`bg-white rounded-xl border p-4 text-left transition ${filter === s ? "ring-2 ring-blue-500 border-blue-300" : "border-gray-200 hover:border-gray-300"}`}>
            <div className={`text-2xl font-black ${s === "pass" ? "text-green-600" : s === "fail" ? "text-red-600" : s === "warn" ? "text-yellow-600" : "text-gray-800"}`}>
              {counts[s]}
            </div>
            <div className="text-xs text-gray-500 capitalize mt-0.5">
              {s === "all" ? "Total Checks" : s === "pass" ? "Passing" : s === "fail" ? "Failing" : "Warnings"}
            </div>
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${category === cat ? "bg-navy text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {cat === "All" ? cat : `${categoryIcons[cat] || ""} ${cat}`}
          </button>
        ))}
      </div>

      {/* Checks list */}
      <div className="space-y-2">
        {filtered.map(check => {
          const s = statusConfig[check.status];
          return (
            <div key={check.id} className={`bg-white rounded-xl border p-4 ${check.status === "fail" ? "border-red-200" : check.status === "warn" ? "border-yellow-200" : "border-gray-200"}`}>
              <div className="flex items-start gap-4">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5 ${s.dot}`}>
                  {s.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{check.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{check.description}</div>
                      {check.status !== "pass" && (
                        <div className={`text-xs mt-1.5 px-2 py-1 rounded inline-block ${check.status === "fail" ? "bg-red-50 text-red-700" : "bg-yellow-50 text-yellow-700"}`}>
                          {check.detail}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${impactConfig[check.impact]}`}>{check.impact}</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>🔌 {check.source}</span>
                    <span>📂 {check.category}</span>
                    <span>🕐 {check.lastChecked}</span>
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
