import type { Metadata } from "next";

// Mock company data — will be fetched from Supabase by slug in production
const mockCompany = {
  name: "Acme SaaS Inc.",
  slug: "acme-saas",
  tagline: "Building fast, staying secure.",
  website: "https://acmesaas.com",
  description: "Acme SaaS is a B2B platform helping companies automate their workflows. We take the security of your data seriously.",
  logo: "",
  primaryColor: "#3b82f6",
  complianceScore: 87,
  frameworks: [
    { name: "SOC 2 Type I", status: "certified", date: "March 2026", icon: "" },
    { name: "SOC 2 Type II", status: "in_progress", date: "Est. Q3 2026", icon: "" },
    { name: "ISO 27001", status: "planned", date: "2027", icon: "" },
  ],
  controls: {
    total: 52,
    compliant: 45,
    categories: [
      { name: "Security", score: 89, icon: "" },
      { name: "Availability", score: 92, icon: "" },
      { name: "Confidentiality", score: 88, icon: "" },
      { name: "Processing Integrity", score: 85, icon: "" },
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
    { name: "AWS", logo: "", description: "Cloud infrastructure" },
    { name: "GitHub", logo: "", description: "Source control" },
    { name: "Google Workspace", logo: "", description: "Identity & email" },
    { name: "Slack", logo: "", description: "Communication" },
    { name: "Datadog", logo: "", description: "Monitoring" },
    { name: "CrowdStrike", logo: "", description: "Endpoint security" },
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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${mockCompany.name} — Trust Center | ShieldBase`,
    description: `${mockCompany.name}'s security posture and compliance status.`,
  };
}

export default async function TrustCenterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = mockCompany; // TODO: fetch by slug from Supabase

  const pct = Math.round(company.controls.compliant / company.controls.total * 100);

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      {/* Header bar */}
      <div className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--color-info)] rounded-xl flex items-center justify-center text-sm font-bold text-white">{company.name.slice(0,2).toUpperCase()}</div>
            <div>
              <div className="font-bold text-[var(--color-foreground)] text-lg">{company.name}</div>
              <div className="text-xs text-[var(--color-muted)]">Trust Center</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href={company.website} target="_blank" rel="noopener noreferrer"
              className="text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground-subtle)] transition hidden md:block">
              {company.website.replace("https://", "")} ↗
            </a>
            <a href={`mailto:${company.contact}?subject=Security inquiry`}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition">
              Contact Security Team
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        {/* Hero */}
        <div className="text-center">
          <h1 className="text-3xl font-black text-[var(--color-foreground)] mb-3">{company.name}</h1>
          <p className="text-[var(--color-muted)] text-lg max-w-2xl mx-auto">{company.description}</p>
          <p className="text-xs text-[var(--color-muted)] mt-4">Last updated: {company.lastUpdated} · Powered by ShieldBase</p>
        </div>

        {/* Overall score */}
        <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-8 text-center">
          <div className="text-6xl font-black text-[var(--color-info)] mb-2">{pct}%</div>
          <div className="text-lg font-semibold text-[var(--color-foreground-subtle)] mb-1">Compliance Controls Passing</div>
          <div className="text-sm text-[var(--color-muted)]">{company.controls.compliant} of {company.controls.total} SOC 2 controls verified</div>
          <div className="w-full bg-[var(--color-surface-2)] rounded-full h-3 max-w-sm mx-auto mt-4">
            <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Certifications */}
        <div>
          <h2 className="text-xl font-bold text-[var(--color-foreground)] mb-4">Certifications & Frameworks</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {company.frameworks.map((f, i) => (
              <div key={i} className={`bg-[var(--color-bg)] rounded-2xl border p-6 text-center ${f.status === "certified" ? "border-[var(--color-success)] bg-[var(--color-success-bg)]" : "border-[var(--color-border)]"}`}>
                <div className="text-3xl mb-2">{f.icon}</div>
                <div className="font-bold text-[var(--color-foreground)]">{f.name}</div>
                <div className={`text-sm mt-1 font-medium capitalize ${f.status === "certified" ? "text-[var(--color-success)]" : f.status === "in_progress" ? "text-[var(--color-info)]" : "text-[var(--color-muted)]"}`}>
                  {f.status === "certified" ? "✓ Certified" : f.status === "in_progress" ? "In Progress" : "Planned"}
                </div>
                <div className="text-xs text-[var(--color-muted)] mt-1">{f.date}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Control categories */}
        <div>
          <h2 className="text-xl font-bold text-[var(--color-foreground)] mb-4">Security Controls by Category</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {company.controls.categories.map((cat, i) => (
              <div key={i} className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{cat.icon}</span>
                    <span className="font-semibold text-[var(--color-foreground-subtle)]">{cat.name}</span>
                  </div>
                  <span className="text-lg font-bold text-[var(--color-info)]">{cat.score}%</span>
                </div>
                <div className="w-full bg-[var(--color-surface-2)] rounded-full h-2">
                  <div className={`h-2 rounded-full ${cat.score >= 90 ? "bg-green-500" : cat.score >= 75 ? "bg-blue-500" : "bg-yellow-500"}`}
                    style={{ width: `${cat.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Policies */}
        <div>
          <h2 className="text-xl font-bold text-[var(--color-foreground)] mb-4">Security Policies</h2>
          <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
            {company.policies.map((policy, i) => (
              <div key={i} className={`flex items-center gap-3 px-5 py-3.5 ${i < company.policies.length - 1 ? "border-b border-[var(--color-border)]" : ""}`}>
                <span className="text-green-500 font-bold">✓</span>
                <span className="text-sm text-[var(--color-foreground-subtle)]">{policy}</span>
                <span className="ml-auto text-xs text-[var(--color-muted)] bg-[var(--color-success-bg)] text-[var(--color-success)] px-2 py-0.5 rounded-full">Approved</span>
              </div>
            ))}
          </div>
        </div>

        {/* Integrations / Security Tools */}
        <div>
          <h2 className="text-xl font-bold text-[var(--color-foreground)] mb-4">Security Tools & Integrations</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {company.integrations.map((int, i) => (
              <div key={i} className="bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] p-4 flex items-center gap-3">
                <div className="w-9 h-9 bg-[var(--color-surface-2)] rounded-lg flex items-center justify-center text-xl">{int.logo}</div>
                <div>
                  <div className="text-sm font-semibold text-[var(--color-foreground-subtle)]">{int.name}</div>
                  <div className="text-xs text-[var(--color-muted)]">{int.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-xl font-bold text-[var(--color-foreground)] mb-4">Security FAQ</h2>
          <div className="space-y-3">
            {company.faqs.map((faq, i) => (
              <details key={i} className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] group">
                <summary className="flex items-center justify-between p-5 cursor-pointer font-semibold text-[var(--color-foreground-subtle)] text-sm list-none">
                  {faq.q}
                  <span className="text-[var(--color-muted)] group-open:rotate-45 transition-transform text-xl ml-4 flex-shrink-0">+</span>
                </summary>
                <div className="px-5 pb-5 text-sm text-[var(--color-muted)] leading-relaxed border-t border-[var(--color-border)] pt-3">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-navy rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Need our full security report?</h3>
          <p className="text-[var(--color-muted)] text-sm mb-6">Request our SOC 2 Type I report, penetration test summary, or security questionnaire under NDA.</p>
          <a href={`mailto:${company.contact}?subject=Security report request`}
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition">
            Request Security Report
          </a>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-[var(--color-muted)] pb-4">
          <p>This Trust Center is powered by <a href="https://shieldbase.vercel.app" className="text-blue-500 hover:underline">ShieldBase</a></p>
        </div>
      </div>
    </div>
  );
}
