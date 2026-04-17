# ShieldBase — Action Plan

Grounded in real user complaints from Drata + Vanta aggregator reviews (see `drata-pain-points.md`, `vanta-pain-points.md`). Codebase state verified via grep/read against `src/` + `supabase/migrations/` at commit `ec71d58` (Apr 2026).

**SMB lens:** Drata + Vanta both skew mid-market+ and both struggle with SMB-specific pain. ShieldBase targets SMB/founders. Weighting SMB complaints 2× here.

---

## TOP 5 RANKED OPPORTUNITIES

### 1. Transparent pricing with a truly free tier

- **The pain:** Both competitors charge $10K+/yr starting, quote-only, with renewal shocks ($7.5K → $20K+ on second framework) and hidden $25K implementation fees. Cited in 15+ reviews across both vendors. Single most-cited SMB blocker.
- **We solve it today:** ✅ Pricing section on `src/app/page.tsx` publicly shows **Free / $15K Pro / Custom Firm**. Free tier marked "available now" — literally every feature shipped today is free in early access per commit messages.
- **What to build:** Marketing — land on "free forever for seed/pre-revenue" messaging across every competitor-landing page and in-app upgrade prompts. Add a public pricing explainer page that calls out Drata/Vanta hidden fees by name (carefully, factually).
- **Effort:** 1 week.

### 2. Auditor-side workspace (not just company-side)

- **The pain:** Vanta users repeatedly report that when the real audit starts, their CPA firm still uses their own tooling — Vanta becomes a glorified screenshot library. 3+ direct reviews, common churn reason. Drata slightly better but custom-framework auditor-view still desyncs.
- **We solve it today:** ✅ Full auditor workbench — `src/app/dashboard/findings/` (AICPA dispositions), `src/app/dashboard/sampling/` (deterministic-seeded selection), `src/app/dashboard/ipe/` (completeness + accuracy walkthroughs), `src/app/dashboard/engagements/` (YoY carryforward), `src/lib/workpaper-pdf.ts` (full SOC 2 Type II workpaper with service-auditor-report template), `supabase/migrations/007_auditor_staff_role.sql` (staff assignments + sign-off gates).
- **What to build:** Nothing — we already ship this. Messaging gap. Add a "Your audit firm works inside your tenant" line on landing + case-study content once we have a firm testimonial.
- **Effort:** Messaging — 1 week.

### 3. Plain-English guidance for non-CISO founders

- **The pain:** Multiple Vanta reviews (SMB-weighted) describe feeling lost during first audit cycle. Drata users rely on "third-party implementation partners" to get through. Both products built for compliance pros, not founders. 5+ reviews across both.
- **We solve it today:** ✅ Partial — `src/components/Glossary.tsx` provides hover tooltips on PBC / IPE / disposition / walkthrough / sampling / crosswalk. `src/components/FounderHero.tsx` gives stage-aware copy ("Let's start your SOC 2 journey" → "You're ready for an auditor") + 3 fastest-wins cards. Audit-mode toggle hides auditor jargon from founders.
- **What to build:** Expand glossary coverage across more components (/controls page still uses raw terms, some pages bypass Glossary). Add an inline "What does this mean for my audit?" expander on failing-control rows.
- **Effort:** 2 weeks.

### 4. Reliable integrations (kill the "bugs on monthly basis" perception)

- **The pain:** Drata specifically takes hits for integrations breaking (Zoho Desk 12+ mo ticket), custom framework desync, monthly breakages. Vanta 207+ mentions of integration issues across aggregated reviews, specific oversell complaints. This is THE opening for a new entrant.
- **We solve it today:** ⚠️ Partial — we ship AWS / GitHub / Slack live with Google + Azure in beta. Lower integration count (5 vs Vanta's 400+), but what we ship runs a real Prowler Lambda + webhook-driven scans + we preserve raw API payloads for Year-2 re-performance (per Morgan's audit). Migrations 001, 003 show we actually track scan state changes.
- **What to build:** (a) Finish Google Workspace + Azure scan wiring through Lambda so their dots can go green on the dashboard; (b) ship public integration-status page (like https://status.stripe.com but per-connector) — huge credibility move because competitors don't do this; (c) add JumpCloud / Okta / Workday / 1Password as priorities since reviews cite these gaps.
- **Effort:** Google/Azure Lambda 2 weeks; status page 1 week; each new integration ~1 week.

### 5. No-contract-lock-in / month-to-month option

- **The pain:** Vanta's "locked in for remainder of contract" story is the single sharpest SMB horror story in the corpus. Directly cited as churn driver.
- **We solve it today:** ⚠️ Not an anti-feature in the code, but we haven't published a no-lock-in commitment anywhere. Pricing section says "Free while we're in early access" but doesn't explicitly say "monthly cancellation, no annual lock."
- **What to build:** Explicit policy on landing pricing section ("Monthly billing, cancel anytime — no annual contract") + in signup flow. This is a free feature to offer while we're in early access anyway.
- **Effort:** 1 day — copy change.

---

## Quick wins (< 2 weeks)

### QW1. "No lock-in, cancel anytime" messaging everywhere

- **Pain:** Vanta contract-lock horror story (§5 above).
- **Codebase state:** Pricing section exists on `src/app/page.tsx` but doesn't mention contract terms.
- **Ship:** Add explicit billing-terms line to Free + Pro pricing cards. Add to signup page confirmation. Add to FAQ as first question.
- **Why it matters:** Single copy change that captures churned Vanta customers. Trust signal for first-time buyers.

### QW2. Public changelog page

- **Pain:** Drata's "breaks monthly" reputation is partly a perception gap — vendor ships fixes, users don't know. A public changelog eats that FUD.
- **Codebase state:** ❌ No changelog page exists. Route `/changelog` doesn't exist.
- **Ship:** `src/app/changelog/page.tsx` rendered from a markdown file committed per release. Auto-dated.
- **Why it matters:** Credibility against "it's broken" claims. Differentiator — neither Drata nor Vanta publishes one publicly.

### QW3. Fix all remaining `bg-gray-*` / `text-gray-*` hardcoded classes in dashboard

- **Pain:** Not a competitor complaint; follows from our own warm-theme rollout. 80 hardcoded occurrences across 18 files resolved via legacy aliases but may clash visually.
- **Codebase state:** Warm theme live; legacy aliases cover most cases but some hardcoded `bg-white` / `bg-gray-50` cards will render cool-white on warm-gray.
- **Ship:** Grep-and-replace pass across `src/app/dashboard/**/*.tsx` — swap `bg-white` → `bg-[var(--color-bg)]`, `text-gray-900` → `text-[var(--color-foreground)]`, etc.
- **Why it matters:** Editorial warm look stays consistent. Small polish but felt everywhere.

### QW4. Evidence-collection status page (public)

- **Pain:** Integration reliability doubts (both vendors).
- **Codebase state:** ❌ No public status page. Dashboard shows per-connector dots only.
- **Ship:** Public `/status` page listing scanner uptimes, last-successful-scan per provider, known issues. Use a simple markdown-driven component.
- **Why it matters:** Again, differentiates. And our Slack Lambda-rebuild requirement (per session handoff memory) becomes a visible operational story.

### QW5. Compare page: ShieldBase vs Vanta vs Drata

- **Pain:** Buyers Google "Vanta vs Drata vs alternatives" and we don't show up in that consideration set.
- **Codebase state:** ❌ No `/compare` or `/vs` pages exist.
- **Ship:** `src/app/compare/page.tsx` with honest feature matrix. Cite our free tier + auditor workbench vs their pricing opacity. Don't trash talk — just stack the claims side-by-side.
- **Why it matters:** Top-of-funnel SEO + direct competitor intent capture.

---

## Medium (1–3 months)

### M1. Google Workspace + Azure scanners fully through Lambda

- **Pain:** Integration breadth gap vs Vanta (5 vs 400+ connectors). Starting with the 2 most-requested that are half-done is the 80/20.
- **Codebase state:** Partial — scan branches exist in `src/app/api/scan/trigger/route.ts`, org-level token storage exists, but Lambda handler doesn't fully process them (per session handoff memory — shieldbase-prowler-scanner needs rebuild with added Google/Azure Prowler providers).
- **Ship:** Add Prowler providers to Lambda Dockerfile, rebuild image (user's laptop), push to ECR, update Lambda. Run verification scans.
- **Why it matters:** Moves Slack/GWS/Azure dots from yellow beta → green live. Visible on dashboard + landing.

### M2. Auto-sample-select + one-click workpaper export marketing demo

- **Pain:** "Vanta becomes evidence staging, auditor uses own tooling" churn driver.
- **Codebase state:** ✅ Built — `src/app/dashboard/sampling/page.tsx` + `src/lib/sampling.ts` + `src/lib/workpaper-pdf.ts`.
- **Ship:** A public demo video (90 sec) of: click "Run selection" → pick 3 controls → click "Export workpaper" → open 40-page PDF. Host on landing hero and in compare page.
- **Why it matters:** THE feature Drata/Vanta don't have. We need to SHOW it, not just describe it.

### M3. Integrations: JumpCloud + Okta (SMB identity standards)

- **Pain:** SMBs commonly use one of these; not covered by current AWS/GitHub/Slack set.
- **Codebase state:** ❌ Not built. `src/app/api/auth/` has AWS / GitHub / Slack / Azure / Google callbacks, no JumpCloud / Okta.
- **Ship:** OAuth + scan handler for both. Each ~1 week of eng.
- **Why it matters:** Makes us table-stakes for SMB identity coverage. Missing these is a deal-breaker in demo.

### M4. "What to do this week" task-list view (Priya's ask)

- **Pain:** Lingering founder ask — score is a number, not a plan.
- **Codebase state:** ⚠️ Partial — `src/components/NextBestActions.tsx` shows 1 top action, `src/components/FounderHero.tsx` has 3 fastest wins. Not yet a cohesive "this week's plan" view.
- **Ship:** New route `/dashboard/this-week` — cards for each open finding / failing control / overdue PBC / policy-to-write. Each card: 1-line plain-English why, estimated-time-to-fix, owner assignment, "why the auditor cares" expander.
- **Why it matters:** Captures Vanta's "I managed my audit manually" churn driver. Plain-English plan turns founder mode into a real program manager.

### M5. Security incident transparency page

- **Pain:** Vanta 2025 data breach is now a permanent brand stain. ShieldBase can differentiate by owning the security posture narrative proactively.
- **Codebase state:** ❌ No public security page beyond trust center.
- **Ship:** `/security` page with: how we encrypt customer data (AES-256-GCM per commit 05a7155), where it lives (Supabase region), who can access it, 2FA policy, incident history (empty, hopefully).
- **Why it matters:** Trust differentiator. Also CC6.x evidence for our own trust center.

---

## Big bets (3+ months)

### BB1. AI-assisted control remediation

- **Pain:** "Remediation instructions unclear" (Drata), "I didn't know what to do" (Vanta). Both cited in 5+ reviews.
- **Codebase state:** ❌ Not built. Findings page accepts an auditor conclusion but has no AI suggestion for remediation.
- **Ship:** When a control fails, use Claude/GPT to generate step-by-step remediation scoped to the provider (AWS CLI command, GitHub setting, Slack admin path). Cite the exact API we scanned. Review + apply button.
- **Why it matters:** Genuinely novel. Drata's AI is basic summarization only. A real "fix this" button is a SMB moat.

### BB2. White-labeled auditor workspace for CPA firms

- **Pain:** Auditor-workbench complaint above. Firms want their branding, their workflow.
- **Codebase state:** ⚠️ Partial — `supabase/migrations/007_auditor_staff_role.sql` ships lead + staff roles with per-control scoping. No multi-client dashboard for a firm yet.
- **Ship:** Firm tenant model — CPA firm logs in, sees all client tenants they're engaged with, firm-level reporting, white-label trust centers. Big schema lift.
- **Why it matters:** Pricing tier 3 ("Firm custom"). Unlocks channel: a CPA firm adopting us becomes a distribution engine.

### BB3. Year-2 automated re-performance

- **Pain:** Neither competitor offers this. Morgan Reyes's review specifically called out Year-2 re-performance as where competitors' evidence chain breaks down.
- **Codebase state:** ✅ Foundation built — raw API payloads are preserved per commit `c40125f` / Lambda handler. Test iterations capture period coverage.
- **Ship:** Automated walk-forward comparison between this year's evidence and last year's, flagging exceptions / drift. Works because we preserved raw payloads.
- **Why it matters:** Moves us from "SOC 2 platform" to "SOC 2 program operator." Year-over-year retention is where recurring revenue lives.

### BB4. Trust Center Pro — shareable with NDA-gated detail

- **Pain:** Vanta / Drata trust centers are marketing pages. Real prospect procurement teams want to see actual evidence under NDA.
- **Codebase state:** ⚠️ Partial — `/trust/[slug]` is live data via `supabase/migrations/004_trust_center.sql`. NDA-gated document request flow still a placeholder in handoff memory.
- **Ship:** Visitor fills NDA → auto-sends DocuSign → grants temporary access to audit report PDF + policy library + SOC 2 report. Log + track.
- **Why it matters:** The single action that closes a $400K deal. Priya's exact scenario.

### BB5. Multi-framework audit in single engagement

- **Pain:** SMBs adding frameworks suffer incremental $3K–$10K per-framework fees at both vendors. Drata/Vanta treat each framework as a separate program.
- **Codebase state:** ✅ Foundation — `src/lib/framework-crosswalk.ts` + `src/app/dashboard/crosswalk/page.tsx` map SOC 2 → ISO/HIPAA/PCI/NIST. Migration `010_audit_mode_toggle.sql` supports per-framework engagements.
- **Ship:** Single engagement attests to multiple frameworks via crosswalk. One sample set → multiple workpapers. Auditor can sign off once, mapped controls satisfy all.
- **Why it matters:** Crushes the per-framework fee model. Direct price wedge.

---

## Summary

- **#1 opportunity** is the one we already solve (auditor workbench + transparent free tier) — biggest ROI is pure messaging, not net-new code.
- Second biggest lever is shipping fixes for integration count + reliability where competitors have worn down trust.
- Third is AI-remediation — a genuine moat for the SMB tier.

**Coverage caveat:** Deep-scrape of Reddit + direct G2/Capterra pages was blocked by sandbox during data collection. Complaints above reflect what G2/Capterra/TrustPilot aggregators (ComplyJet, Sprinto, 6clicks, Smartly) have compiled from verified user reviews, plus TechRadar reporting on the 2025 Vanta breach. If sharper Reddit voice is needed, paste specific thread URLs and this plan can be re-ranked.
