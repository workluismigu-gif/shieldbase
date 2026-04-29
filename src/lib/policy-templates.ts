// SOC 2 policy templates with variable substitution.
// Each template is a markdown string with {{variable}} placeholders.
// The generator fills these from the questionnaire answers.

export interface PolicyAnswers {
  company_name: string;
  cloud_provider: string;        // "AWS" | "GCP" | "Azure" | "Multi-cloud"
  remote_work: boolean;
  employee_count: string;        // "1-10" | "11-50" | "51-200" | "200+"
  data_types: string;            // "PII" | "PHI" | "Financial" | "General SaaS"
  incident_email: string;
  security_lead: string;
  domain: string;                // company email domain
  mfa_enforced: boolean;
  password_min_length: string;   // "8" | "12" | "14"
  access_review_frequency: string; // "Monthly" | "Quarterly" | "Annually"
  backup_frequency: string;      // "Daily" | "Weekly" | "Continuous"
  retention_days: string;        // "30" | "90" | "365"
  vendor_review: string;         // "Annually" | "Per-engagement" | "Not yet"
  has_bcp: boolean;
}

export const DEFAULT_ANSWERS: PolicyAnswers = {
  company_name: "",
  cloud_provider: "AWS",
  remote_work: true,
  employee_count: "1-10",
  data_types: "General SaaS",
  incident_email: "security@company.com",
  security_lead: "CTO",
  domain: "company.com",
  mfa_enforced: true,
  password_min_length: "12",
  access_review_frequency: "Quarterly",
  backup_frequency: "Daily",
  retention_days: "90",
  vendor_review: "Annually",
  has_bcp: false,
};

interface PolicyTemplate {
  type: string;
  title: string;
  generate: (a: PolicyAnswers) => string;
}

const today = () => new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export const POLICY_TEMPLATES: PolicyTemplate[] = [
  {
    type: "information_security",
    title: "Information Security Policy",
    generate: (a) => `# Information Security Policy

**${a.company_name}** | Effective: ${today()} | Version 1.0

## Purpose
This policy establishes the framework for protecting ${a.company_name}'s information assets from unauthorized access, disclosure, alteration, and destruction.

## Scope
Applies to all ${a.employee_count === "1-10" ? "team members" : "employees"}, contractors, and third parties who access company systems.${a.remote_work ? " This includes remote workers accessing systems from personal or company devices." : ""}

## Infrastructure
${a.company_name} operates on ${a.cloud_provider}. All production infrastructure is managed through infrastructure-as-code and version-controlled deployments.

## Access Control
- Multi-factor authentication is ${a.mfa_enforced ? "required" : "recommended"} for all production systems and cloud consoles
- Minimum password length: ${a.password_min_length} characters
- Least-privilege access model enforced
- Access reviews conducted ${a.access_review_frequency.toLowerCase()}

## Data Protection
- Data classification: ${a.data_types}
- All customer data encrypted at rest (AES-256)
- All data in transit encrypted (TLS 1.2+)
- Key rotation performed at least annually

## Incident Response
- All security incidents reported within 1 hour to ${a.incident_email}
- Incident response plan tested annually
- Security lead: ${a.security_lead}

## Risk Management
- Annual risk assessments conducted
- Risk register maintained and reviewed quarterly

## Enforcement
Violations may result in disciplinary action up to termination.

## Review
This policy is reviewed annually or when significant changes occur to ${a.company_name}'s infrastructure or operations.`,
  },

  {
    type: "access_control",
    title: "Access Control Policy",
    generate: (a) => `# Access Control Policy

**${a.company_name}** | Effective: ${today()} | Version 1.0

## Purpose
Establish requirements for managing access to ${a.company_name}'s information systems and data.

## Principles
- **Least Privilege:** Users receive the minimum access required for their role
- **Separation of Duties:** No single user controls an entire critical process
- **Need-to-Know:** Access is scoped to required resources only

## Authentication
- Minimum password length: ${a.password_min_length} characters
- MFA ${a.mfa_enforced ? "required" : "strongly recommended"} for all cloud consoles, identity providers, and source code repositories
- Session timeout: 30 minutes idle
- Account lockout after 5 failed attempts

## Provisioning
1. Manager submits access request with business justification
2. ${a.security_lead} reviews against the role-based access control (RBAC) matrix
3. Access provisioned, logged, and confirmed with the requesting manager

## Access Reviews
- User access reviewed ${a.access_review_frequency.toLowerCase()}
- Privileged access reviewed monthly
- Annual certification by department managers or ${a.security_lead}

## Offboarding
- All access revoked within 4 hours of termination notification
- Company devices retrieved within 24 hours
- Shared credentials rotated within 24 hours of any departure

## Remote Access
${a.remote_work ? `- VPN or zero-trust network access required for production systems
- Company-managed or MDM-enrolled devices required
- Screen lock required when devices are unattended` : "- Remote access is not standard. Exceptions require written approval from " + a.security_lead + "."}

## Review
Reviewed ${a.access_review_frequency.toLowerCase()} alongside access review cycles.`,
  },

  {
    type: "incident_response",
    title: "Incident Response Plan",
    generate: (a) => `# Incident Response Plan

**${a.company_name}** | Effective: ${today()} | Version 1.0

## Incident Commander
${a.security_lead} (${a.incident_email})

## Severity Levels

| Level | Definition | Response Time |
|-------|-----------|---------------|
| SEV-1 | Active breach, data exfiltration | 15 minutes |
| SEV-2 | Confirmed unauthorized access | 1 hour |
| SEV-3 | Suspected access, malware detected | 4 hours |
| SEV-4 | Minor anomaly, policy violation | 24 hours |

## Response Phases

### 1. Detection
- Automated monitoring via ${a.cloud_provider} native tools (GuardDuty, Security Hub, CloudTrail)
- Employee reporting to ${a.incident_email}
- Third-party vulnerability disclosures

### 2. Triage
- Classify severity using the table above
- Identify scope: which systems, which data, which users
- Notify ${a.security_lead} immediately for SEV-1 and SEV-2

### 3. Containment
- Isolate affected systems (revoke network access, disable compromised credentials)
- Preserve forensic evidence (snapshots, logs)
- Do not reboot or wipe systems until evidence is secured

### 4. Eradication
- Remove the threat (patch vulnerability, remove malware, rotate credentials)
- Verify no persistence mechanisms remain

### 5. Recovery
- Restore from verified backups (backup frequency: ${a.backup_frequency.toLowerCase()})
- Monitor restored systems for 72 hours post-recovery
- Confirm integrity of restored data

### 6. Post-Incident Review
- Conduct root-cause analysis within 5 business days
- Document lessons learned
- Update this plan if gaps are identified
- Notify affected customers if ${a.data_types.includes("PII") || a.data_types.includes("PHI") ? "personal data was involved (per applicable breach notification laws)" : "customer data was compromised"}

## Communication
- Internal: Slack #incident channel + email to all-hands for SEV-1
- External: Customers notified within 72 hours for confirmed breaches
- Legal counsel engaged for SEV-1 and SEV-2

## Testing
This plan is tested at least annually via tabletop exercise.`,
  },

  {
    type: "data_classification",
    title: "Data Classification Policy",
    generate: (a) => `# Data Classification Policy

**${a.company_name}** | Effective: ${today()} | Version 1.0

## Purpose
Define how ${a.company_name} classifies, handles, and protects data based on sensitivity.

## Classification Levels

| Level | Definition | Examples |
|-------|-----------|----------|
| Confidential | Highest sensitivity. Breach causes significant harm. | ${a.data_types.includes("PII") ? "Customer PII, " : ""}${a.data_types.includes("PHI") ? "PHI, " : ""}credentials, encryption keys |
| Internal | Business-sensitive. Not for public sharing. | Financial data, employee records, source code, internal docs |
| Public | No sensitivity. Intended for external audiences. | Marketing materials, public docs, open-source code |

## Handling Requirements

### Confidential
- Encrypted at rest and in transit (AES-256 / TLS 1.2+)
- Access restricted to authorized personnel only
- Logged access with audit trail
- Retention: ${a.retention_days} days, then securely destroyed

### Internal
- Encrypted in transit
- Access controlled via RBAC
- Stored on company-managed systems only

### Public
- No special handling required
- Verify accuracy before publication

## Data Retention
- Default retention period: ${a.retention_days} days unless a legal or contractual obligation requires longer
- Data destruction: cryptographic erasure or certified physical destruction
- Destruction logged and certificates retained

## Review
Reviewed annually by ${a.security_lead}.`,
  },

  {
    type: "encryption",
    title: "Encryption Policy",
    generate: (a) => `# Encryption Policy

**${a.company_name}** | Effective: ${today()} | Version 1.0

## Purpose
Define encryption standards for protecting ${a.company_name}'s data at rest and in transit.

## Standards

### Data at Rest
- Algorithm: AES-256
- Key management: ${a.cloud_provider} KMS (managed keys with automatic rotation)
- Scope: all production databases, object storage, backups, and snapshots

### Data in Transit
- Protocol: TLS 1.2 or higher (TLS 1.0 and 1.1 disabled)
- Internal service-to-service: mTLS where supported
- Certificate management: automated via ${a.cloud_provider} Certificate Manager or Let's Encrypt

### Key Management
- Encryption keys managed through ${a.cloud_provider} KMS
- Key rotation: at least annually (automated)
- Key access restricted to ${a.security_lead} and designated infrastructure roles
- Key usage logged and auditable

### Endpoint
${a.remote_work ? "- Full-disk encryption required on all company and BYOD devices\n- FileVault (macOS) or BitLocker (Windows) enforced via MDM" : "- Full-disk encryption required on all company devices"}

## Prohibited
- Storing unencrypted credentials in source code, config files, or chat
- Using deprecated algorithms (DES, 3DES, RC4, MD5, SHA-1)
- Transmitting confidential data over unencrypted channels

## Review
Reviewed annually by ${a.security_lead}.`,
  },

  {
    type: "vendor_management",
    title: "Vendor Management Policy",
    generate: (a) => `# Vendor Management Policy

**${a.company_name}** | Effective: ${today()} | Version 1.0

## Purpose
Establish requirements for evaluating, onboarding, and monitoring third-party vendors who access ${a.company_name}'s systems or data.

## Scope
Applies to all vendors, contractors, and SaaS providers who process, store, or have access to ${a.company_name}'s data or infrastructure.

## Vendor Assessment
Before onboarding, all vendors handling confidential or internal data must provide:
- SOC 2 Type II report (or equivalent: ISO 27001, PCI DSS)
- Privacy policy and data processing agreement (DPA)
- Evidence of encryption practices
- Incident notification commitment

## Risk Tiering

| Tier | Criteria | Review Frequency |
|------|----------|-----------------|
| Critical | Access to production data or infrastructure | ${a.vendor_review} + continuous monitoring |
| Standard | Access to internal tools, no production data | ${a.vendor_review} |
| Low | No data access, replaceable | At onboarding only |

## Ongoing Monitoring
- Critical vendors: review SOC 2 report annually, monitor for breaches
- All vendors: reassess when renewing contracts or changing scope
- Vendor inventory maintained in ShieldBase's vendor register

## Offboarding
- Access revoked within 24 hours of contract termination
- Data return or destruction confirmed in writing
- Credentials rotated for any shared integrations

## Review
Reviewed ${a.vendor_review.toLowerCase()} by ${a.security_lead}.`,
  },

  {
    type: "bcp_dr",
    title: "Business Continuity Plan",
    generate: (a) => `# Business Continuity Plan

**${a.company_name}** | Effective: ${today()} | Version 1.0

## Purpose
Ensure ${a.company_name} can maintain critical operations during and after a disruptive event.

## Scope
Covers all production systems, customer-facing services, and supporting infrastructure hosted on ${a.cloud_provider}.

## Recovery Objectives
- **RTO (Recovery Time Objective):** 4 hours for critical services
- **RPO (Recovery Point Objective):** ${a.backup_frequency === "Continuous" ? "Near-zero (continuous replication)" : a.backup_frequency === "Daily" ? "24 hours (daily backups)" : "7 days (weekly backups)"}

## Backup Strategy
- Frequency: ${a.backup_frequency}
- Storage: ${a.cloud_provider} cross-region backup (separate from primary)
- Retention: ${a.retention_days} days
- Encryption: AES-256 at rest
- Restore testing: at least annually

## Disaster Scenarios

| Scenario | Response |
|----------|----------|
| Region outage | Failover to secondary ${a.cloud_provider} region |
| Data corruption | Restore from last verified backup |
| Security breach | Follow Incident Response Plan, isolate and restore |
| Key personnel unavailable | Cross-trained backups for all critical roles |

## Communication
- Internal: Slack #incident channel, all-hands email
- External: Status page updated within 30 minutes of confirmed outage
- Customer notification: within 4 hours for data-affecting incidents

## Testing
- BCP/DR tested at least annually via tabletop exercise or failover drill
- Results documented with lessons learned

## Review
Reviewed annually by ${a.security_lead}.`,
  },

  {
    type: "acceptable_use",
    title: "Acceptable Use Policy",
    generate: (a) => `# Acceptable Use Policy

**${a.company_name}** | Effective: ${today()} | Version 1.0

## Purpose
Define acceptable and prohibited uses of ${a.company_name}'s technology resources.

## Scope
All ${a.employee_count === "1-10" ? "team members" : "employees"}, contractors, and anyone using ${a.company_name}'s systems, devices, or network.

## Acceptable Use
- Business-related activities using company-provided tools
- Reasonable personal use that does not interfere with work or security
- Accessing only the systems and data you are authorized to use

## Prohibited Activities
- Sharing credentials or authentication tokens with anyone
- Installing unauthorized software on company devices
- Accessing systems or data beyond your authorized scope
- Circumventing security controls (VPN bypass, disabling endpoint protection)
- Storing company data on personal cloud storage (Dropbox, personal Google Drive)
- Using company systems for illegal activities

## Email and Communication
- @${a.domain} email used for all business communication
- Do not open suspicious attachments or click unverified links
- Report phishing attempts to ${a.incident_email}

## Devices
${a.remote_work ? `- Company or MDM-enrolled personal devices only for accessing production systems
- Screen lock required (max 5-minute idle timeout)
- Full-disk encryption required
- Auto-updates enabled for OS and security patches` : `- Company devices only for accessing production systems
- Devices must not leave the office without approval`}

## Enforcement
Violations may result in access revocation, disciplinary action, or termination.

## Acknowledgement
All ${a.employee_count === "1-10" ? "team members" : "employees"} must acknowledge this policy within 30 days of joining and annually thereafter.`,
  },
];
