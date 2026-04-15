import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  ShieldCheck, Clock, CalendarClock, Shield, ServerCog, EyeOff, Scale,
  Cloud, MessageSquare, Lock, Mail, ArrowUpRight,
  CheckCircle2, KeyRound, Hexagon, FileText, FileCheck2, FileLock2,
  Radio, Zap, Globe, Fingerprint, BookOpen, Dot
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
    return "security";
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
      compliant: g.compliant,
      total: g.total,
      Icon: g.Icon,
    }));
}

function deriveIntegrations(tech: Record<string, unknown>) {
  const list: { name: string; Icon: LucideIcon; description: string; key: string }[] = [];
  if (tech.aws_role_arn) list.push({ name: "AWS", Icon: Cloud, description: "Cloud infrastructure", key: "aws" });
  if (tech.github_token) list.push({ name: "GitHub", Icon: Github, description: "Source control", key: "github" });
  if (tech.google_access_token) list.push({ name: "Google Workspace", Icon: Mail, description: "Identity & email", key: "google" });
  if (tech.slack_access_token) list.push({ name: "Slack", Icon: MessageSquare, description: "Communication", key: "slack" });
  if (tech.azure_access_token || tech.azure_subscription_id) list.push({ name: "Azure", Icon: Hexagon, description: "Cloud infrastructure", key: "azure" });
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

// ─── PRESENTATIONAL HELPERS ────────────────────────────────────────────────

function CornerFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <span aria-hidden className="absolute -top-px -left-px w-3 h-3 border-t border-l border-[var(--color-foreground)]" />
      <span aria-hidden className="absolute -top-px -right-px w-3 h-3 border-t border-r border-[var(--color-foreground)]" />
      <span aria-hidden className="absolute -bottom-px -left-px w-3 h-3 border-b border-l border-[var(--color-foreground)]" />
      <span aria-hidden className="absolute -bottom-px -right-px w-3 h-3 border-b border-r border-[var(--color-foreground)]" />
      {children}
    </div>
  );
}

function RadialGauge({ value }: { value: number }) {
  const size = 220;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const color =
    value >= 90 ? "var(--color-success)"
      : value >= 75 ? "var(--color-info)"
        : value >= 50 ? "var(--color-warning)"
          : "var(--color-danger)";

  // decorative tick marks
  const ticks = Array.from({ length: 60 });

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* tick ring */}
      <svg className="absolute inset-0" viewBox={`0 0 ${size} ${size}`}>
        {ticks.map((_, i) => {
          const angle = (i / 60) * 2 * Math.PI - Math.PI / 2;
          const inner = r - 16;
          const outer = r - 10;
          const x1 = size / 2 + Math.cos(angle) * inner;
          const y1 = size / 2 + Math.sin(angle) * inner;
          const x2 = size / 2 + Math.cos(angle) * outer;
          const y2 = size / 2 + Math.sin(angle) * outer;
          const active = i / 60 <= value / 100;
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={active ? color : "var(--color-border)"}
              strokeWidth={i % 5 === 0 ? 1.6 : 1}
              opacity={active ? 0.9 : 0.45}
            />
          );
        })}
      </svg>
      {/* main progress arc */}
      <svg className="absolute inset-0 -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="var(--color-border)" strokeWidth={stroke} opacity={0.5} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 12px ${color})` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-[var(--color-muted)]">Readiness</div>
        <div className="text-6xl font-bold tabular-nums text-[var(--color-foreground)] leading-none mt-1"
          style={{ fontVariantNumeric: "tabular-nums" }}>
          {value}
          <span className="text-2xl align-super text-[var(--color-foreground-subtle)] ml-0.5">%</span>
        </div>
      </div>
    </div>
  );
}

function policyIcon(type?: string): LucideIcon {
  const t = (type || "").toLowerCase();
  if (t.includes("access") || t.includes("identity")) return Fingerprint;
  if (t.includes("incident") || t.includes("response")) return Zap;
  if (t.includes("encrypt") || t.includes("crypto")) return FileLock2;
  if (t.includes("privacy") || t.includes("data")) return FileCheck2;
  if (t.includes("vendor") || t.includes("third")) return Globe;
  return FileText;
}

function groupPolicies(policies: TrustPolicy[]) {
  const groups: Record<string, TrustPolicy[]> = {};
  for (const p of policies) {
    const t = (p.type || "General").replace(/_/g, " ");
    const key = t.charAt(0).toUpperCase() + t.slice(1);
    (groups[key] ||= []).push(p);
  }
  return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
}

function buildTimeline(controls: TrustControl[]) {
  return controls
    .filter(c => c.updated_at)
    .slice()
    .sort((a, b) => (b.updated_at! > a.updated_at! ? 1 : -1))
    .slice(0, 10);
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

// ─── PAGE ──────────────────────────────────────────────────────────────────

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
  const websiteLabel = data.website?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const description = data.description || `${data.name} maintains an active compliance program monitored continuously via ShieldBase.`;
  const tagline = data.tagline;
  const timeline = buildTimeline(data.controls);
  const policyGroups = groupPolicies(data.policies);
  const issued = new Date(data.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
  const reportId = (data.id || data.slug).slice(0, 8).toUpperCase();

  const mono = "font-mono text-[11px] uppercase tracking-[0.18em]";

  // per-integration freshness (best-effort: most recent control.updated_at as proxy)
  const freshness = latestUpdate ? timeAgo(latestUpdate) : "—";

  return (
    <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-foreground)]">
      {/* subtle grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at top, black 20%, transparent 70%)",
        }}
      />

      {/* HEADER */}
      <header className="relative z-10 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-md bg-[var(--color-foreground)] text-[var(--color-surface)] flex items-center justify-center font-extrabold text-[13px] tracking-tight">
              {initials}
              <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[var(--color-success)] ring-2 ring-[var(--color-bg)]" />
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-[15px]">{data.name}</div>
              <div className={`${mono} text-[var(--color-muted)]`}>Trust · Public Dossier</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {data.website && (
              <a href={data.website} target="_blank" rel="noopener noreferrer"
                className="hidden md:inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition">
                {websiteLabel}
                <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.8} />
              </a>
            )}
            {data.contact_email && (
              <a href={`mailto:${data.contact_email}?subject=Security inquiry`}
                className="inline-flex items-center gap-2 bg-[var(--color-foreground)] hover:opacity-90 text-[var(--color-surface)] text-sm px-4 py-2 rounded-md font-medium transition">
                Contact Security
                <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.2} />
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-24">
        {/* ── HERO / DOSSIER ─────────────────────────────────────────────── */}
        <section className="relative">
          {/* report meta strip */}
          <div className={`${mono} flex items-center flex-wrap gap-x-6 gap-y-2 text-[var(--color-muted)] mb-8`}>
            <span className="inline-flex items-center gap-2 text-[var(--color-success)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-success)] opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-success)]" />
              </span>
              Live · Continuously monitored
            </span>
            <span>Report · {reportId}</span>
            <span>Issued · {issued}</span>
            <span>Rev · {lastUpdatedLabel}</span>
          </div>

          <CornerFrame className="p-8 md:p-12 bg-[var(--color-bg)]/60 backdrop-blur border border-[var(--color-border)] rounded-sm">
            <div className="grid md:grid-cols-[1fr_auto] gap-10 items-center">
              <div className="max-w-2xl">
                <div className={`${mono} text-[var(--color-foreground-subtle)] mb-4 flex items-center gap-2`}>
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-success)]" strokeWidth={2.2} />
                  Verified by ShieldBase
                </div>
                <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.02]">
                  {data.name}
                  <span className="text-[var(--color-foreground-subtle)]">.</span>
                </h1>
                {tagline && (
                  <p className="mt-4 text-lg text-[var(--color-foreground-subtle)] font-medium">{tagline}</p>
                )}
                <p className="mt-5 text-[15px] leading-relaxed text-[var(--color-muted)] max-w-xl">
                  {description}
                </p>
                {/* vitals row */}
                <div className="mt-8 grid grid-cols-3 gap-3 max-w-lg">
                  <Vital label="Controls" value={`${compliantCount}/${totalCount || "—"}`} sub="compliant" />
                  <Vital label="Frameworks" value={String(frameworks.length)} sub="tracked" />
                  <Vital label="Last scan" value={freshness} sub="auto-verified" />
                </div>
              </div>
              <div className="justify-self-center md:justify-self-end">
                <RadialGauge value={pct} />
              </div>
            </div>
          </CornerFrame>
        </section>

        {/* ── FRAMEWORKS ─────────────────────────────────────────────────── */}
        {frameworks.length > 0 && (
          <section className="mt-20">
            <SectionHeader kicker="01" title="Certifications & Frameworks" meta={`${frameworks.length} active`} />
            <div className="grid md:grid-cols-3 gap-4 mt-6">
              {frameworks.map((f, i) => {
                const meta = statusMeta[f.status];
                return (
                  <div key={i} className="group relative bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)] p-6 hover:border-[var(--color-border-strong)] transition">
                    <div className="flex items-start justify-between mb-5">
                      <div className={`inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.14em] px-2 py-1 rounded ${meta.className}`}>
                        <meta.Icon className="w-3 h-3" strokeWidth={2.4} />
                        {meta.label}
                      </div>
                      <span className={`${mono} text-[var(--color-muted)]`}>0{i + 1}</span>
                    </div>
                    <div className="text-xl font-semibold tracking-tight">{f.name}</div>
                    <div className="mt-1 text-xs text-[var(--color-muted)]">{f.date}</div>

                    {/* TSC breakdown bar (for SOC 2) */}
                    {f.name.toLowerCase().includes("soc") && categories.length > 0 && (
                      <div className="mt-5 pt-5 border-t border-dashed border-[var(--color-border)]">
                        <div className={`${mono} text-[var(--color-muted)] mb-2.5`}>TSC Breakdown</div>
                        <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-[var(--color-surface-2)]">
                          {categories.map((c, ci) => (
                            <div key={ci}
                              title={`${c.name} ${c.score}%`}
                              className="h-full"
                              style={{
                                width: `${(c.total / Math.max(1, categories.reduce((s, x) => s + x.total, 0))) * 100}%`,
                                background: c.score >= 90 ? "var(--color-success)" : c.score >= 75 ? "var(--color-info)" : "var(--color-warning)",
                                opacity: 0.6 + (c.score / 100) * 0.4,
                              }}
                            />
                          ))}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--color-muted)]">
                          {categories.map((c, ci) => (
                            <span key={ci} className="inline-flex items-center gap-1">
                              <Dot className="w-3 h-3" style={{ color: c.score >= 90 ? "var(--color-success)" : c.score >= 75 ? "var(--color-info)" : "var(--color-warning)" }} />
                              {c.name} {c.score}%
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── CATEGORIES GRID ───────────────────────────────────────────── */}
        {categories.length > 0 && (
          <section className="mt-20">
            <SectionHeader kicker="02" title="Trust Services Criteria" meta="Signals by category" />
            <div className="grid md:grid-cols-2 gap-4 mt-6">
              {categories.map((cat, i) => {
                const color = cat.score >= 90 ? "var(--color-success)" : cat.score >= 75 ? "var(--color-info)" : "var(--color-warning)";
                return (
                  <div key={i} className="relative overflow-hidden bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)] p-6">
                    <div
                      aria-hidden
                      className="absolute -top-24 -right-24 w-56 h-56 rounded-full opacity-[0.12] blur-3xl"
                      style={{ background: color }}
                    />
                    <div className="relative flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] flex items-center justify-center" style={{ color }}>
                          <cat.Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
                        </div>
                        <div>
                          <div className="font-medium text-[15px]">{cat.name}</div>
                          <div className={`${mono} text-[var(--color-muted)] mt-0.5`}>
                            {cat.compliant}/{cat.total} controls
                          </div>
                        </div>
                      </div>
                      <div className="text-3xl font-bold tabular-nums">{cat.score}<span className="text-base text-[var(--color-foreground-subtle)]">%</span></div>
                    </div>
                    {/* segmented progress */}
                    <div className="relative flex gap-[3px] h-2">
                      {Array.from({ length: 24 }).map((_, idx) => {
                        const active = idx < Math.round((cat.score / 100) * 24);
                        return (
                          <div key={idx} className="flex-1 rounded-[2px]"
                            style={{ background: active ? color : "var(--color-surface-2)", opacity: active ? 1 : 0.6 }} />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── TWO COLUMN: TIMELINE + INTEGRATIONS ──────────────────────── */}
        <section className="mt-20 grid lg:grid-cols-[1.15fr_1fr] gap-10">
          {/* Timeline */}
          <div>
            <SectionHeader kicker="03" title="Compliance Activity" meta={`Last ${timeline.length} events`} />
            {timeline.length > 0 ? (
              <ol className="relative mt-6 pl-6 before:absolute before:top-1 before:bottom-1 before:left-[7px] before:w-px before:bg-[var(--color-border)]">
                {timeline.map((ev, i) => {
                  const ok = ev.status === "compliant";
                  return (
                    <li key={i} className="relative pb-5 last:pb-0">
                      <span
                        className="absolute -left-6 top-1.5 w-[15px] h-[15px] rounded-full border-2 flex items-center justify-center"
                        style={{
                          borderColor: ok ? "var(--color-success)" : "var(--color-warning)",
                          background: "var(--color-bg)",
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: ok ? "var(--color-success)" : "var(--color-warning)" }} />
                      </span>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-foreground-subtle)]">
                            {ev.control_id}
                          </code>
                          <span className="text-sm truncate">
                            {ok ? "Control verified" : "Control updated"}
                            {ev.category ? <span className="text-[var(--color-muted)]"> · {ev.category}</span> : null}
                          </span>
                        </div>
                        <span className={`${mono} text-[var(--color-muted)] whitespace-nowrap`}>{timeAgo(ev.updated_at!)}</span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="mt-6 rounded-lg border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-muted)]">
                No control activity recorded yet.
              </div>
            )}
          </div>

          {/* Integrations */}
          <div>
            <SectionHeader kicker="04" title="Connected Systems" meta={integrations.length ? `${integrations.length} live` : "none"} />
            {integrations.length > 0 ? (
              <ul className="mt-6 divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)] overflow-hidden bg-[var(--color-bg)]">
                {integrations.map((int, i) => (
                  <li key={i} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-10 h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-foreground-subtle)]">
                      <int.Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-[15px] truncate">{int.name}</div>
                      <div className="text-xs text-[var(--color-muted)] truncate">{int.description}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--color-success)]">
                        <Radio className="w-3 h-3" strokeWidth={2.4} />
                        Scanning
                      </span>
                      <span className="text-[10px] text-[var(--color-muted)] font-mono">{freshness}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-6 rounded-lg border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-muted)]">
                No integrations connected.
              </div>
            )}
          </div>
        </section>

        {/* ── POLICIES ──────────────────────────────────────────────────── */}
        {data.policies.length > 0 && (
          <section className="mt-20">
            <SectionHeader kicker="05" title="Security Policies" meta={`${data.policies.length} documents`} />
            <div className="mt-6 grid md:grid-cols-2 gap-4">
              {policyGroups.map(([group, items]) => {
                const GroupIcon = policyIcon(items[0]?.type);
                return (
                  <div key={group} className="bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)] p-5">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-8 h-8 rounded-md bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-foreground-subtle)]">
                        <GroupIcon className="w-[15px] h-[15px]" strokeWidth={1.8} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{group}</div>
                        <div className={`${mono} text-[var(--color-muted)]`}>{items.length} {items.length === 1 ? "policy" : "policies"}</div>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {items.map((p, i) => (
                        <li key={i} className="flex items-center gap-2.5 text-sm py-1.5 border-t border-dashed border-[var(--color-border)] first:border-0 first:pt-0">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success)] flex-shrink-0" strokeWidth={2.2} />
                          <span className="truncate">{p.title}</span>
                          <span className={`${mono} ml-auto text-[var(--color-success)]`}>Approved</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        {data.contact_email && (
          <section className="mt-24 relative overflow-hidden rounded-lg border border-[var(--color-border)]">
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(600px 220px at 20% 0%, rgba(96,165,250,0.18), transparent 70%), radial-gradient(500px 200px at 80% 100%, rgba(74,222,128,0.15), transparent 70%), var(--color-bg)",
              }}
            />
            <div className="relative grid md:grid-cols-[auto_1fr_auto] items-center gap-8 p-10">
              <div className="w-14 h-14 rounded-md bg-[var(--color-foreground)]/10 border border-[var(--color-border)] flex items-center justify-center">
                <KeyRound className="w-6 h-6 text-[var(--color-foreground)]" strokeWidth={1.8} />
              </div>
              <div>
                <div className={`${mono} text-[var(--color-muted)] mb-1.5`}>Under NDA</div>
                <h3 className="text-2xl font-semibold tracking-tight">Request the full security report</h3>
                <p className="text-[var(--color-muted)] text-sm mt-1.5 max-w-xl">
                  SOC 2 report, penetration test summary, DPA, sub-processors, and completed security questionnaires — delivered within one business day.
                </p>
              </div>
              <a href={`mailto:${data.contact_email}?subject=Security report request`}
                className="inline-flex items-center gap-2 bg-[var(--color-foreground)] text-[var(--color-surface)] hover:opacity-90 px-5 py-3 rounded-md font-medium text-sm transition whitespace-nowrap">
                Request access
                <ArrowUpRight className="w-4 h-4" strokeWidth={2} />
              </a>
            </div>
          </section>
        )}

        {/* FOOTER */}
        <footer className="mt-16 pt-8 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-4">
          <div className={`${mono} text-[var(--color-muted)] flex items-center gap-2`}>
            <Lock className="w-3 h-3" strokeWidth={2.2} />
            End-to-end verified · Signals stream from source systems
          </div>
          <div className="text-xs text-[var(--color-muted)] flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" strokeWidth={1.8} />
            Powered by{" "}
            <a href="https://shieldbase.vercel.app" className="text-[var(--color-foreground-subtle)] hover:text-[var(--color-foreground)] font-semibold">
              ShieldBase
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}

// ─── small subcomponents ────────────────────────────────────────────────────

function Vital({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border-l border-[var(--color-border)] pl-3">
      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--color-muted)]">{label}</div>
      <div className="text-lg font-semibold tabular-nums mt-0.5">{value}</div>
      {sub && <div className="text-[10px] text-[var(--color-muted)] mt-0.5">{sub}</div>}
    </div>
  );
}

function SectionHeader({ kicker, title, meta }: { kicker: string; title: string; meta?: string }) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-[var(--color-border)] pb-3">
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">§ {kicker}</span>
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight">{title}</h2>
      </div>
      {meta && <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{meta}</span>}
    </div>
  );
}
