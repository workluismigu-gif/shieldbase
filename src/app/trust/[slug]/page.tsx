import type { Metadata } from "next";
import {
  ShieldCheck, Clock, CalendarClock, Shield, ServerCog, EyeOff, Scale,
  Cloud, MessageSquare, Activity, Lock, Mail, ArrowUpRight, Plus,
  CheckCircle2, KeyRound
} from "lucide-react";
import { Github } from "@/components/icons/GithubIcon";

type LucideIcon = React.ComponentType<{ className?: string; strokeWidth?: number }>;

const mockCompany = {
  name: "Acme SaaS Inc.",
  slug: "acme-saas",
  tagline: "Building fast, staying secure.",
  website: "https://acmesaas.com",
  description: "Acme SaaS is a B2B platform helping companies automate their workflows. We take the security of your data seriously.",
  initials: "AS",
  complianceScore: 87,
  frameworks: [
    { name: "SOC 2 Type I", status: "certified" as const, date: "March 2026" },
    { name: "SOC 2 Type II", status: "in_progress" as const, date: "Est. Q3 2026" },
    { name: "ISO 27001", status: "planned" as const, date: "2027" },
  ],
  controls: {
    total: 52,
    compliant: 45,
    categories: [
      { name: "Security", score: 89, Icon: Shield as LucideIcon },
      { name: "Availability", score: 92, Icon: ServerCog as LucideIcon },
      { name: "Confidentiality", score: 88, Icon: EyeOff as LucideIcon },
      { name: "Processing Integrity", score: 85, Icon: Scale as LucideIcon },
    ],
  },
  policies: [
    "Information Security Policy",
    "Access Control Policy",
    "Incident Response Plan",
    "Data Classification Policy",
    "Encryption Policy",
    "Vendor Management Policy",
    "Business Continuity Plan",
  ],
  integrations: [
    { name: "AWS", Icon: Cloud as LucideIcon, description: "Cloud infrastructure" },
    { name: "GitHub", Icon: Github as LucideIcon, description: "Source control" },
    { name: "Google Workspace", Icon: Mail as LucideIcon, description: "Identity & email" },
    { name: "Slack", Icon: MessageSquare as LucideIcon, description: "Communication" },
    { name: "Datadog", Icon: Activity as LucideIcon, description: "Monitoring" },
    { name: "CrowdStrike", Icon: Lock as LucideIcon, description: "Endpoint security" },
  ],
  lastUpdated: "March 31, 2026",
  contact: "security@acmesaas.com",
  faqs: [
    { q: "Do you have a SOC 2 report?", a: "Yes. We completed our SOC 2 Type I audit in March 2026. Our Type II audit period begins Q2 2026. Contact us to request the full report under NDA." },
    { q: "How do you handle data encryption?", a: "All customer data is encrypted at rest using AES-256 and in transit using TLS 1.2+. Encryption keys are managed via AWS KMS with annual rotation." },
    { q: "What is your incident response process?", a: "We have a documented Incident Response Plan with defined severity levels and escalation procedures. Critical incidents are responded to within 15 minutes 24/7." },
    { q: "How do you manage vendor security?", a: "All critical vendors undergo annual security assessments. We require SOC 2 reports or equivalent certifications from vendors with access to customer data." },
    { q: "Where is customer data stored?", a: "All customer data is stored in AWS us-east-1 (Virginia). We do not transfer data outside the United States without customer consent." },
    { q: "Can I request a full SOC 2 report?", a: "Yes. Request it at security@acmesaas.com. We'll provide access under NDA within 1 business day." },
  ],
};

const statusMeta = {
  certified: { label: "Certified", Icon: ShieldCheck, className: "text-[var(--color-success)] bg-[var(--color-success-bg)]" },
  in_progress: { label: "In Progress", Icon: Clock, className: "text-[var(--color-info)] bg-[var(--color-info-bg)]" },
  planned: { label: "Planned", Icon: CalendarClock, className: "text-[var(--color-muted)] bg-[var(--color-surface-2)]" },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  await params;
  return {
    title: `${mockCompany.name} — Trust Center | ShieldBase`,
    description: `${mockCompany.name}'s security posture and compliance status.`,
  };
}

export default async function TrustCenterPage({ params }: { params: Promise<{ slug: string }> }) {
  await params;
  const company = mockCompany;
  const pct = Math.round((company.controls.compliant / company.controls.total) * 100);

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <header className="bg-[var(--color-bg)]/70 backdrop-blur-xl border-b border-[var(--color-border)] sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-foreground)] text-[var(--color-surface)] flex items-center justify-center font-bold text-sm tracking-tight">
              {company.initials}
            </div>
            <div>
              <div className="font-semibold text-[var(--color-foreground)] text-[15px] leading-tight">{company.name}</div>
              <div className="text-xs text-[var(--color-muted)] mt-0.5">Trust Center</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href={company.website} target="_blank" rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition">
              {company.website.replace("https://", "")}
              <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.8} />
            </a>
            <a href={`mailto:${company.contact}?subject=Security inquiry`}
              className="inline-flex items-center gap-2 bg-[var(--color-foreground)] hover:opacity-90 text-[var(--color-surface)] text-sm px-4 py-2 rounded-lg font-medium transition">
              Contact Security
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-14 space-y-14">
        {/* Hero */}
        <section className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-muted)] bg-[var(--color-surface-2)] border border-[var(--color-border)] px-3 py-1 rounded-full mb-5">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-success)]" strokeWidth={2} />
            Verified by ShieldBase
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold text-[var(--color-foreground)] tracking-tight mb-4">{company.name}</h1>
          <p className="text-[var(--color-muted)] text-base leading-relaxed">{company.description}</p>
          <p className="text-xs text-[var(--color-muted)] mt-5">Last updated {company.lastUpdated}</p>
        </section>

        {/* Overall score */}
        <section className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-10 text-center">
          <div className="text-7xl font-semibold text-[var(--color-foreground)] tracking-tight tabular-nums">{pct}%</div>
          <div className="text-sm font-medium text-[var(--color-foreground-subtle)] mt-2">Compliance controls passing</div>
          <div className="text-xs text-[var(--color-muted)] mt-1">{company.controls.compliant} of {company.controls.total} SOC 2 controls verified</div>
          <div className="w-full bg-[var(--color-surface-2)] rounded-full h-1.5 max-w-sm mx-auto mt-6 overflow-hidden">
            <div className="bg-[var(--color-success)] h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </section>

        {/* Certifications */}
        <section>
          <h2 className="text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider mb-4">Certifications & Frameworks</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {company.frameworks.map((f, i) => {
              const meta = statusMeta[f.status];
              return (
                <div key={i} className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-6">
                  <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md mb-4 ${meta.className}`}>
                    <meta.Icon className="w-3.5 h-3.5" strokeWidth={2} />
                    {meta.label}
                  </div>
                  <div className="font-semibold text-[var(--color-foreground)]">{f.name}</div>
                  <div className="text-xs text-[var(--color-muted)] mt-1">{f.date}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Control categories */}
        <section>
          <h2 className="text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider mb-4">Security Controls by Category</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {company.controls.categories.map((cat, i) => (
              <div key={i} className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-foreground-subtle)]">
                      <cat.Icon className="w-[18px] h-[18px]" strokeWidth={1.6} />
                    </div>
                    <span className="font-medium text-[var(--color-foreground)]">{cat.name}</span>
                  </div>
                  <span className="text-lg font-semibold text-[var(--color-foreground)] tabular-nums">{cat.score}%</span>
                </div>
                <div className="w-full bg-[var(--color-surface-2)] rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full rounded-full ${cat.score >= 90 ? "bg-[var(--color-success)]" : cat.score >= 75 ? "bg-[var(--color-info)]" : "bg-[var(--color-warning)]"}`}
                    style={{ width: `${cat.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Policies */}
        <section>
          <h2 className="text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider mb-4">Security Policies</h2>
          <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
            {company.policies.map((policy, i) => (
              <div key={i} className={`flex items-center gap-3 px-5 py-3.5 ${i < company.policies.length - 1 ? "border-b border-[var(--color-border)]" : ""}`}>
                <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] flex-shrink-0" strokeWidth={2} />
                <span className="text-sm text-[var(--color-foreground)]">{policy}</span>
                <span className="ml-auto inline-flex items-center text-xs font-medium text-[var(--color-success)] bg-[var(--color-success-bg)] px-2 py-0.5 rounded-md">Approved</span>
              </div>
            ))}
          </div>
        </section>

        {/* Integrations */}
        <section>
          <h2 className="text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider mb-4">Security Tools & Integrations</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {company.integrations.map((int, i) => (
              <div key={i} className="bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-foreground-subtle)]">
                  <int.Icon className="w-[18px] h-[18px]" strokeWidth={1.6} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[var(--color-foreground)] truncate">{int.name}</div>
                  <div className="text-xs text-[var(--color-muted)] truncate">{int.description}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider mb-4">Security FAQ</h2>
          <div className="space-y-2">
            {company.faqs.map((faq, i) => (
              <details key={i} className="bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] group">
                <summary className="flex items-center justify-between p-5 cursor-pointer font-medium text-[var(--color-foreground)] text-sm list-none">
                  {faq.q}
                  <Plus className="w-4 h-4 text-[var(--color-muted)] group-open:rotate-45 transition-transform ml-4 flex-shrink-0" strokeWidth={1.8} />
                </summary>
                <div className="px-5 pb-5 text-sm text-[var(--color-foreground-subtle)] leading-relaxed">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[var(--color-foreground)] rounded-2xl p-10 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--color-surface)]/10 mb-4">
            <KeyRound className="w-5 h-5 text-[var(--color-surface)]" strokeWidth={1.8} />
          </div>
          <h3 className="text-xl font-semibold text-[var(--color-surface)] mb-2">Need our full security report?</h3>
          <p className="text-[var(--color-surface)]/60 text-sm mb-6 max-w-md mx-auto">Request our SOC 2 Type I report, penetration test summary, or security questionnaire under NDA.</p>
          <a href={`mailto:${company.contact}?subject=Security report request`}
            className="inline-flex items-center gap-2 bg-[var(--color-surface)] text-[var(--color-foreground)] hover:opacity-90 px-6 py-2.5 rounded-lg font-medium text-sm transition">
            Request security report
            <ArrowUpRight className="w-4 h-4" strokeWidth={1.8} />
          </a>
        </section>

        <div className="text-center text-xs text-[var(--color-muted)] pb-8">
          Powered by <a href="https://shieldbase.vercel.app" className="text-[var(--color-foreground-subtle)] hover:text-[var(--color-foreground)] font-medium">ShieldBase</a>
        </div>
      </div>
    </div>
  );
}
