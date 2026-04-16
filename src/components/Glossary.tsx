"use client";
import { ReactNode } from "react";

// Dotted-underline helper that shows a plain-English definition on hover/focus.
// Used to demystify auditor jargon (PBC, IPE, disposition, etc.) without
// hiding the term — auditors still see it in its native form.

const DEFS: Record<string, string> = {
  PBC: "Provided By Client — a request from your auditor for a specific piece of evidence (e.g. a screenshot, a policy, a list of users). You respond with notes + an artifact.",
  IPE: "Information Produced by Entity — any report your company generates (a SQL query output, an HR report) that the auditor relies on. Needs completeness + accuracy testing.",
  disposition: "The auditor's formal judgment on a finding: observation, deficiency, significant deficiency, or material weakness. Drives how it shows up in the final report.",
  walkthrough: "A conversational audit procedure where the auditor steps through a process with someone who performs it, to understand how it works in practice.",
  sampling: "Picking a representative subset of a control's executions (e.g. 3 of 12 monthly access reviews) and testing them as a proxy for all of them.",
  crosswalk: "A mapping between different frameworks (SOC 2 → ISO 27001, HIPAA, PCI) so one control satisfies requirements across several certifications.",
  TSC: "Trust Services Criteria — the 100+ requirements that make up a SOC 2 report, organized into Security, Availability, Confidentiality, Processing Integrity, and Privacy.",
  control: "A specific practice or configuration that reduces a security risk. SOC 2 evaluates whether your controls are designed right and operating effectively.",
  finding: "An exception the auditor noted during testing. Not every finding is a problem — some are minor observations.",
};

export default function Glossary({ term, children }: { term: string; children?: ReactNode }) {
  const def = DEFS[term] ?? DEFS[term.toUpperCase()] ?? "";
  const label = children ?? term;
  if (!def) return <>{label}</>;
  return (
    <span className="relative group inline-block">
      <span className="border-b border-dotted border-[var(--color-muted)] cursor-help">{label}</span>
      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-[var(--color-foreground)] text-[var(--color-surface)] text-xs font-normal leading-snug px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition pointer-events-none z-50 shadow-lg">
        {def}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[var(--color-foreground)]" />
      </span>
    </span>
  );
}
