// Mock data for demo/development — replace with Supabase queries when connected

export const mockOrg = {
  id: "org_demo",
  name: "Acme SaaS Inc.",
  status: "remediating" as const,
  compliance_score: 62,
  tech_stack: {
    cloud_provider: ["AWS"],
    identity_provider: "Google Workspace",
    source_control: "GitHub",
    communication: "Slack",
    project_management: "Linear",
    monitoring: "Datadog",
  },
};

export const mockControls = {
  total: 52,
  compliant: 28,
  partial: 12,
  non_compliant: 8,
  not_assessed: 4,
  byCategory: [
    { category: "Security (CC1-CC9)", total: 32, compliant: 18, partial: 8, non_compliant: 4, not_assessed: 2 },
    { category: "Availability (A1)", total: 6, compliant: 3, partial: 2, non_compliant: 1, not_assessed: 0 },
    { category: "Confidentiality (C1)", total: 6, compliant: 4, partial: 1, non_compliant: 1, not_assessed: 0 },
    { category: "Processing Integrity (PI1)", total: 4, compliant: 2, partial: 0, non_compliant: 1, not_assessed: 1 },
    { category: "Privacy (P1)", total: 4, compliant: 1, partial: 1, non_compliant: 1, not_assessed: 1 },
  ],
};

export const mockPolicies = [
  { id: "1", title: "Information Security Policy", type: "information_security", status: "approved" as const, updated: "2026-03-28" },
  { id: "2", title: "Access Control Policy", type: "access_control", status: "approved" as const, updated: "2026-03-28" },
  { id: "3", title: "Incident Response Plan", type: "incident_response", status: "review" as const, updated: "2026-03-30" },
  { id: "4", title: "Data Classification Policy", type: "data_classification", status: "approved" as const, updated: "2026-03-28" },
  { id: "5", title: "Change Management Policy", type: "change_management", status: "draft" as const, updated: "2026-03-31" },
  { id: "6", title: "Encryption Policy", type: "encryption", status: "approved" as const, updated: "2026-03-28" },
  { id: "7", title: "Vendor Management Policy", type: "vendor_management", status: "draft" as const, updated: "2026-03-31" },
  { id: "8", title: "Business Continuity Plan", type: "bcp_dr", status: "draft" as const, updated: "2026-03-31" },
  { id: "9", title: "Acceptable Use Policy", type: "acceptable_use", status: "review" as const, updated: "2026-03-30" },
  { id: "10", title: "Password & Authentication Policy", type: "other", status: "approved" as const, updated: "2026-03-28" },
];

export const mockTasks = [
  { id: "1", title: "Enable MFA for all AWS IAM users", priority: "critical" as const, status: "done" as const, category: "Access Control", due: "2026-04-03" },
  { id: "2", title: "Enable encryption at rest for RDS instances", priority: "critical" as const, status: "done" as const, category: "Encryption", due: "2026-04-03" },
  { id: "3", title: "Configure CloudTrail logging in all regions", priority: "critical" as const, status: "in_progress" as const, category: "Monitoring", due: "2026-04-05" },
  { id: "4", title: "Remove public access from S3 buckets", priority: "critical" as const, status: "in_progress" as const, category: "Access Control", due: "2026-04-05" },
  { id: "5", title: "Implement quarterly access reviews", priority: "high" as const, status: "todo" as const, category: "Access Control", due: "2026-04-10" },
  { id: "6", title: "Set up GuardDuty for threat detection", priority: "high" as const, status: "todo" as const, category: "Monitoring", due: "2026-04-10" },
  { id: "7", title: "Configure VPC flow logs", priority: "high" as const, status: "todo" as const, category: "Monitoring", due: "2026-04-12" },
  { id: "8", title: "Document offboarding procedures", priority: "high" as const, status: "in_progress" as const, category: "HR Security", due: "2026-04-08" },
  { id: "9", title: "Conduct security awareness training", priority: "medium" as const, status: "todo" as const, category: "Training", due: "2026-04-15" },
  { id: "10", title: "Implement backup restoration testing", priority: "medium" as const, status: "todo" as const, category: "BCP/DR", due: "2026-04-18" },
  { id: "11", title: "Complete vendor risk assessments", priority: "medium" as const, status: "todo" as const, category: "Vendor Mgmt", due: "2026-04-20" },
  { id: "12", title: "Set up automated vulnerability scanning", priority: "medium" as const, status: "todo" as const, category: "Vulnerability Mgmt", due: "2026-04-22" },
];

export const mockEvidenceItems = [
  { category: "Access Control", items: 8, collected: 5, lastCollected: "2026-03-30" },
  { category: "Change Management", items: 5, collected: 3, lastCollected: "2026-03-29" },
  { category: "Encryption", items: 4, collected: 4, lastCollected: "2026-03-30" },
  { category: "Monitoring & Logging", items: 6, collected: 2, lastCollected: "2026-03-28" },
  { category: "Incident Response", items: 3, collected: 1, lastCollected: "2026-03-25" },
  { category: "Vulnerability Mgmt", items: 3, collected: 0, lastCollected: null },
  { category: "HR & Training", items: 4, collected: 2, lastCollected: "2026-03-28" },
  { category: "Vendor Management", items: 3, collected: 0, lastCollected: null },
  { category: "BCP/DR", items: 3, collected: 1, lastCollected: "2026-03-20" },
  { category: "Policies & Governance", items: 5, collected: 4, lastCollected: "2026-03-31" },
];

export const mockTimeline = [
  { date: "2026-03-25", event: "Onboarding completed", type: "milestone" },
  { date: "2026-03-26", event: "AWS account connected", type: "integration" },
  { date: "2026-03-26", event: "Initial Prowler scan completed — 52 controls assessed", type: "scan" },
  { date: "2026-03-27", event: "Gap analysis report generated", type: "deliverable" },
  { date: "2026-03-28", event: "6 policies delivered and approved", type: "deliverable" },
  { date: "2026-03-30", event: "MFA enforcement completed for all IAM users", type: "remediation" },
  { date: "2026-03-30", event: "RDS encryption enabled", type: "remediation" },
  { date: "2026-03-31", event: "3 additional policies in review", type: "deliverable" },
];
