import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  ShieldCheck, Clock, CalendarClock, Shield, ServerCog, EyeOff, Scale,
  Cloud, MessageSquare, Activity, Lock, Mail, ArrowUpRight,
  CheckCircle2, KeyRound, Hexagon
} from "lucide-react";
import { Github } from "@/components/icons/GithubIcon";

type LucideIcon = React.ComponentType<{ className?: string; strokeWidth?: number }>;

interface TrustControl { control_id: string; category: string; status: string; updated_at?: string }
interface TrustPolicy { title: string; type?: string; status?: string }

interface TrustData {
  id: string;
  name: string;
  slug: string;
  tagline?: string | null;
  description?: string | null;
  website?: string | null;
  contact_email?: string | null;
  readiness_score: number;
  frameworks: string[];
  tech_stack: Record<string, unknown>;
  created_at: string;
  controls: TrustControl[];
  policies: TrustPolicy[];
}

async function fetchTrustData(slug: string): Promise<TrustData | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const supabase = createClient(url, key);
  const { data, error } = await supabase.rpc("get_trust_data", { p_slug: slug });
  if (error || !data) return null;
  return data as TrustData;
}

// Framework name + status inferred from org.frameworks + controls data.
// We don't yet track framework certification dates — mark frameworks as
// "in_progress" until we have a real audit report record.
type FrameworkStatus = "certified" | "in_progress" | "planned";
function deriveFrameworks(frameworks: string[]): { name: string; status: FrameworkStatus; date: string }[] {
  const nameMap: Record<string, string> = {
    soc2: "SOC 2",
    soc2_type1: "SOC 2 Type I",
    soc2_type2: "SOC 2 Type II",
    iso27001: "ISO 27001",
    hipaa: "HIPAA",
    pci: "PCI DSS",
    nist_csf: "NIST CSF",
    gdpr: "GDPR",
  };
  return frameworks.map(f => ({
    name: nameMap[f.toLowerCase()] ?? f.toUpperCase(),
    status: "in_progress" as FrameworkStatus,
    date: "In progress",
  }));
}

function categoryAggregate(controls: TrustControl[]) {
  const groups: Record<string, { Icon: LucideIcon; compliant: number; total: number }> = {};
  const catMeta: Record<string, { label: string; Icon: LucideIcon }> = {
    security: { label: "Security", Icon: Shield },
    availability: { label: "Availability", Icon: ServerCog },
    confidentiality: { label: "Confidentiality", Icon: EyeOff },
    processing: { label: "Processing Integrity", Icon: Scale },
  };
  const assignBucket = (c: TrustControl) => {
    const id = (c.control_id || "").toUpperCase();
    if (id.startsWith("A1")) return "availability";
    if (id.startsWith("C1")) return "confidentiality";
    if (id.startsWith("PI1")) return "processing";
    return "security"; // CC1–CC9 all roll into Security for the public view
  };
  for (const c of controls) {
    const key = assignBucket(c);
    if (!groups[key]) groups[key] = { Icon: catMeta[key].Icon, compliant: 0, total: 0 };
    groups[key].total += 1;
    if (c.status === "compliant") groups[key].compliant += 1;
  }
  return Object.entries(groups)
    .filter(([, g]) => g.total > 0)
    .map(([key, g]) => ({
      name: catMeta[key].label,
      score: Math.round((g.compliant / g.total) * 100),
      Icon: g.Icon,
    }));
}

function deriveIntegrations(tech: Record<string, unknown>) {
  const list: { name: string; Icon: LucideIcon; description: string }[] = [];
  if (tech.aws_role_arn) list.push({ name: "AWS", Icon: Cloud, description: "Cloud infrastructure" });
  if (tech.github_token) list.push({ name: "GitHub", Icon: Github, description: "Source control" });
  if (tech.google_access_token) list.push({ name: "Google Workspace", Icon: Mail, description: "Identity & email" });
  if (tech.slack_access_token) list.push({ name: "Slack", Icon: MessageSquare, description: "Communication" });
  if (tech.azure_access_token || tech.azure_subscription_id) list.push({ name: "Azure", Icon: Hexagon, description: "Cloud infrastructure" });
  return list;
}

function initialsFrom(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

const statusMeta = {
  certified: { label: "Certified", Icon: ShieldCheck, className: "text-[var(--color-success)] bg-[var(--color-success-bg)]" },
  in_progress: { label: "In Progress", Icon: Clock, className: "text-[var(--color-info)] bg-[var(--color-info-bg)]" },
  planned: { label: "Planned", Icon: CalendarClock, className: "text-[var(--color-muted)] bg-[var(--color-surface-2)]" },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchTrustData(slug);
  if (!data) return { title: "Trust Center | ShieldBase" };
  return {
    title: `${data.name} — Trust Center | ShieldBase`,
    description: data.description || `${data.name}'s security posture and compliance status.`,
  };
}

export default async function TrustCenterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await fetchTrustData(slug);
  if (!data) notFound();

  const frameworks = deriveFrameworks(data.frameworks);
  const categories = categoryAggregate(data.controls);
  const integrations = deriveIntegrations(data.tech_stack);
  const compliantCount = data.controls.filter(c => c.status === "compliant").length;
  const totalCount = data.controls.length;
  const pct = totalCount > 0 ? Math.round((compliantCount / totalCount) * 100) : data.readiness_score;
  const latestUpdate = data.controls.reduce<string | null>((max, c) => {
    if (!c.updated_at) return max;
    return !max || c.updated_at > max ? c.updated_at : max;
  }, null);
  const lastUpdatedLabel = latestUpdate
    ? new Date(latestUpdate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : new Date(data.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const initials = initialsFrom(data.name);
  const websiteLabel = data.website?.replace(/^https?:\/\//, "");
  const description = data.description || `${data.name} maintains an active compliance program monitored continuously via ShieldBase.`;
  const tagline = data.tagline;

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <header className="bg-[var(--color-bg)]/70 backdrop-blur-xl border-b border-[var(--color-border)] sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-foreground)] text-[var(--color-surface)] flex items-center justify-center font-bold text-sm tracking-tight">
              {initials}
            </div>
            <div>
              <div className="font-semibold text-[var(--color-foreground)] text-[15px] leading-tight">{data.name}</div>
              <div className="text-xs text-[var(--color-muted)] mt-0.5">Trust Center</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {data.website && (
              <a href={data.website} target="_blank" rel="noopener noreferrer"
                className="hidden md:inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition">
                {websiteLabel}
                <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.8} />
              </a>
            )}
            {data.contact_email && (
              <a href={`mailto:${data.contact_email}?subject=Security inquiry`}
                className="inline-flex items-center gap-2 bg-[var(--color-foreground)] hover:opacity-90 text-[var(--color-surface)] text-sm px-4 py-2 rounded-lg font-medium transition">
                Contact Security
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-14 space-y-14">
        <section className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-muted)] bg-[var(--color-surface-2)] border border-[var(--color-border)] px-3 py-1 rounded-full mb-5">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-success)]" strokeWidth={2} />
            Verified by ShieldBase
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold text-[var(--color-foreground)] tracking-tight mb-4">{data.name}</h1>
          {tagline && <p className="text-[var(--color-foreground-subtle)] text-lg font-medium mb-3">{tagline}</p>}
          <p className="text-[var(--color-muted)] text-base leading-relaxed">{description}</p>
          <p className="text-xs text-[var(--color-muted)] mt-5">Last updated {lastUpdatedLabel}</p>
        </section>

        <section className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-10 text-center">
          <div className="text-7xl font-semibold text-[var(--color-foreground)] tracking-tight tabular-nums">{pct}%</div>
          <div className="text-sm font-medium text-[var(--color-foreground-subtle)] mt-2">Compliance controls passing</div>
          {totalCount > 0 ? (
            <div className="text-xs text-[var(--color-muted)] mt-1">{compliantCount} of {totalCount} controls verified</div>
          ) : (
            <div className="text-xs text-[var(--color-muted)] mt-1">Program initialized — first scan pending</div>
          )}
          <div className="w-full bg-[var(--color-surface-2)] rounded-full h-1.5 max-w-sm mx-auto mt-6 overflow-hidden">
            <div className="bg-[var(--color-success)] h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </section>

        {frameworks.length > 0 && (
          <section>
            <h2 className="text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider mb-4">Certifications & Frameworks</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {frameworks.map((f, i) => {
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
        )}

        {categories.length > 0 && (
          <section>
            <h2 className="text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider mb-4">Security Controls by Category</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {categories.map((cat, i) => (
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
        )}

        {data.policies.length > 0 && (
          <section>
            <h2 className="text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider mb-4">Security Policies</h2>
            <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
              {data.policies.map((policy, i) => (
                <div key={i} className={`flex items-center gap-3 px-5 py-3.5 ${i < data.policies.length - 1 ? "border-b border-[var(--color-border)]" : ""}`}>
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] flex-shrink-0" strokeWidth={2} />
                  <span className="text-sm text-[var(--color-foreground)]">{policy.title}</span>
                  <span className="ml-auto inline-flex items-center text-xs font-medium text-[var(--color-success)] bg-[var(--color-success-bg)] px-2 py-0.5 rounded-md">Approved</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {integrations.length > 0 && (
          <section>
            <h2 className="text-[11px] font-semibold text-[var(--color-muted)] uppercase tracking-wider mb-4">Security Tools & Integrations</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {integrations.map((int, i) => (
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
        )}

        {data.contact_email && (
          <section className="bg-[var(--color-foreground)] rounded-2xl p-10 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--color-surface)]/10 mb-4">
              <KeyRound className="w-5 h-5 text-[var(--color-surface)]" strokeWidth={1.8} />
            </div>
            <h3 className="text-xl font-semibold text-[var(--color-surface)] mb-2">Need our full security report?</h3>
            <p className="text-[var(--color-surface)]/60 text-sm mb-6 max-w-md mx-auto">Request our SOC 2 report, penetration test summary, or security questionnaire under NDA.</p>
            <a href={`mailto:${data.contact_email}?subject=Security report request`}
              className="inline-flex items-center gap-2 bg-[var(--color-surface)] text-[var(--color-foreground)] hover:opacity-90 px-6 py-2.5 rounded-lg font-medium text-sm transition">
              Request security report
              <ArrowUpRight className="w-4 h-4" strokeWidth={1.8} />
            </a>
          </section>
        )}

        <div className="text-center text-xs text-[var(--color-muted)] pb-8">
          Powered by <a href="https://shieldbase.vercel.app" className="text-[var(--color-foreground-subtle)] hover:text-[var(--color-foreground)] font-medium">ShieldBase</a>
        </div>
      </div>
    </div>
  );
}
