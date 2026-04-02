// Default SOC 2 checklist items and policy templates seeded for every new org

export const DEFAULT_CHECKLIST: Array<{
  phase: string;
  task: string;
  description: string;
  order: number;
}> = [
  // Phase 1: Foundation
  { phase: "Foundation", task: "Connect AWS account", description: "Link your AWS account via the Connect Tools page so ShieldBase can run automated scans.", order: 1 },
  { phase: "Foundation", task: "Enable MFA for all AWS IAM users", description: "Ensure every IAM user with console access has MFA enabled.", order: 2 },
  { phase: "Foundation", task: "Enable CloudTrail in all regions", description: "Configure multi-region CloudTrail to log all API activity.", order: 3 },
  { phase: "Foundation", task: "Block public S3 access at account level", description: "Enable S3 Block Public Access settings for the entire AWS account.", order: 4 },
  { phase: "Foundation", task: "Enable GuardDuty", description: "Turn on Amazon GuardDuty for continuous threat detection.", order: 5 },
  { phase: "Foundation", task: "Enable VPC Flow Logs", description: "Enable flow logs on all VPCs to capture network traffic.", order: 6 },
  { phase: "Foundation", task: "Encrypt RDS instances at rest", description: "Verify all RDS instances have storage encryption enabled.", order: 7 },
  { phase: "Foundation", task: "Enable KMS key rotation", description: "Enable automatic rotation for all customer-managed KMS keys.", order: 8 },

  // Phase 2: Policies
  { phase: "Policies", task: "Review Information Security Policy", description: "Review and approve the pre-built Information Security Policy template.", order: 9 },
  { phase: "Policies", task: "Review Access Control Policy", description: "Review and approve the Access Control Policy.", order: 10 },
  { phase: "Policies", task: "Review Incident Response Plan", description: "Customize and approve the Incident Response Plan for your org.", order: 11 },
  { phase: "Policies", task: "Review Data Classification Policy", description: "Define data sensitivity tiers and approve the policy.", order: 12 },
  { phase: "Policies", task: "Review Encryption Policy", description: "Confirm encryption standards and approve the policy.", order: 13 },
  { phase: "Policies", task: "Review Business Continuity Plan", description: "Define RTO/RPO targets and approve the BCP.", order: 14 },

  // Phase 3: Remediation
  { phase: "Remediation", task: "Remediate all critical Prowler findings", description: "Address all controls flagged as non-compliant with critical severity.", order: 15 },
  { phase: "Remediation", task: "Remediate all high Prowler findings", description: "Address all controls flagged as non-compliant with high severity.", order: 16 },
  { phase: "Remediation", task: "Conduct quarterly access review", description: "Review all user and service account access and remove unnecessary permissions.", order: 17 },
  { phase: "Remediation", task: "Test backup restoration", description: "Perform a restore test for at least one critical system.", order: 18 },
  { phase: "Remediation", task: "Conduct security awareness training", description: "Complete security awareness training for all team members.", order: 19 },

  // Phase 4: Audit Prep
  { phase: "Audit Prep", task: "Collect evidence for all passing controls", description: "Export evidence for each compliant control from your scan results.", order: 20 },
  { phase: "Audit Prep", task: "Schedule Type I audit with auditor", description: "Engage a CPA firm for your SOC 2 Type I audit.", order: 21 },
  { phase: "Audit Prep", task: "Complete vendor risk assessments", description: "Document risk assessments for all key third-party vendors.", order: 22 },
];

export const DEFAULT_POLICIES: Array<{
  title: string;
  type: string;
  status: string;
  content: string;
}> = [
  {
    title: "Information Security Policy",
    type: "information_security",
    status: "draft",
    content: "# Information Security Policy\n\nThis policy establishes the framework for protecting [Company Name]'s information assets.\n\n## Scope\nApplies to all employees, contractors, and systems.\n\n## Objectives\n- Protect the confidentiality, integrity, and availability of information assets\n- Comply with applicable laws and regulations\n- Manage information security risks\n\n## Responsibilities\nThe CEO is accountable for information security. All employees are responsible for following this policy.\n\n_Review annually or upon significant changes._",
  },
  {
    title: "Access Control Policy",
    type: "access_control",
    status: "draft",
    content: "# Access Control Policy\n\n## Purpose\nEnsure only authorized users can access systems and data.\n\n## Principles\n- Least privilege: grant minimum access required\n- Need-to-know: access based on job function\n- MFA required for all remote and privileged access\n\n## Access Reviews\nAccess rights are reviewed quarterly. Terminated employees are revoked within 24 hours.\n\n_Review annually._",
  },
  {
    title: "Incident Response Plan",
    type: "incident_response",
    status: "draft",
    content: "# Incident Response Plan\n\n## Phases\n1. **Preparation** — maintain IR team, tools, and runbooks\n2. **Detection** — identify and classify the incident\n3. **Containment** — isolate affected systems\n4. **Eradication** — remove threat\n5. **Recovery** — restore systems\n6. **Post-Incident** — document lessons learned\n\n## Severity Levels\n- Critical: active breach, data exfiltration\n- High: unauthorized access detected\n- Medium: policy violation\n\n_Review annually and after each incident._",
  },
  {
    title: "Data Classification Policy",
    type: "data_classification",
    status: "draft",
    content: "# Data Classification Policy\n\n## Classification Tiers\n- **Confidential**: PII, credentials, financial data — encrypted at rest and in transit\n- **Internal**: business data — accessible to employees only\n- **Public**: marketing materials, public docs\n\n## Handling Requirements\nConfidential data must be encrypted, access-controlled, and not shared externally without authorization.\n\n_Review annually._",
  },
  {
    title: "Encryption Policy",
    type: "encryption",
    status: "draft",
    content: "# Encryption Policy\n\n## Standards\n- Data at rest: AES-256\n- Data in transit: TLS 1.2 or higher\n- Key management: AWS KMS with automatic rotation enabled\n\n## Requirements\n- All databases must have encryption at rest enabled\n- All external APIs must use HTTPS\n- Encryption keys must be rotated annually at minimum\n\n_Review annually._",
  },
  {
    title: "Business Continuity Plan",
    type: "bcp_dr",
    status: "draft",
    content: "# Business Continuity Plan\n\n## Objectives\n- RTO (Recovery Time Objective): 4 hours\n- RPO (Recovery Point Objective): 1 hour\n\n## Critical Systems\n- Production database (automated backups, 7-day retention)\n- Application servers (auto-scaling groups)\n\n## Recovery Procedures\n1. Declare incident and notify stakeholders\n2. Activate backup systems\n3. Restore from most recent backup\n4. Validate system integrity\n5. Resume operations\n\n_Test annually. Review after any significant infrastructure change._",
  },
];
