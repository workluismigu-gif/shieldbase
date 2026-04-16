"use client";
import { useState, useEffect, useRef } from "react";
import { saveLead } from "@/lib/supabase";
import {
  Shield, Cloud, MessageSquare, Mail, Hexagon,
  Gavel, Compass, Beaker, AlertOctagon, FileSearch,
  ClipboardList, Target, Folder, Grid3x3, Briefcase,
  ArrowRight, Plus, Check, CheckCircle2,
} from "lucide-react";
import { Github } from "@/components/icons/GithubIcon";

/* ─── SCROLL REVEAL ─── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("visible"); observer.unobserve(el); } },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}
function Reveal({ className = "reveal", children }: { className?: string; children: React.ReactNode }) {
  const ref = useReveal();
  return <div ref={ref} className={className}>{children}</div>;
}

/* ─── HEADER ─── */
function Header() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? "bg-[#F4F1EA]/90 backdrop-blur-md border-b border-[#E4DFD4]" : "bg-transparent"}`}>
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
        <a href="#" className="inline-flex items-center gap-2.5 text-[17px] font-medium tracking-tight text-[#141413]" style={{ fontFamily: "var(--font-fraunces)" }}>
          <span className="w-7 h-7 rounded-md bg-[#141413] text-[#F4F1EA] flex items-center justify-center">
            <Shield className="w-3.5 h-3.5" strokeWidth={2} />
          </span>
          <span className="italic">ShieldBase</span>
        </a>
        <nav className="hidden md:flex items-center gap-10 text-[13px] text-[#6B6359]" style={{ fontFamily: "var(--font-inter)" }}>
          <a href="#product" className="hover:text-[#141413] transition">Product</a>
          <a href="#automation" className="hover:text-[#141413] transition">Automation</a>
          <a href="#frameworks" className="hover:text-[#141413] transition">Frameworks</a>
          <a href="#pricing" className="hover:text-[#141413] transition">Pricing</a>
          <a href="#faq" className="hover:text-[#141413] transition">FAQ</a>
        </nav>
        <div className="flex items-center gap-3">
          <a href="/auth/login" className="hidden md:block text-[13px] text-[#6B6359] hover:text-[#141413] transition" style={{ fontFamily: "var(--font-inter)" }}>Sign in</a>
          <a href="/auth/signup" className="text-[13px] bg-[#141413] text-[#F4F1EA] px-4 py-2 rounded-md hover:bg-[#2C1810] transition" style={{ fontFamily: "var(--font-inter)" }}>
            Start free
          </a>
        </div>
      </div>
    </header>
  );
}

/* ─── HERO ─── */
function Hero() {
  return (
    <section className="relative pt-44 pb-28 overflow-hidden">
      {/* Warm radial glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(204,120,92,0.18), transparent 70%)" }}
      />
      <div className="max-w-6xl mx-auto px-6 relative">
        <Reveal>
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#6B6359] mb-8" style={{ fontFamily: "var(--font-inter)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#CC785C]" />
            Software for becoming SOC 2
          </div>
        </Reveal>

        <Reveal>
          <h1
            className="text-[#141413] leading-[0.95] tracking-tight mb-8"
            style={{
              fontFamily: "var(--font-fraunces)",
              fontSize: "clamp(48px, 9vw, 128px)",
              fontWeight: 300,
              fontVariationSettings: "'SOFT' 100, 'WONK' 0, 'opsz' 144",
            }}
          >
            Compliance,
            <br />
            <span className="italic text-[#CC785C]" style={{ fontWeight: 400 }}>without the noise.</span>
          </h1>
        </Reveal>

        <Reveal>
          <p
            className="text-[#6B6359] max-w-xl text-lg md:text-xl leading-relaxed mb-10"
            style={{ fontFamily: "var(--font-inter)", fontWeight: 400 }}
          >
            Most compliance software is built for the auditor. ShieldBase is built for the founder who has to ship tomorrow — with a full auditor workbench that flips on when you&apos;re ready.
          </p>
        </Reveal>

        <Reveal>
          <div className="flex flex-wrap items-center gap-5">
            <a
              href="/auth/signup"
              className="inline-flex items-center gap-2 bg-[#141413] text-[#F4F1EA] px-6 py-3.5 rounded-md text-[14px] font-medium hover:bg-[#2C1810] transition"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Start your readiness program
              <ArrowRight className="w-4 h-4" strokeWidth={1.8} />
            </a>
            <a
              href="/trust/shieldbase"
              className="inline-flex items-center gap-2 text-[14px] text-[#141413] underline-offset-4 decoration-[#E4DFD4] hover:decoration-[#141413] underline transition"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              See a live trust center
            </a>
          </div>
        </Reveal>

        <Reveal>
          <div className="mt-20 pt-8 border-t border-[#E4DFD4] grid grid-cols-2 md:grid-cols-4 gap-8 text-[13px]" style={{ fontFamily: "var(--font-inter)" }}>
            <div>
              <div className="text-[28px] text-[#141413] tabular-nums" style={{ fontFamily: "var(--font-fraunces)", fontWeight: 400 }}>5</div>
              <div className="text-[#6B6359] mt-1">automated scanners</div>
            </div>
            <div>
              <div className="text-[28px] text-[#141413] tabular-nums" style={{ fontFamily: "var(--font-fraunces)", fontWeight: 400 }}>37</div>
              <div className="text-[#6B6359] mt-1">standard PBC items, one click</div>
            </div>
            <div>
              <div className="text-[28px] text-[#141413] tabular-nums" style={{ fontFamily: "var(--font-fraunces)", fontWeight: 400 }}>4</div>
              <div className="text-[#6B6359] mt-1">frameworks mapped (SOC2, ISO, HIPAA, PCI)</div>
            </div>
            <div>
              <div className="text-[28px] text-[#141413] tabular-nums" style={{ fontFamily: "var(--font-fraunces)", fontWeight: 400 }}>1</div>
              <div className="text-[#6B6359] mt-1">toggle from founder to audit mode</div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── SPLIT BRAIN — the two-persona pitch ─── */
function SplitBrain() {
  return (
    <section id="product" className="py-28 bg-[#FAF9F5] border-y border-[#E4DFD4]">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <div className="max-w-2xl mb-20">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#6B6359] mb-5" style={{ fontFamily: "var(--font-inter)" }}>§ 01 — Product</div>
            <h2 className="text-[#141413] mb-5" style={{ fontFamily: "var(--font-fraunces)", fontSize: "clamp(32px, 4.5vw, 56px)", fontWeight: 400, lineHeight: 1.05 }}>
              Two modes,<br /><span className="italic text-[#CC785C]">one codebase.</span>
            </h2>
            <p className="text-[#6B6359] text-lg leading-relaxed" style={{ fontFamily: "var(--font-inter)" }}>
              Every other compliance tool makes you choose: software for the company, or software for the auditor. We built both and put them behind one toggle.
            </p>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-6">
          <Reveal>
            <div className="bg-[#F4F1EA] rounded-2xl border border-[#E4DFD4] p-8 h-full">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#CC785C] mb-6" style={{ fontFamily: "var(--font-inter)" }}>
                <Compass className="w-3.5 h-3.5" strokeWidth={2} />
                Founder mode
              </div>
              <h3 className="text-[#141413] mb-4" style={{ fontFamily: "var(--font-fraunces)", fontSize: "28px", fontWeight: 500, lineHeight: 1.15 }}>
                You&apos;re preparing for the audit.
              </h3>
              <p className="text-[#6B6359] text-[15px] leading-relaxed mb-8" style={{ fontFamily: "var(--font-inter)" }}>
                A single readiness score, three fastest wins, and a &ldquo;ready for auditor&rdquo; CTA that unlocks at 80%. Plain-English tooltips on every audit term. Sidebar hides the jargon until you need it.
              </p>
              <ul className="space-y-3 text-[14px] text-[#141413]" style={{ fontFamily: "var(--font-inter)" }}>
                {[
                  "Readiness score blended from connectors + controls + tasks",
                  "Fastest wins ranked by impact",
                  "Trust center you can publish to close deals",
                  "PBC requests in plain English",
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-1 h-1 rounded-full bg-[#CC785C] mt-2.5 flex-shrink-0" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal>
            <div className="bg-[#141413] rounded-2xl border border-[#141413] p-8 h-full text-[#F4F1EA]">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#D4A27F] mb-6" style={{ fontFamily: "var(--font-inter)" }}>
                <Gavel className="w-3.5 h-3.5" strokeWidth={2} />
                Audit mode
              </div>
              <h3 className="mb-4" style={{ fontFamily: "var(--font-fraunces)", fontSize: "28px", fontWeight: 500, lineHeight: 1.15 }}>
                The firm is on site.
              </h3>
              <p className="text-[#D4A27F] text-[15px] leading-relaxed mb-8" style={{ fontFamily: "var(--font-inter)" }}>
                Flip one toggle. The sidebar reveals the auditor workbench — findings log with formal dispositions, AICPA sampling rigor, test iteration history, Type II workpaper PDF with service-auditor report.
              </p>
              <ul className="space-y-3 text-[14px]" style={{ fontFamily: "var(--font-inter)" }}>
                {[
                  "Findings log with observation / deficiency / material weakness",
                  "Deterministic random sampling, seeded per engagement",
                  "Test iterations for Type II period coverage",
                  "Workpaper PDF with independent service auditor report template",
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-1 h-1 rounded-full bg-[#CC785C] mt-2.5 flex-shrink-0" />
                    <span className="text-[#F4F1EA]/90">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─── AUTOMATION — the scanner grid ─── */
function Automation() {
  const scanners = [
    { name: "AWS", Icon: Cloud, status: "live", detail: "~30 controls · Prowler-native · nightly + webhooks" },
    { name: "GitHub", Icon: Github, status: "live", detail: "49 controls · push webhooks · real-time drift" },
    { name: "Slack", Icon: MessageSquare, status: "live", detail: "6 SOC 2 controls · 2FA, admins, guests, shared channels" },
    { name: "Google Workspace", Icon: Mail, status: "beta", detail: "Identity, MFA, domain — wiring through Lambda" },
    { name: "Azure", Icon: Hexagon, status: "beta", detail: "IAM, Defender, Storage, SQL — Prowler Azure" },
  ];

  return (
    <section id="automation" className="py-28">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <div className="max-w-2xl mb-16">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#6B6359] mb-5" style={{ fontFamily: "var(--font-inter)" }}>§ 02 — Automation</div>
            <h2 className="text-[#141413] mb-5" style={{ fontFamily: "var(--font-fraunces)", fontSize: "clamp(32px, 4.5vw, 56px)", fontWeight: 400, lineHeight: 1.05 }}>
              Evidence that <span className="italic text-[#CC785C]">collects itself.</span>
            </h2>
            <p className="text-[#6B6359] text-lg leading-relaxed" style={{ fontFamily: "var(--font-inter)" }}>
              Connect your stack. We scan nightly, map every finding to SOC 2 TSC criteria, and write the evidence chain your auditor needs — without asking you to upload another screenshot.
            </p>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {scanners.map((s, i) => (
            <Reveal key={i}>
              <div className="bg-[#FAF9F5] rounded-xl border border-[#E4DFD4] p-6 h-full hover:border-[#141413] transition group">
                <div className="flex items-start justify-between mb-5">
                  <div className="w-10 h-10 rounded-lg bg-[#F4F1EA] flex items-center justify-center text-[#141413] group-hover:bg-[#141413] group-hover:text-[#F4F1EA] transition">
                    <s.Icon className="w-4 h-4" strokeWidth={1.8} />
                  </div>
                  <span className={`text-[10px] uppercase tracking-[0.15em] px-2 py-1 rounded ${
                    s.status === "live" ? "bg-[#2E3A2C] text-[#D4A27F]" : "bg-[#E4DFD4] text-[#6B6359]"
                  }`} style={{ fontFamily: "var(--font-inter)" }}>
                    {s.status}
                  </span>
                </div>
                <div className="text-[#141413] text-[17px] mb-2" style={{ fontFamily: "var(--font-fraunces)", fontWeight: 500 }}>{s.name}</div>
                <div className="text-[#6B6359] text-[13px] leading-relaxed" style={{ fontFamily: "var(--font-inter)" }}>{s.detail}</div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <p className="text-[#6B6359] text-[14px] mt-12 max-w-2xl leading-relaxed" style={{ fontFamily: "var(--font-inter)" }}>
            Every scan result writes into the same controls table. Each finding comes with its SOC 2 TSC mapping, a raw-payload snapshot for Year-2 re-performance, and participates in sample selection — no special-casing per provider.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── AUDITOR GLIMPSE ─── */
function AuditorGlimpse() {
  const tiles = [
    { Icon: AlertOctagon, title: "Findings log", detail: "Formal dispositions, management response, auditor conclusion, thread." },
    { Icon: Beaker, title: "Sampling rigor", detail: "AICPA-aligned size calculator. Deterministic seeded selection. Rationale memo." },
    { Icon: FileSearch, title: "IPE walkthroughs", detail: "Completeness & accuracy testing recorded per report." },
    { Icon: Briefcase, title: "Engagements", detail: "Period-scoped. Clone next year from prior to pull forward procedures." },
    { Icon: ClipboardList, title: "PBC library", detail: "37 SOC 2 standard requests, one click. Due dates, review, overdue nags." },
    { Icon: Target, title: "Test iterations", detail: "Quarterly test runs logged. Period coverage provable for Type II." },
    { Icon: Grid3x3, title: "Crosswalk", detail: "TSC → ISO 27001, HIPAA, PCI DSS, NIST CSF. CSV export." },
    { Icon: Folder, title: "Workpaper PDF", detail: "Service auditor report, management assertion, system description, control matrix, findings log." },
  ];

  return (
    <section className="py-28 bg-[#141413] text-[#F4F1EA]">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <div className="max-w-2xl mb-16">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#D4A27F] mb-5" style={{ fontFamily: "var(--font-inter)" }}>§ 03 — The auditor workbench</div>
            <h2 className="mb-5" style={{ fontFamily: "var(--font-fraunces)", fontSize: "clamp(32px, 4.5vw, 56px)", fontWeight: 400, lineHeight: 1.05 }}>
              When it&apos;s audit time,<br />
              <span className="italic text-[#CC785C]">flip a toggle.</span>
            </h2>
            <p className="text-[#D4A27F] text-lg leading-relaxed" style={{ fontFamily: "var(--font-inter)" }}>
              The room doesn&apos;t change — you just see more of it. Every tool a SOC 2 Type II engagement needs, built to the AICPA&apos;s standards.
            </p>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-[#2C1810]">
          {tiles.map((t, i) => (
            <Reveal key={i}>
              <div className="bg-[#141413] p-7 h-full hover:bg-[#1C1814] transition">
                <t.Icon className="w-5 h-5 text-[#CC785C] mb-5" strokeWidth={1.5} />
                <div className="text-[17px] mb-3" style={{ fontFamily: "var(--font-fraunces)", fontWeight: 500 }}>{t.title}</div>
                <div className="text-[13px] text-[#D4A27F] leading-relaxed" style={{ fontFamily: "var(--font-inter)" }}>{t.detail}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FRAMEWORKS ─── */
function Frameworks() {
  const frameworks = [
    { name: "SOC 2", subtitle: "Type I & Type II", note: "Primary framework. Full engagement workflow.", active: true },
    { name: "ISO 27001", subtitle: "Annex A 2022", note: "Mapped via crosswalk. 100+ controls aligned.", active: true },
    { name: "HIPAA", subtitle: "§164 Security Rule", note: "Administrative / physical / technical safeguards.", active: true },
    { name: "PCI DSS", subtitle: "4.0", note: "Cross-mapped to SOC 2 control activities.", active: true },
    { name: "NIST CSF", subtitle: "2.0", note: "Subcategory mapping for GV.*, PR.*, DE.*, RS.*, RC.*.", active: true },
  ];

  return (
    <section id="frameworks" className="py-28">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <div className="max-w-2xl mb-16">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#6B6359] mb-5" style={{ fontFamily: "var(--font-inter)" }}>§ 04 — Frameworks</div>
            <h2 className="text-[#141413] mb-5" style={{ fontFamily: "var(--font-fraunces)", fontSize: "clamp(32px, 4.5vw, 56px)", fontWeight: 400, lineHeight: 1.05 }}>
              One program.<br />
              <span className="italic text-[#CC785C]">Five frameworks.</span>
            </h2>
            <p className="text-[#6B6359] text-lg leading-relaxed" style={{ fontFamily: "var(--font-inter)" }}>
              Pass SOC 2 once; we map every control to ISO 27001, HIPAA, PCI DSS 4.0, and NIST CSF 2.0 automatically. Downloadable crosswalk CSV for your auditor&apos;s working papers.
            </p>
          </div>
        </Reveal>

        <div className="border-t border-[#E4DFD4]">
          {frameworks.map((f, i) => (
            <Reveal key={i}>
              <div className="flex items-center justify-between py-8 border-b border-[#E4DFD4] hover:bg-[#FAF9F5] transition px-4 -mx-4 rounded-lg">
                <div className="flex items-baseline gap-6 flex-1 min-w-0">
                  <div className="text-[#6B6359] text-[11px] tabular-nums" style={{ fontFamily: "var(--font-inter)" }}>
                    0{i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-4 flex-wrap">
                      <span className="text-[#141413]" style={{ fontFamily: "var(--font-fraunces)", fontSize: "26px", fontWeight: 400 }}>
                        {f.name}
                      </span>
                      <span className="text-[#6B6359] text-[13px]" style={{ fontFamily: "var(--font-inter)" }}>{f.subtitle}</span>
                    </div>
                    <div className="text-[#6B6359] text-[14px] mt-1" style={{ fontFamily: "var(--font-inter)" }}>{f.note}</div>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 text-[#2E3A2C] text-[12px] flex-shrink-0" style={{ fontFamily: "var(--font-inter)" }}>
                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                  live
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── TRUST CENTER CTA ─── */
function TrustCenterCta() {
  return (
    <section className="py-28 bg-[#FAF9F5] border-y border-[#E4DFD4]">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <div className="bg-[#F4F1EA] border border-[#E4DFD4] rounded-2xl p-12 md:p-16 relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-60 pointer-events-none"
              style={{ background: "radial-gradient(circle at 85% 20%, rgba(204,120,92,0.15), transparent 50%)" }}
            />
            <div className="relative grid md:grid-cols-[1fr_auto] gap-12 items-end">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-[#6B6359] mb-5" style={{ fontFamily: "var(--font-inter)" }}>§ 05 — Trust center</div>
                <h2 className="text-[#141413] mb-5" style={{ fontFamily: "var(--font-fraunces)", fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 400, lineHeight: 1.05 }}>
                  The page your prospect asks for,<br />
                  <span className="italic text-[#CC785C]">ready in 15 minutes.</span>
                </h2>
                <p className="text-[#6B6359] text-[16px] leading-relaxed max-w-lg" style={{ fontFamily: "var(--font-inter)" }}>
                  Publish your compliance posture at a public URL. Live readiness, frameworks tracked, policy library, integration transparency. Updates automatically as your program evolves.
                </p>
              </div>
              <a
                href="/auth/signup"
                className="inline-flex items-center gap-2 bg-[#141413] text-[#F4F1EA] px-6 py-3.5 rounded-md text-[14px] font-medium hover:bg-[#2C1810] transition flex-shrink-0"
                style={{ fontFamily: "var(--font-inter)" }}
              >
                Claim your trust URL
                <ArrowRight className="w-4 h-4" strokeWidth={1.8} />
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── PRICING ─── */
function Pricing() {
  const plans = [
    {
      name: "Free",
      tagline: "Ready for the real thing.",
      price: "$0",
      cadence: "/ forever",
      current: true,
      features: [
        "All 5 automated scanners",
        "Unlimited policies & controls",
        "PBC library + response flow",
        "Trust center, publishable",
        "All frameworks crosswalked",
      ],
      ctaLabel: "Start free",
      ctaHref: "/auth/signup",
    },
    {
      name: "Pro",
      tagline: "Mid-fieldwork partner.",
      price: "$15,000",
      cadence: "/ year",
      current: false,
      features: [
        "Everything in Free",
        "Audit mode + auditor seat",
        "Sampling workbench (seeded)",
        "Test iterations for Type II",
        "Workpaper PDF + findings log",
        "Priority support",
      ],
      ctaLabel: "Talk to us",
      ctaHref: "mailto:hello@shieldbase.io",
    },
    {
      name: "Firm",
      tagline: "Audit practice, multi-client.",
      price: "Custom",
      cadence: "",
      current: false,
      features: [
        "Everything in Pro",
        "Multi-tenant auditor workspace",
        "Staff role + per-control scoping",
        "Custom crosswalks",
        "White-label trust centers",
        "Dedicated support",
      ],
      ctaLabel: "Contact sales",
      ctaHref: "mailto:hello@shieldbase.io",
    },
  ];

  return (
    <section id="pricing" className="py-28">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <div className="max-w-2xl mb-16">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#6B6359] mb-5" style={{ fontFamily: "var(--font-inter)" }}>§ 06 — Pricing</div>
            <h2 className="text-[#141413] mb-5" style={{ fontFamily: "var(--font-fraunces)", fontSize: "clamp(32px, 4.5vw, 56px)", fontWeight: 400, lineHeight: 1.05 }}>
              Every feature,<br />
              <span className="italic text-[#CC785C]">free while we&apos;re building.</span>
            </h2>
            <p className="text-[#6B6359] text-lg leading-relaxed" style={{ fontFamily: "var(--font-inter)" }}>
              We&apos;re in early access. Everything shipped today — scanners, trust center, auditor workbench — is free. Pricing below previews how it&apos;ll tier when we&apos;re out of beta.
            </p>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((p, i) => (
            <Reveal key={i}>
              <div className={`rounded-2xl p-8 h-full border ${p.current ? "bg-[#141413] text-[#F4F1EA] border-[#141413]" : "bg-[#FAF9F5] border-[#E4DFD4]"}`}>
                <div className="flex items-center justify-between mb-6">
                  <div className={`text-[11px] uppercase tracking-[0.2em] ${p.current ? "text-[#CC785C]" : "text-[#6B6359]"}`} style={{ fontFamily: "var(--font-inter)" }}>
                    {p.name}
                  </div>
                  {p.current && (
                    <span className="text-[10px] uppercase tracking-[0.15em] bg-[#CC785C] text-[#141413] px-2 py-1 rounded" style={{ fontFamily: "var(--font-inter)" }}>
                      available now
                    </span>
                  )}
                </div>
                <div className={`mb-2 ${p.current ? "text-[#F4F1EA]" : "text-[#141413]"}`} style={{ fontFamily: "var(--font-fraunces)", fontSize: "22px", fontWeight: 500 }}>
                  {p.tagline}
                </div>
                <div className="flex items-baseline gap-2 mb-8">
                  <span className={p.current ? "text-[#F4F1EA]" : "text-[#141413]"} style={{ fontFamily: "var(--font-fraunces)", fontSize: "48px", fontWeight: 300 }}>
                    {p.price}
                  </span>
                  <span className={`text-[13px] ${p.current ? "text-[#D4A27F]" : "text-[#6B6359]"}`} style={{ fontFamily: "var(--font-inter)" }}>
                    {p.cadence}
                  </span>
                </div>
                <ul className="space-y-3 mb-8 text-[13px]" style={{ fontFamily: "var(--font-inter)" }}>
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5">
                      <Check className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${p.current ? "text-[#CC785C]" : "text-[#141413]"}`} strokeWidth={2.5} />
                      <span className={p.current ? "text-[#F4F1EA]/90" : "text-[#141413]"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={p.ctaHref}
                  className={`block text-center py-3 rounded-md text-[13px] font-medium transition ${
                    p.current
                      ? "bg-[#CC785C] text-[#141413] hover:bg-[#D4876E]"
                      : "bg-[#141413] text-[#F4F1EA] hover:bg-[#2C1810]"
                  }`}
                  style={{ fontFamily: "var(--font-inter)" }}
                >
                  {p.ctaLabel}
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ ─── */
function Faq() {
  const items = [
    {
      q: "How is this different from Vanta or Drata?",
      a: "Vanta and Drata are company-facing dashboards — when your auditor shows up, they still use their own tooling. ShieldBase is the first platform with a full auditor workbench built in: findings log, AICPA sampling rigor, test iterations, workpaper PDF. Your audit firm works inside your tenant. Everything is provably defensible.",
    },
    {
      q: "What do I actually do in the first week?",
      a: "Connect AWS, GitHub, Slack. The scanners run. You read your readiness score, click the top three fastest wins, upload your first policy. That's it. No spreadsheets, no screenshots, no AICPA vocabulary — we call this founder mode. Audit-speak stays hidden until you flip audit mode.",
    },
    {
      q: "Can my auditor actually use this?",
      a: "Yes — we built it for them first. The audit mode surfaces: findings with formal dispositions (observation / deficiency / significant deficiency / material weakness), deterministic seeded sampling with AICPA-aligned size guidance, test iterations with period coverage, workpaper PDF with service-auditor report and management assertion templates. Your firm can bring their own auditors in; we support lead + staff roles with per-control assignments.",
    },
    {
      q: "What evidence does it collect automatically?",
      a: "AWS: ~30 Prowler-native controls (IAM, CloudTrail, S3, GuardDuty, KMS, VPC, RDS). GitHub: 49 controls (branch protection, code review, secrets). Slack: 6 SOC 2 controls (2FA, admins, guests, external-shared channels, domain policy). Google Workspace and Azure are in beta. Every finding maps to SOC 2 TSC criteria and participates in sample selection.",
    },
    {
      q: "Will it defend a PCAOB-inspection-level audit?",
      a: "That's what we designed for. Every in-sample control captures procedure type (inspection / observation / inquiry / reperformance / CAAT), sample IDs, sample rationale memo, and test conclusion. Each test run creates its own test_instance row for Type II period coverage. Every finding has an auditor conclusion that flows into the workpaper. Raw API payloads are preserved so Year-2 auditors can re-perform.",
    },
    {
      q: "What about ISO 27001 / HIPAA / PCI / NIST?",
      a: "You earn SOC 2 once, we crosswalk everything else. Downloadable CSV mapping TSC → ISO 27001 Annex A, HIPAA §164, PCI DSS 4.0, NIST CSF 2.0. Your auditor gets the crosswalk as a working paper; you can pursue multi-framework engagements without rebuilding your control library.",
    },
  ];

  return (
    <section id="faq" className="py-28 bg-[#FAF9F5] border-y border-[#E4DFD4]">
      <div className="max-w-4xl mx-auto px-6">
        <Reveal>
          <div className="mb-14">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#6B6359] mb-5" style={{ fontFamily: "var(--font-inter)" }}>§ 07 — Questions</div>
            <h2 className="text-[#141413]" style={{ fontFamily: "var(--font-fraunces)", fontSize: "clamp(32px, 4.5vw, 56px)", fontWeight: 400, lineHeight: 1.05 }}>
              Asked before you.
            </h2>
          </div>
        </Reveal>

        <div className="space-y-2">
          {items.map((item, i) => (
            <Reveal key={i}>
              <details className="group border-b border-[#E4DFD4]">
                <summary className="flex items-start justify-between gap-6 py-6 cursor-pointer list-none">
                  <span className="text-[#141413] text-[18px] leading-snug" style={{ fontFamily: "var(--font-fraunces)", fontWeight: 500 }}>
                    {item.q}
                  </span>
                  <Plus className="w-4 h-4 text-[#6B6359] group-open:rotate-45 transition flex-shrink-0 mt-2" strokeWidth={1.8} />
                </summary>
                <div className="pb-6 text-[#6B6359] text-[15px] leading-relaxed max-w-3xl" style={{ fontFamily: "var(--font-inter)" }}>
                  {item.a}
                </div>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── LEAD FORM / FINAL CTA ─── */
function FinalCta() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) { setStatus("error"); return; }
    setStatus("submitting");
    try {
      await saveLead(email);
      setStatus("sent");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section className="py-36">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <Reveal>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[#6B6359] mb-6" style={{ fontFamily: "var(--font-inter)" }}>
            § 08 — Start
          </div>
        </Reveal>
        <Reveal>
          <h2 className="text-[#141413] mb-8" style={{ fontFamily: "var(--font-fraunces)", fontSize: "clamp(40px, 6vw, 80px)", fontWeight: 300, lineHeight: 1.0 }}>
            Your audit,<br />
            <span className="italic text-[#CC785C]">without the noise.</span>
          </h2>
        </Reveal>
        <Reveal>
          <p className="text-[#6B6359] text-lg max-w-xl mx-auto mb-12 leading-relaxed" style={{ fontFamily: "var(--font-inter)" }}>
            Free while we&apos;re in early access. Your account takes 30 seconds; your first scan runs in five minutes.
          </p>
        </Reveal>
        <Reveal>
          <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (status === "error") setStatus("idle"); }}
              placeholder="you@company.com"
              className="flex-1 bg-[#FAF9F5] border border-[#E4DFD4] rounded-md px-4 py-3.5 text-[14px] text-[#141413] placeholder:text-[#6B6359] focus:outline-none focus:border-[#141413] transition"
              style={{ fontFamily: "var(--font-inter)" }}
            />
            <button
              type="submit"
              disabled={status === "submitting" || status === "sent"}
              className="bg-[#141413] text-[#F4F1EA] px-6 py-3.5 rounded-md text-[14px] font-medium hover:bg-[#2C1810] disabled:opacity-50 transition inline-flex items-center justify-center gap-2"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              {status === "sent" ? (<><CheckCircle2 className="w-4 h-4" /> On the list</>) : status === "submitting" ? "Sending…" : (<>Get early access <ArrowRight className="w-4 h-4" strokeWidth={1.8} /></>)}
            </button>
          </form>
          {status === "error" && <p className="text-[13px] text-[#CC785C] mt-4" style={{ fontFamily: "var(--font-inter)" }}>Please enter a valid email.</p>}
        </Reveal>
      </div>
    </section>
  );
}

/* ─── FOOTER ─── */
function Footer() {
  return (
    <footer className="border-t border-[#E4DFD4] py-12">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-start gap-6 text-[13px] text-[#6B6359]" style={{ fontFamily: "var(--font-inter)" }}>
        <div className="flex items-center gap-2.5 text-[#141413]" style={{ fontFamily: "var(--font-fraunces)" }}>
          <span className="w-6 h-6 rounded-md bg-[#141413] text-[#F4F1EA] flex items-center justify-center">
            <Shield className="w-3 h-3" strokeWidth={2} />
          </span>
          <span className="italic">ShieldBase</span>
        </div>
        <div className="flex flex-wrap gap-6">
          <a href="/trust/shieldbase" className="hover:text-[#141413] transition">Trust center</a>
          <a href="mailto:security@shieldbase.io" className="hover:text-[#141413] transition">security@shieldbase.io</a>
          <a href="/auth/login" className="hover:text-[#141413] transition">Sign in</a>
        </div>
        <div className="text-[#6B6359]/70" style={{ fontFamily: "var(--font-inter)", fontSize: "11px" }}>
          © {new Date().getFullYear()} ShieldBase
        </div>
      </div>
    </footer>
  );
}

/* ─── PAGE ─── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#141413]" style={{ fontFamily: "var(--font-inter)" }}>
      <Header />
      <Hero />
      <SplitBrain />
      <Automation />
      <AuditorGlimpse />
      <Frameworks />
      <TrustCenterCta />
      <Pricing />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}
