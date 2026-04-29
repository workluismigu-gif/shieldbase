"use client";
import { useMemo } from "react";
import Link from "next/link";
import { useOrg } from "@/lib/org-context";
import { Check, Circle, ArrowRight, BookOpen } from "lucide-react";

// Step-by-step onboarding checklist for founders. Shows on the dashboard
// when the org is early in setup. Disappears once all steps are done.

interface Step {
  id: string;
  title: string;
  description: string;
  href: string;
  done: boolean;
}

export default function GettingStartedGuide() {
  const { org, role, controls, tasks, policies } = useOrg();
  const auditModeOn = !!org?.audit_mode_enabled;
  const isOwner = role === "owner" || role === "admin";
  if (!isOwner || auditModeOn) return null;

  const tech = (org?.tech_stack ?? {}) as Record<string, unknown>;

  const steps: Step[] = useMemo(() => [
    {
      id: "connect",
      title: "Connect your first integration",
      description: "AWS, GitHub, or Slack. We'll start scanning automatically.",
      href: "/dashboard/settings",
      done: !!(tech.aws_role_arn || tech.github_token || tech.slack_access_token || tech.google_access_token || tech.azure_access_token),
    },
    {
      id: "scan",
      title: "Wait for your first scan",
      description: "Takes a few minutes after connecting. You'll see controls appear.",
      href: "/dashboard/monitoring",
      done: controls.length > 0,
    },
    {
      id: "policy",
      title: "Upload a security policy",
      description: "Information Security, Access Control, or Incident Response. Any one to start.",
      href: "/dashboard/policies",
      done: policies.length > 0,
    },
    {
      id: "checklist",
      title: "Complete 3 checklist tasks",
      description: "Block public S3, enable GuardDuty, enable VPC Flow Logs. Quick AWS wins.",
      href: "/dashboard/checklist",
      done: tasks.filter(t => t.completed).length >= 3,
    },
    {
      id: "trust",
      title: "Publish your trust center",
      description: "Share your compliance posture with prospects. One toggle in Settings.",
      href: "/dashboard/settings",
      done: !!org?.trust_published,
    },
  ], [tech, controls.length, policies.length, tasks, org?.trust_published]);

  const doneCount = steps.filter(s => s.done).length;
  const allDone = doneCount === steps.length;

  // Hide once all steps are complete — the FounderHero takes over.
  if (allDone) return null;

  return (
    <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[var(--color-foreground-subtle)]" strokeWidth={1.8} />
          <h3 className="font-semibold text-[var(--color-foreground)] text-sm">Getting started</h3>
        </div>
        <span className="text-xs text-[var(--color-muted)]">{doneCount}/{steps.length} complete</span>
      </div>

      <div className="space-y-1">
        {steps.map((step, i) => (
          <Link key={step.id} href={step.href}
            className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition group ${step.done ? "opacity-60" : "hover:bg-[var(--color-surface-2)]"}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border ${
              step.done
                ? "bg-[var(--color-success)] border-[var(--color-success)] text-white"
                : "border-[var(--color-border-strong)] text-[var(--color-muted)]"
            }`}>
              {step.done ? <Check className="w-3 h-3" strokeWidth={3} /> : <span className="text-[10px] font-bold">{i + 1}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${step.done ? "line-through text-[var(--color-muted)]" : "text-[var(--color-foreground)]"}`}>
                {step.title}
              </div>
              <div className="text-xs text-[var(--color-muted)] mt-0.5">{step.description}</div>
            </div>
            {!step.done && (
              <ArrowRight className="w-3.5 h-3.5 text-[var(--color-muted)] opacity-0 group-hover:opacity-100 transition mt-1 flex-shrink-0" />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
