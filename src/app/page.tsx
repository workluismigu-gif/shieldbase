"use client";
import { useState, useEffect, useRef } from "react";
import { saveLead } from "@/lib/supabase";

/* ─── SCROLL REVEAL HOOK ─── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("visible"); observer.unobserve(el); } },
      { threshold: 0.15, rootMargin: "0px 0px -50px 0px" }
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

/* ─── ANIMATED COUNTER ─── */
function Counter({ end, suffix = "", duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const startTime = Date.now();
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(eased * end));
          if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      }
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

/* ─── HEADER ─── */
function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? "bg-[var(--color-bg)]/95 backdrop-blur-md shadow-sm" : "bg-transparent"}`}>
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <a href="#" className={`text-xl font-extrabold tracking-tight transition-colors ${scrolled ? "text-navy" : "text-white"}`}>
          🛡️ ShieldBase
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          {["How It Works", "Pricing", "FAQ"].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(/ /g, "-")}`}
              className={`transition-colors ${scrolled ? "text-navy-lighter hover:text-navy" : "text-white/80 hover:text-white"}`}>
              {item}
            </a>
          ))}
          <a href="/auth" className={`transition-colors font-medium ${scrolled ? "text-navy-lighter hover:text-navy" : "text-white/80 hover:text-white"}`}>
            Sign In
          </a>
          <a href="/auth" className="bg-blue hover:bg-blue-dark text-white px-5 py-2.5 rounded-lg font-semibold transition-all hover:shadow-lg hover:shadow-blue/25">
            Get Started Free →
          </a>
        </nav>
        <button onClick={() => setOpen(!open)} className={`md:hidden ${scrolled ? "text-navy" : "text-white"}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? <path strokeLinecap="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>
      {open && (
        <nav className="md:hidden bg-[var(--color-bg)] border-t px-6 pb-4 flex flex-col gap-3 text-sm text-navy-lighter">
          <a href="#how-it-works" onClick={() => setOpen(false)} className="py-2">How It Works</a>
          <a href="#pricing" onClick={() => setOpen(false)} className="py-2">Pricing</a>
          <a href="#faq" onClick={() => setOpen(false)} className="py-2">FAQ</a>
          <a href="/auth" onClick={() => setOpen(false)} className="py-2 text-[var(--color-info)] font-medium">Sign In</a>
          <a href="/auth" onClick={() => setOpen(false)} className="bg-blue text-white text-center py-2.5 rounded-lg font-semibold">Get Started Free →</a>
        </nav>
      )}
    </header>
  );
}

/* ─── HERO ─── */
function Hero() {
  return (
    <section className="relative bg-navy min-h-[90vh] flex items-center overflow-hidden">
      {/* Gradient orbs */}
      <div className="absolute top-20 right-20 w-[500px] h-[500px] bg-blue/15 rounded-full blur-[100px] float" />
      <div className="absolute bottom-20 left-10 w-[300px] h-[300px] bg-purple/10 rounded-full blur-[80px] float-delay" />

      <div className="relative max-w-6xl mx-auto px-6 pt-28 pb-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left — text */}
          <div>
            <div className="inline-block bg-blue/10 border border-blue/20 rounded-full px-4 py-1.5 text-blue text-sm font-medium mb-6">
              Trusted by startups closing enterprise deals
            </div>
            <h1 className="text-4xl md:text-[56px] font-black text-white leading-[1.1] mb-6 tracking-tight">
              Get SOC 2 certified.<br/>
              <span className="gradient-text">In weeks, not months.</span>
            </h1>
            <p className="text-lg text-slate max-w-lg mb-8 leading-relaxed">
              AI-powered compliance that gets your startup audit-ready for a flat $5,000. 
              No hidden fees. No enterprise sales calls. Just results.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href="/auth" className="bg-blue hover:bg-blue-dark text-white px-7 py-3.5 rounded-lg font-semibold text-base transition-all hover:shadow-lg hover:shadow-blue/25 text-center">
                Start Free Assessment →
              </a>
              <a href="/auth" className="border border-white/20 text-white px-7 py-3.5 rounded-lg font-semibold text-base hover:bg-[var(--color-bg)]/5 transition text-center">
                Sign In
              </a>
            </div>
            <p className="text-sm text-slate mt-4">No credit card required · Free to start</p>
          </div>

          {/* Right — mock dashboard */}
          <div className="hidden md:block">
            <div className="bg-navy-light border border-white/10 rounded-2xl p-6 shadow-2xl float">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="text-xs text-slate ml-2">ShieldBase Dashboard</span>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white font-medium">SOC 2 Readiness</span>
                    <span className="text-green font-bold">87%</span>
                  </div>
                  <div className="w-full bg-navy rounded-full h-2.5">
                    <div className="bg-gradient-to-r from-blue to-green h-2.5 rounded-full progress-bar" style={{ width: "87%" }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Policies", value: "22/25", color: "text-green" },
                    { label: "Controls", value: "48/52", color: "text-blue-light" },
                    { label: "Evidence", value: "36/40", color: "text-purple-light" },
                    { label: "Days Left", value: "12", color: "text-yellow-400" },
                  ].map((item, i) => (
                    <div key={i} className="bg-navy rounded-lg p-3">
                      <div className="text-xs text-slate">{item.label}</div>
                      <div className={`text-lg font-bold ${item.color}`}>{item.value}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {[
                    { text: "Access Control Policy", status: "Complete", color: "bg-green" },
                    { text: "Encryption at Rest", status: "Complete", color: "bg-green" },
                    { text: "Incident Response Plan", status: "In Progress", color: "bg-yellow-400" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between bg-navy rounded-lg px-3 py-2">
                      <span className="text-sm text-slate-light">{item.text}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${item.color}/20 ${item.color === "bg-green" ? "text-green" : "text-yellow-400"} font-medium`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── LOGO BAR ─── */
function LogoBar() {
  const logos = ["Stripe", "Notion", "Vercel", "Linear", "Retool", "Loom", "Figma", "Airtable", "Supabase", "PostHog"];
  return (
    <section className="bg-[var(--color-bg)] border-b border-[var(--color-border)] py-8 overflow-hidden">
      <p className="text-center text-sm text-slate font-medium mb-6">Trusted by fast-growing startups</p>
      <div className="relative">
        <div className="flex gap-16 marquee-track" style={{ width: "max-content" }}>
          {[...logos, ...logos].map((name, i) => (
            <div key={i} className="text-lg font-bold text-[var(--color-muted)] whitespace-nowrap tracking-wider uppercase">{name}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── METRICS ─── */
function Metrics() {
  return (
    <section className="bg-[var(--color-bg)] py-20">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal className="reveal">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: 89, suffix: "%", label: "Enterprise buyers require SOC 2", sub: "before purchasing" },
              { value: 147, suffix: "K", label: "Average cost of manual", sub: "SOC 2 compliance" },
              { value: 80, suffix: "%", label: "Cost savings vs.", sub: "traditional consultants" },
              { value: 30, suffix: "", label: "Days to audit-ready", sub: "not 6 months" },
            ].map((m, i) => (
              <div key={i}>
                <div className="text-4xl md:text-5xl font-black text-navy">
                  {m.suffix === "K" && "$"}<Counter end={m.value} />{m.suffix}
                </div>
                <div className="text-sm text-navy-lighter font-medium mt-2">{m.label}</div>
                <div className="text-xs text-slate mt-0.5">{m.sub}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── PROBLEM ─── */
function Problem() {
  return (
    <section className="bg-[var(--color-surface)] py-24">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">SOC 2 shouldn&apos;t be this hard</h2>
            <p className="text-slate text-lg max-w-2xl mx-auto">
              You&apos;re building a great product. But enterprise customers won&apos;t buy until you&apos;re SOC 2 certified. The traditional path is broken.
            </p>
          </div>
        </Reveal>

        {/* Alternating layout — Vanta style */}
        <div className="space-y-24">
          {/* Row 1: text left, visual right */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <Reveal className="reveal-left">
              <div>
                <div className="text-sm font-semibold text-red-500 uppercase tracking-wider mb-2">The Problem</div>
                <h3 className="text-2xl font-bold text-navy mb-4">Traditional compliance is painfully slow and expensive</h3>
                <p className="text-slate leading-relaxed mb-4">
                  Hiring a consultant costs $50,000–$150,000. It takes 3–6 months. And at the end, you get a stack of generic PDFs that don&apos;t match your actual tech stack.
                </p>
                <ul className="space-y-3">
                  {[
                    "Consultants charge by the hour with no cap",
                    "Generic policies that don't match your tools",
                    "Months of back-and-forth before you're audit-ready",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-navy-lighter">
                      <span className="text-red-400 mt-0.5">✗</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal className="reveal-right">
              <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-8 shadow-sm">
                <div className="text-sm text-slate mb-4 font-medium">Traditional SOC 2 Timeline</div>
                <div className="space-y-4">
                  {[
                    { phase: "Find a consultant", weeks: "2–4 weeks", w: "15%" },
                    { phase: "Gap assessment", weeks: "3–6 weeks", w: "25%" },
                    { phase: "Policy writing", weeks: "4–8 weeks", w: "40%" },
                    { phase: "Remediation", weeks: "4–12 weeks", w: "60%" },
                    { phase: "Audit prep", weeks: "2–4 weeks", w: "80%" },
                    { phase: "Actual audit", weeks: "4–8 weeks", w: "100%" },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-navy-lighter font-medium">{item.phase}</span>
                        <span className="text-red-400">{item.weeks}</span>
                      </div>
                      <div className="w-full bg-[var(--color-surface-2)] rounded-full h-1.5">
                        <div className="bg-red-300 h-1.5 rounded-full" style={{ width: item.w }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex justify-between text-sm">
                  <span className="text-slate">Total time</span>
                  <span className="text-red-500 font-bold">3–6 months</span>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Row 2: visual left, text right — FLIPPED */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <Reveal className="reveal-left">
              <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-8 shadow-sm">
                <div className="text-sm text-slate mb-4 font-medium">ShieldBase Timeline</div>
                <div className="space-y-4">
                  {[
                    { phase: "Free readiness assessment", weeks: "Day 1", w: "10%", color: "bg-green" },
                    { phase: "AI gap analysis", weeks: "Days 1–3", w: "25%", color: "bg-green" },
                    { phase: "Custom policy package", weeks: "Days 3–10", w: "50%", color: "bg-green" },
                    { phase: "Remediation + evidence", weeks: "Days 10–25", w: "80%", color: "bg-blue" },
                    { phase: "Audit-ready handoff", weeks: "Day 30", w: "100%", color: "bg-blue" },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-navy-lighter font-medium">{item.phase}</span>
                        <span className="text-green font-medium">{item.weeks}</span>
                      </div>
                      <div className="w-full bg-[var(--color-surface-2)] rounded-full h-1.5">
                        <div className={`${item.color} h-1.5 rounded-full`} style={{ width: item.w }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex justify-between text-sm">
                  <span className="text-slate">Total time</span>
                  <span className="text-green font-bold">30 days</span>
                </div>
              </div>
            </Reveal>
            <Reveal className="reveal-right">
              <div>
                <div className="text-sm font-semibold text-green uppercase tracking-wider mb-2">The Solution</div>
                <h3 className="text-2xl font-bold text-navy mb-4">AI does the heavy lifting. You stay focused on building.</h3>
                <p className="text-slate leading-relaxed mb-4">
                  ShieldBase uses AI to automate gap analysis, generate policies tailored to your stack, and guide you through remediation — in 30 days for a flat $5,000.
                </p>
                <ul className="space-y-3">
                  {[
                    "AI-powered gap analysis in hours, not weeks",
                    "Policies customized to your actual tech stack",
                    "Flat $5,000 — no hourly billing, no surprises",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-navy-lighter">
                      <span className="text-green mt-0.5">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── HOW IT WORKS ─── */
function HowItWorks() {
  const steps = [
    { num: "01", title: "Free Assessment", desc: "Take a 5-minute readiness quiz. We identify where you stand against SOC 2 requirements — no commitment needed.", icon: "📋", color: "from-blue/10 to-purple/10" },
    { num: "02", title: "AI Gap Analysis", desc: "Our AI analyzes your tech stack against all 5 Trust Services Criteria and generates a comprehensive gap report with severity ratings.", icon: "🔍", color: "from-purple/10 to-blue/10" },
    { num: "03", title: "Custom Deliverables", desc: "Receive 15–25 security policies written for your stack, an evidence collection runbook, and a prioritized remediation roadmap.", icon: "📦", color: "from-blue/10 to-green/10" },
    { num: "04", title: "Audit Ready", desc: "We connect you with a vetted CPA firm and hand off everything they need. You walk into your audit fully prepared.", icon: "✅", color: "from-green/10 to-blue/10" },
  ];

  return (
    <section id="how-it-works" className="bg-[var(--color-bg)] py-24">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">How ShieldBase works</h2>
            <p className="text-slate text-lg">Four steps. 30 days. Audit-ready.</p>
          </div>
        </Reveal>

        <div className="relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-[var(--color-border)] -translate-x-1/2" />

          <div className="space-y-16">
            {steps.map((step, i) => (
              <Reveal key={i} className={i % 2 === 0 ? "reveal-left" : "reveal-right"}>
                <div className={`grid md:grid-cols-2 gap-8 items-center ${i % 2 === 1 ? "md:direction-rtl" : ""}`}>
                  <div className={`${i % 2 === 1 ? "md:order-2 md:text-left" : ""}`} style={{ direction: "ltr" }}>
                    <div className="inline-flex items-center gap-2 bg-blue/5 rounded-full px-3 py-1 mb-4">
                      <span className="text-blue font-black text-sm">STEP {step.num}</span>
                    </div>
                    <h3 className="text-2xl font-bold text-navy mb-3">{step.title}</h3>
                    <p className="text-slate leading-relaxed">{step.desc}</p>
                  </div>
                  <div className={`${i % 2 === 1 ? "md:order-1" : ""} flex justify-center`}>
                    <div className={`w-32 h-32 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center text-5xl shadow-sm border border-[var(--color-border)] card-hover`}>
                      {step.icon}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── PRICING ─── */
function Pricing() {
  return (
    <section id="pricing" className="bg-[var(--color-surface)] py-24">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">Transparent pricing</h2>
            <p className="text-slate text-lg">One package. Flat fee. No surprises. Unlike everyone else.</p>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {/* Competitor 1 */}
          <Reveal className="reveal">
            <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-6 text-center">
              <div className="text-sm text-slate mb-2 font-medium">Traditional Consultant</div>
              <div className="text-3xl font-black text-red-400 mb-1">$50K–$150K</div>
              <div className="text-xs text-slate mb-4">3–6 months</div>
              <ul className="text-left space-y-2 text-sm text-slate">
                <li className="flex gap-2"><span className="text-red-300">✗</span>Hourly billing, no cap</li>
                <li className="flex gap-2"><span className="text-red-300">✗</span>Generic templates</li>
                <li className="flex gap-2"><span className="text-red-300">✗</span>Months of back-and-forth</li>
              </ul>
            </div>
          </Reveal>

          {/* Us — highlighted */}
          <Reveal className="reveal-scale">
            <div className="bg-navy rounded-2xl p-6 text-center relative shadow-xl md:-mt-4 md:mb-[-16px]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue text-white text-xs font-bold px-4 py-1 rounded-full">RECOMMENDED</div>
              <div className="text-sm text-blue-light mb-2 font-medium mt-2">ShieldBase</div>
              <div className="text-4xl font-black text-white mb-1">$5,000</div>
              <div className="text-xs text-slate mb-4">30 days · flat fee</div>
              <ul className="text-left space-y-2 text-sm text-slate-light">
                <li className="flex gap-2"><span className="text-green">✓</span>AI-powered gap analysis</li>
                <li className="flex gap-2"><span className="text-green">✓</span>15–25 custom policies</li>
                <li className="flex gap-2"><span className="text-green">✓</span>Evidence collection runbook</li>
                <li className="flex gap-2"><span className="text-green">✓</span>Remediation roadmap</li>
                <li className="flex gap-2"><span className="text-green">✓</span>Auditor matchmaking</li>
                <li className="flex gap-2"><span className="text-green">✓</span>30-day guarantee</li>
              </ul>
              <a href="#cta" className="block mt-6 bg-blue hover:bg-blue-dark text-white py-3 rounded-lg font-semibold transition-all hover:shadow-lg hover:shadow-blue/25">
                Get Started →
              </a>
            </div>
          </Reveal>

          {/* Competitor 2 */}
          <Reveal className="reveal">
            <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-6 text-center">
              <div className="text-sm text-slate mb-2 font-medium">Vanta + Auditor</div>
              <div className="text-3xl font-black text-yellow-500 mb-1">$18K–$65K</div>
              <div className="text-xs text-slate mb-4">1–3 months + ongoing</div>
              <ul className="text-left space-y-2 text-sm text-slate">
                <li className="flex gap-2"><span className="text-yellow-400">~</span>$10K+ annual subscription</li>
                <li className="flex gap-2"><span className="text-yellow-400">~</span>Audit fees extra ($8–15K)</li>
                <li className="flex gap-2"><span className="text-yellow-400">~</span>Per-seat pricing increases</li>
              </ul>
            </div>
          </Reveal>
        </div>

        <Reveal>
          <p className="text-center text-sm text-slate mt-8">
            * ShieldBase total with auditor: $13K–$20K ($5K service + $8–15K CPA auditor, paid directly)
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── DELIVERABLES ─── */
function Deliverables() {
  const items = [
    { icon: "🔍", title: "Gap Analysis Report", desc: "20–30 page assessment against all 5 Trust Services Criteria with severity ratings and prioritized findings." },
    { icon: "📋", title: "Custom Policy Package", desc: "15–25 security policies (InfoSec, Access Control, IR, Data Classification) tailored to your tech stack." },
    { icon: "📁", title: "Evidence Runbook", desc: "Step-by-step evidence collection guide for your actual tools — AWS, GitHub, Slack, Okta, and more." },
    { icon: "🗺️", title: "Remediation Roadmap", desc: "Prioritized action plan with timelines, config templates, and implementation guidance for every gap." },
    { icon: "🤝", title: "Auditor Connection", desc: "Matched with a vetted CPA firm. We coordinate so you go straight to audit — no shopping around." },
    { icon: "📊", title: "Readiness Dashboard", desc: "Track your compliance progress with clear percentage scores across all control areas." },
  ];

  return (
    <section className="bg-[var(--color-bg)] py-24">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">Everything you need to pass your audit</h2>
            <p className="text-slate text-lg">Real deliverables. Not a dashboard you have to figure out yourself.</p>
          </div>
        </Reveal>
        <Reveal className="stagger">
          <div className="grid md:grid-cols-3 gap-6">
            {items.map((item, i) => (
              <div key={i} className="bg-[var(--color-surface)] rounded-2xl p-6 card-hover border border-[var(--color-border)]">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="text-lg font-bold text-navy mb-2">{item.title}</h3>
                <p className="text-sm text-slate leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── FRAMEWORKS ─── */
function Frameworks() {
  return (
    <section className="bg-[var(--color-surface)] py-24">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">Supporting the frameworks that matter</h2>
            <p className="text-slate text-lg">Start with SOC 2. Add more as your customers require them.</p>
          </div>
        </Reveal>
        <Reveal className="stagger">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { name: "SOC 2 Type I", available: true },
              { name: "SOC 2 Type II", available: true },
              { name: "ISO 27001", available: false },
              { name: "HIPAA", available: false },
            ].map((f, i) => (
              <div key={i} className={`rounded-xl p-5 text-center border card-hover ${f.available ? "bg-[var(--color-bg)] border-blue/20 shadow-sm" : "bg-[var(--color-bg)] border-[var(--color-border)] opacity-60"}`}>
                <div className="text-base font-bold text-navy mb-1">{f.name}</div>
                <div className={`text-xs font-semibold ${f.available ? "text-green" : "text-slate"}`}>
                  {f.available ? "✅ Available" : "Coming Soon"}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── TESTIMONIAL ─── */
function Testimonial() {
  return (
    <section className="bg-navy py-24">
      <div className="max-w-4xl mx-auto px-6">
        <Reveal className="reveal-scale">
          <div className="text-center">
            <div className="text-5xl mb-6">&ldquo;</div>
            <blockquote className="text-xl md:text-2xl text-white font-medium leading-relaxed mb-8">
              We were losing enterprise deals because we didn&apos;t have SOC 2. Traditional consultants quoted us $80K and 4 months. ShieldBase got us audit-ready in 3 weeks for $5K. We closed our first enterprise contract the next month.
            </blockquote>
            <div>
              <div className="text-white font-semibold">Sarah Chen</div>
              <div className="text-slate text-sm">CTO, ExampleSaaS (Series A)</div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── FAQ ─── */
function FAQ() {
  const faqs = [
    { q: "What exactly is SOC 2?", a: "SOC 2 is a security framework by the AICPA that evaluates how well you protect customer data. It covers Security, Availability, Processing Integrity, Confidentiality, and Privacy. Enterprise customers require it before buying your software." },
    { q: "What's the difference between Type I and Type II?", a: "Type I checks if your controls are designed properly at a single point in time. Type II checks if they actually work over a period (3–12 months). Type II is more valuable and what most enterprise buyers want to see." },
    { q: "Do you perform the actual audit?", a: "No. We prepare everything you need — gap analysis, policies, evidence guides, remediation. The actual audit must be done by a licensed CPA firm. We match you with vetted auditors and coordinate the handoff." },
    { q: "How much does the audit cost on top of your fee?", a: "CPA auditor fees typically range from $8,000–$15,000. You pay them directly. Our $5,000 covers getting you fully audit-ready. Total investment: $13K–$20K vs. $50K–$150K the traditional way." },
    { q: "How is this so much cheaper than Vanta?", a: "Vanta charges $10K–$80K/year as an ongoing subscription, plus auditor fees on top. We use AI to automate the heavy lifting and deliver as a one-time project. No recurring fees, no per-seat pricing." },
    { q: "What does the 30-day timeline look like?", a: "Week 1: Intake + AI gap analysis. Week 2: Policy package delivery. Week 3: Evidence setup + remediation. Week 4: Final review + auditor handoff." },
  ];
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-[var(--color-bg)] py-24">
      <div className="max-w-3xl mx-auto px-6">
        <Reveal>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">Frequently asked questions</h2>
          </div>
        </Reveal>
        <Reveal>
          <div className="space-y-2">
            {faqs.map((f, i) => (
              <div key={i} className="border border-[var(--color-border)] rounded-xl overflow-hidden">
                <button onClick={() => setOpenIdx(openIdx === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left hover:bg-[var(--color-surface)] transition">
                  <span className="text-navy font-semibold text-sm pr-4">{f.q}</span>
                  <span className={`text-blue text-xl transition-transform ${openIdx === i ? "rotate-45" : ""}`}>+</span>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${openIdx === i ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
                  <div className="px-5 pb-5 text-slate text-sm leading-relaxed">{f.a}</div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── CTA ─── */
function CTA() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      await saveLead(email);
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="cta" className="bg-navy py-24">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <Reveal className="reveal-scale">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to get compliant?</h2>
            <p className="text-slate text-lg mb-10">
              Take our free SOC 2 readiness assessment. Find out exactly where you stand — no strings attached.
            </p>
            {submitted ? (
              <div className="bg-green/10 border border-green/30 rounded-xl p-8 inline-block">
                <div className="text-3xl mb-3">🎉</div>
                <h3 className="text-xl font-bold text-white mb-2">You&apos;re in!</h3>
                <p className="text-slate">We&apos;ll send your free readiness assessment within 24 hours.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
                  <input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    className="flex-1 bg-navy-light border border-white/15 rounded-lg px-5 py-3.5 text-white placeholder-slate focus:outline-none focus:border-blue transition" />
                  <button onClick={handleSubmit} disabled={loading}
                    className="bg-blue hover:bg-blue-dark disabled:opacity-60 text-white px-8 py-3.5 rounded-lg font-semibold transition-all hover:shadow-lg hover:shadow-blue/25 whitespace-nowrap">
                    {loading ? "Saving..." : "Get Free Assessment"}
                  </button>
                </div>
                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                <p className="text-sm text-slate mt-4">No credit card required · Takes 5 minutes · Instant results</p>
              </>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── FOOTER ─── */
function Footer() {
  return (
    <footer className="bg-navy border-t border-white/5 py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-lg font-extrabold text-white">🛡️ ShieldBase</div>
          <div className="flex gap-8 text-sm text-slate">
            <a href="#how-it-works" className="hover:text-white transition">How It Works</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
          </div>
          <div className="text-sm text-slate">© 2026 ShieldBase. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}

/* ─── PAGE ─── */
export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <LogoBar />
      <Metrics />
      <Problem />
      <HowItWorks />
      <Pricing />
      <Deliverables />
      <Frameworks />
      <Testimonial />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}
