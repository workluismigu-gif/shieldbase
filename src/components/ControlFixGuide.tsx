"use client";
import { Lightbulb } from "lucide-react";

// Plain-English remediation hints for common failing controls.
// Shown inside ControlTestModal when the control is non_compliant or partial.
// Helps founders who don't know what "CC7.4" means in practice.

const GUIDES: Record<string, { what: string; why: string; fix: string }> = {
  // AWS controls
  "CC5.2": {
    what: "CloudWatch log metric filter and alarm for Network ACL changes",
    why: "Your auditor checks that you detect unauthorized network changes. Without this, a bad actor could open ports without anyone noticing.",
    fix: "In the AWS console: CloudWatch > Log groups > select your CloudTrail log group > Create metric filter for { ($.eventName = CreateNetworkAcl*) || ($.eventName = DeleteNetworkAcl*) }. Then create an alarm on that metric.",
  },
  "CC7.1": {
    what: "Vulnerability scanning is enabled",
    why: "SOC 2 requires evidence that you actively look for vulnerabilities, not just react when one's exploited.",
    fix: "Enable AWS Inspector or GuardDuty in your account. GuardDuty is one click in the AWS console under Security.",
  },
  "CC7.4": {
    what: "GuardDuty is enabled for threat detection",
    why: "GuardDuty monitors for malicious activity and unauthorized behavior. It's CC7.4 (incident detection) evidence.",
    fix: "AWS Console > GuardDuty > Get Started > Enable GuardDuty. Takes 30 seconds. It starts monitoring immediately.",
  },
  "CC6.1": {
    what: "Multi-factor authentication on all IAM users",
    why: "2FA is the single most-tested SOC 2 control. If even one IAM user lacks MFA, the control fails.",
    fix: "AWS Console > IAM > Users > select each user > Security credentials > Assign MFA device. Use a virtual authenticator app.",
  },
  "CC6.6": {
    what: "S3 buckets are not publicly accessible",
    why: "Public S3 is the #1 cause of AWS data breaches. Every auditor checks this first.",
    fix: "AWS Console > S3 > select the bucket > Permissions > Block public access > Enable all four toggles. Or at account level: S3 > Account settings > Block all public access.",
  },
  "CC8.1": {
    what: "Infrastructure changes go through a change management process",
    why: "Your auditor needs evidence that changes are reviewed and approved before deployment.",
    fix: "If you use GitHub: enable branch protection on main (require PR review + status checks). This is your change management evidence.",
  },
  // Slack controls
  "slack_2fa_enforcement": {
    what: "All Slack users have 2FA enabled",
    why: "Workforce 2FA is CC6.1 evidence. Slack is where sensitive data lives.",
    fix: "Slack admin panel > Settings > Authentication > Require two-factor authentication for your workspace. Then notify your team to set it up.",
  },
  "slack_admin_sprawl": {
    what: "Too many Slack admins/owners",
    why: "Least-privilege principle (CC6.3). Having 8 admins on a 20-person team is a finding.",
    fix: "Slack admin panel > Manage Members > demote unnecessary admins to regular members. Keep 2-3 admins max for a small team.",
  },
  "slack_external_shared": {
    what: "Slack channels shared with external organizations",
    why: "External shared channels are a data boundary risk (CC6.6). Your auditor will flag these.",
    fix: "Review each shared channel. If it's not business-critical, disconnect it. Slack admin > Channels > filter by 'Externally shared'.",
  },
  // GitHub controls
  "github_branch_protection": {
    what: "Branch protection rules on main/default branch",
    why: "Change management evidence (CC8.1). Shows that code is reviewed before deployment.",
    fix: "GitHub > repo > Settings > Branches > Add rule for 'main'. Enable: Require pull request reviews (1+), Require status checks, Require linear history.",
  },
};

export default function ControlFixGuide({ controlId, status }: { controlId: string; status: string }) {
  if (status === "compliant") return null;

  // Try exact match, then prefix match (e.g. "CC7.4" matches guide for "CC7.4")
  const guide = GUIDES[controlId] ?? Object.entries(GUIDES).find(([k]) => controlId.startsWith(k))?.[1];

  if (!guide) {
    return (
      <div className="bg-[var(--color-info-bg)] border border-[var(--color-info)]/20 rounded-lg p-3 text-xs text-[var(--color-info)]">
        <div className="flex items-center gap-1.5 font-semibold mb-1">
          <Lightbulb className="w-3.5 h-3.5" strokeWidth={2} />
          How to fix this
        </div>
        <p>This control is {status === "non_compliant" ? "failing" : "partially passing"}. Open it to see details, or ask your auditor what evidence is needed.</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-info-bg)] border border-[var(--color-info)]/20 rounded-lg p-3 text-xs space-y-2">
      <div className="flex items-center gap-1.5 font-semibold text-[var(--color-info)]">
        <Lightbulb className="w-3.5 h-3.5" strokeWidth={2} />
        How to fix this
      </div>
      <div>
        <span className="font-medium text-[var(--color-foreground)]">What it checks: </span>
        <span className="text-[var(--color-foreground-subtle)]">{guide.what}</span>
      </div>
      <div>
        <span className="font-medium text-[var(--color-foreground)]">Why it matters: </span>
        <span className="text-[var(--color-foreground-subtle)]">{guide.why}</span>
      </div>
      <div>
        <span className="font-medium text-[var(--color-foreground)]">Steps to fix: </span>
        <span className="text-[var(--color-foreground-subtle)]">{guide.fix}</span>
      </div>
    </div>
  );
}
