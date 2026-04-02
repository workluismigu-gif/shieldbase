// Maps Prowler findings to SOC 2 Trust Services Criteria
// Prowler outputs checks with check_id, status (PASS/FAIL/WARN), service, etc.

export interface ProwlerFinding {
  // Legacy v3/v4 format
  check_id?: string;
  check_title?: string;
  status?: "PASS" | "FAIL" | "WARN" | "INFO" | "MUTED";
  status_extended?: string;
  service_name?: string;
  resource_id?: string;
  region?: string;
  severity?: string;
  resource_type?: string;
  finding_info?: { check_id: string; title: string };
  compliance?: Record<string, string[]>;
  // v5 OCSF format
  metadata?: { event_code?: string; product?: { name?: string } };
  finding?: { title?: string; uid?: string };
  status_code?: string; // "PASS" | "FAIL"
  severity_id?: number;
  resources?: Array<{ uid?: string; region?: string; type?: string }>;
}

export interface MappedControl {
  control_id: string;
  category: string;
  title: string;
  description: string;
  status: "compliant" | "partial" | "non_compliant" | "not_assessed";
  severity: "critical" | "high" | "medium" | "low";
  prowler_checks: string[];
  findings: ProwlerFinding[];
}

// Map Prowler check IDs → SOC 2 controls
const PROWLER_TO_SOC2: Record<string, { control_id: string; category: string; title: string; severity: "critical" | "high" | "medium" | "low" }> = {
  // MFA
  "iam_root_hardware_mfa_enabled": { control_id: "CC6.1", category: "CC6", title: "Root account MFA enabled", severity: "critical" },
  "iam_root_mfa_enabled": { control_id: "CC6.1", category: "CC6", title: "Root account MFA enabled", severity: "critical" },
  "iam_user_mfa_enabled_console_access": { control_id: "CC6.1", category: "CC6", title: "Console users have MFA", severity: "critical" },
  "iam_user_no_setup_initial_access_key": { control_id: "CC6.2", category: "CC6", title: "No unused initial access keys", severity: "high" },
  "iam_user_accesskey_unused": { control_id: "CC6.3", category: "CC6", title: "No unused access keys", severity: "high" },
  "iam_password_policy_minimum_length_14": { control_id: "CC6.1", category: "CC6", title: "Password minimum length 14+", severity: "medium" },
  "iam_password_policy_reuse_24": { control_id: "CC6.1", category: "CC6", title: "Password reuse prevention", severity: "medium" },
  "iam_policy_no_full_access_to_all_services": { control_id: "CC6.3", category: "CC6", title: "No IAM policies with full admin access", severity: "high" },
  "iam_no_root_access_key": { control_id: "CC6.1", category: "CC6", title: "No root account access keys", severity: "critical" },

  // Encryption at rest
  "s3_bucket_default_encryption": { control_id: "C1.1", category: "C1", title: "S3 bucket default encryption", severity: "high" },
  "rds_instance_storage_encrypted": { control_id: "C1.1", category: "C1", title: "RDS storage encryption", severity: "critical" },
  "ec2_ebs_volume_encryption": { control_id: "C1.1", category: "C1", title: "EBS volume encryption", severity: "high" },
  "dynamodb_table_encryption_enabled": { control_id: "C1.1", category: "C1", title: "DynamoDB table encryption", severity: "high" },
  "rds_snapshots_public_access": { control_id: "C1.1", category: "C1", title: "RDS snapshots not public", severity: "critical" },

  // Encryption in transit
  "elb_ssl_listeners": { control_id: "CC6.6", category: "CC6", title: "ELB uses SSL/TLS listeners", severity: "high" },
  "s3_bucket_secure_transport_policy": { control_id: "CC6.6", category: "CC6", title: "S3 secure transport policy", severity: "medium" },

  // Logging & Monitoring
  "cloudtrail_multi_region_enabled": { control_id: "CC7.2", category: "CC7", title: "CloudTrail multi-region enabled", severity: "critical" },
  "cloudtrail_logs_s3_bucket_is_not_publicly_accessible": { control_id: "CC7.2", category: "CC7", title: "CloudTrail logs not publicly accessible", severity: "critical" },
  "cloudtrail_log_file_validation_enabled": { control_id: "CC7.2", category: "CC7", title: "CloudTrail log file validation", severity: "high" },
  "cloudwatch_log_group_retention_policy_specific_days_enabled": { control_id: "CC7.2", category: "CC7", title: "CloudWatch log retention configured", severity: "medium" },
  "guardduty_is_enabled": { control_id: "CC7.2", category: "CC7", title: "GuardDuty enabled", severity: "high" },
  "securityhub_enabled": { control_id: "CC7.2", category: "CC7", title: "Security Hub enabled", severity: "medium" },
  "vpc_flow_logs_enabled": { control_id: "CC7.2", category: "CC7", title: "VPC Flow Logs enabled", severity: "high" },
  "config_recorder_all_regions_enabled": { control_id: "CC7.1", category: "CC7", title: "AWS Config enabled all regions", severity: "high" },

  // Network / Access
  "ec2_securitygroup_allow_ingress_from_internet_to_ssh_port_22": { control_id: "CC6.6", category: "CC6", title: "No SSH open to internet", severity: "critical" },
  "ec2_securitygroup_allow_ingress_from_internet_to_rdp_port_3389": { control_id: "CC6.6", category: "CC6", title: "No RDP open to internet", severity: "critical" },
  "s3_bucket_public_access": { control_id: "CC6.6", category: "CC6", title: "S3 buckets not publicly accessible", severity: "critical" },
  "s3_account_level_public_access_blocks": { control_id: "CC6.6", category: "CC6", title: "S3 account-level public access block", severity: "high" },
  "ec2_instance_public_ip": { control_id: "CC6.6", category: "CC6", title: "EC2 instances not public unless required", severity: "medium" },

  // Backup & Recovery
  "rds_instance_backup_enabled": { control_id: "A1.2", category: "A1", title: "RDS automated backups enabled", severity: "high" },
  "dynamodb_tables_pitr_enabled": { control_id: "A1.2", category: "A1", title: "DynamoDB point-in-time recovery enabled", severity: "medium" },
  "ec2_instance_managed_by_ssm": { control_id: "CC7.1", category: "CC7", title: "EC2 instances managed by SSM", severity: "medium" },

  // Vulnerability Management
  "ecr_repositories_scan_vulnerabilities_in_latest_image": { control_id: "CC7.1", category: "CC7", title: "ECR image vulnerability scanning", severity: "high" },
  "inspector2_is_enabled": { control_id: "CC7.1", category: "CC7", title: "AWS Inspector enabled", severity: "medium" },

  // Key Management
  "kms_cmk_rotation_enabled": { control_id: "C1.1", category: "C1", title: "KMS key rotation enabled", severity: "medium" },
};

export function parseProwlerOutput(raw: unknown): MappedControl[] {
  let findings: ProwlerFinding[] = [];

  // Handle both array and object formats
  if (Array.isArray(raw)) {
    findings = raw as ProwlerFinding[];
  } else if (typeof raw === "object" && raw !== null) {
    // Some Prowler versions wrap in { findings: [...] }
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.findings)) findings = obj.findings as ProwlerFinding[];
    else if (Array.isArray(obj.data)) findings = obj.data as ProwlerFinding[];
  }

  // Group findings by SOC2 control
  const controlMap: Record<string, MappedControl> = {};

  // Initialize all known controls as not_assessed
  for (const [checkId, mapping] of Object.entries(PROWLER_TO_SOC2)) {
    if (!controlMap[mapping.control_id]) {
      controlMap[mapping.control_id] = {
        control_id: mapping.control_id,
        category: mapping.category,
        title: mapping.title,
        description: `Automated assessment via Prowler check: ${checkId}`,
        status: "not_assessed",
        severity: mapping.severity,
        prowler_checks: [],
        findings: [],
      };
    }
  }

  // Map findings to controls
  for (const finding of findings) {
    // Support both v4 (check_id) and v5 OCSF (metadata.event_code) formats
    const checkId = finding.check_id || finding.finding_info?.check_id || finding.metadata?.event_code || "";
    const mapping = PROWLER_TO_SOC2[checkId];
    if (!mapping) continue;

    const control = controlMap[mapping.control_id];
    if (!control.prowler_checks.includes(checkId)) {
      control.prowler_checks.push(checkId);
    }
    control.findings.push(finding);
  }

  // Calculate status for each control
  for (const control of Object.values(controlMap)) {
    if (control.findings.length === 0) {
      control.status = "not_assessed";
      continue;
    }
    // Support both v4 status field and v5 OCSF status_code field
    const getStatus = (f: ProwlerFinding) => f.status || f.status_code || "";
    const passes = control.findings.filter(f => getStatus(f) === "PASS").length;
    const fails = control.findings.filter(f => getStatus(f) === "FAIL").length;
    if (fails === 0) control.status = "compliant";
    else if (passes > 0) control.status = "partial";
    else control.status = "non_compliant";
  }

  return Object.values(controlMap);
}

export function calculateScore(controls: MappedControl[]): number {
  if (controls.length === 0) return 0;
  const assessed = controls.filter(c => c.status !== "not_assessed");
  if (assessed.length === 0) return 0;
  const compliant = assessed.filter(c => c.status === "compliant").length;
  const partial = assessed.filter(c => c.status === "partial").length;
  return Math.round(((compliant + partial * 0.5) / assessed.length) * 100);
}

export function generateSummary(controls: MappedControl[]) {
  const total = controls.length;
  const compliant = controls.filter(c => c.status === "compliant").length;
  const partial = controls.filter(c => c.status === "partial").length;
  const nonCompliant = controls.filter(c => c.status === "non_compliant").length;
  const notAssessed = controls.filter(c => c.status === "not_assessed").length;
  const critical = controls.filter(c => c.status === "non_compliant" && c.severity === "critical").length;
  const score = calculateScore(controls);
  return { total, compliant, partial, nonCompliant, notAssessed, critical, score };
}
