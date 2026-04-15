"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useOrg } from "@/lib/org-context";
import { supabase } from "@/lib/supabase";
import { Dices, Calculator, Beaker, RefreshCw, Copy, CheckCircle2 } from "lucide-react";
import { FREQUENCY_GUIDE, sampleSizeFor, generateSeed, type ControlFrequency } from "@/lib/sampling";

export default function SamplingPage() {
  const { org, role } = useOrg();
  const isAuditor = role === "auditor_readonly";

  const [seed, setSeed] = useState<string>("");
  const [seedDirty, setSeedDirty] = useState(false);
  const [seedSaving, setSeedSaving] = useState(false);
  const [seedCopied, setSeedCopied] = useState(false);

  // Calculator state
  const [population, setPopulation] = useState(12);
  const [frequency, setFrequency] = useState<ControlFrequency>("monthly");
  const calc = sampleSizeFor(frequency, population);

  // Selection state
  const [scope, setScope] = useState<"all" | "failing">("all");
  const [n, setN] = useState<number>(calc.n);
  const [selecting, setSelecting] = useState(false);
  const [selectResult, setSelectResult] = useState<{ selected: string[]; total_population: number } | null>(null);
  const [currentSample, setCurrentSample] = useState<string[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (org?.sample_seed) setSeed(org.sample_seed);
    else if (!seed && org) setSeed(generateSeed());
  }, [org]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCurrent = async () => {
    if (!org?.id) return;
    const { data } = await supabase
      .from("controls")
      .select("control_id")
      .eq("org_id", org.id)
      .eq("in_sample", true)
      .order("control_id");
    setCurrentSample((data ?? []).map(r => r.control_id as string));
  };

  useEffect(() => { loadCurrent(); }, [org?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setN(calc.n); }, [calc.n]);

  const saveSeed = async () => {
    if (!org?.id) return;
    setSeedSaving(true);
    const { error } = await supabase
      .from("organizations")
      .update({ sample_seed: seed || null })
      .eq("id", org.id);
    setSeedSaving(false);
    if (!error) setSeedDirty(false);
    else setErr(error.message);
  };

  const copySeed = async () => {
    try {
      await navigator.clipboard.writeText(seed);
      setSeedCopied(true);
      setTimeout(() => setSeedCopied(false), 1500);
    } catch { /* noop */ }
  };

  const runSelect = async () => {
    if (!isAuditor) { setErr("Only the auditor can run sample selection."); return; }
    if (!seed) { setErr("Set an engagement seed first."); return; }
    setSelecting(true); setErr(""); setSelectResult(null);
    const { data: s } = await supabase.auth.getSession();
    const token = s?.session?.access_token;
    if (!token) { setErr("Not signed in."); setSelecting(false); return; }
    const res = await fetch("/api/controls/sample/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auth_token: token, scope, n, seed }),
    });
    const j = await res.json();
    setSelecting(false);
    if (!res.ok) { setErr(j.error || "Selection failed"); return; }
    setSelectResult({ selected: j.selected ?? [], total_population: j.total_population ?? 0 });
    await loadCurrent();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)] flex items-center gap-2">
          <Beaker className="w-6 h-6 text-[var(--color-foreground-subtle)]" strokeWidth={1.8} />
          Sampling Workspace
        </h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">AICPA-aligned sample size guidance + deterministic random selection. Seed reproducibility keeps Year-2 walkthroughs honest.</p>
      </div>

      {/* Current sample */}
      <section className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-6 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[var(--color-foreground)]">Current sample</h2>
          <Link href="/dashboard/controls" className="text-sm text-[var(--color-info)] hover:underline">View on controls page →</Link>
        </div>
        {currentSample.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No controls are currently flagged as in-sample. Run a selection below.</p>
        ) : (
          <>
            <p className="text-sm text-[var(--color-muted)]">
              <span className="font-bold text-[var(--color-foreground)]">{currentSample.length}</span> control{currentSample.length === 1 ? "" : "s"} flagged as in-sample right now.
              {org?.sample_seed && <> Seed on file: <span className="font-mono text-[var(--color-foreground-subtle)]">{org.sample_seed}</span>.</>}
            </p>
            <div className="bg-[var(--color-surface-2)] rounded-lg p-3 font-mono text-xs text-[var(--color-foreground-subtle)] leading-relaxed">
              {currentSample.join(", ")}
            </div>
          </>
        )}
      </section>

      {/* Engagement seed */}
      <section className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Dices className="w-4 h-4 text-[var(--color-foreground-subtle)]" />
          <h2 className="font-semibold text-[var(--color-foreground)]">Engagement seed</h2>
        </div>
        <p className="text-sm text-[var(--color-muted)]">Stored on the engagement so anyone can reproduce the same sample. Re-running selection with the same seed + population picks the same items.</p>
        <div className="flex gap-2">
          <input value={seed} onChange={e => { setSeed(e.target.value); setSeedDirty(true); }}
            className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-mono focus:outline-none focus:border-[var(--color-foreground)]"
            placeholder="AUDIT-2026-X7F9Q2" />
          <button onClick={() => { setSeed(generateSeed()); setSeedDirty(true); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm hover:bg-[var(--color-surface-2)]">
            <RefreshCw className="w-3.5 h-3.5" /> Regenerate
          </button>
          <button onClick={copySeed}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm hover:bg-[var(--color-surface-2)]">
            {seedCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success)]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
        {seedDirty && (
          <button onClick={saveSeed} disabled={seedSaving}
            className="bg-[var(--color-foreground)] text-[var(--color-surface)] hover:opacity-90 disabled:opacity-40 text-sm px-4 py-2 rounded-lg font-medium">
            {seedSaving ? "Saving..." : "Save seed"}
          </button>
        )}
      </section>

      {/* Calculator */}
      <section className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[var(--color-foreground-subtle)]" />
          <h2 className="font-semibold text-[var(--color-foreground)]">Sample size calculator</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-[var(--color-foreground-subtle)] block mb-1">Control frequency</label>
            <select value={frequency} onChange={e => setFrequency(e.target.value as ControlFrequency)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm">
              {FREQUENCY_GUIDE.map(f => (
                <option key={f.key} value={f.key}>{f.label} (n = {f.suggestedMin}–{f.suggestedMax})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--color-foreground-subtle)] block mb-1">Population size</label>
            <input type="number" min={1} value={population} onChange={e => setPopulation(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-mono" />
          </div>
        </div>

        <div className="bg-[var(--color-surface-2)] rounded-lg p-4 space-y-2">
          <div className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wider">Recommended</div>
          <div className="text-4xl font-bold text-[var(--color-foreground)] tabular-nums">n = {calc.n}</div>
          <p className="text-sm text-[var(--color-foreground-subtle)]">{calc.rationale}</p>
        </div>
      </section>

      {/* Selection */}
      <section className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Dices className="w-4 h-4 text-[var(--color-foreground-subtle)]" />
          <h2 className="font-semibold text-[var(--color-foreground)]">Select random sample</h2>
        </div>
        <p className="text-sm text-[var(--color-muted)]">
          Uses the seed above + Fisher–Yates over the sorted population. Deterministic: running this again with the same seed + same population gives the same sample.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-[var(--color-foreground-subtle)] block mb-1">Sample size (n)</label>
            <input type="number" min={1} value={n} onChange={e => setN(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-mono" />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--color-foreground-subtle)] block mb-1">Scope</label>
            <select value={scope} onChange={e => setScope(e.target.value as "all" | "failing")}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm">
              <option value="all">All controls</option>
              <option value="failing">Failing controls only</option>
            </select>
          </div>
        </div>

        {!isAuditor && (
          <div className="bg-[var(--color-info-bg)] border border-[var(--color-info)]/30 rounded-lg p-3 text-sm text-[var(--color-info)]">
            Only the auditor role can run sample selection. This page is read-only for owners/admins.
          </div>
        )}

        <button onClick={runSelect} disabled={!isAuditor || selecting}
          className="inline-flex items-center gap-2 bg-[var(--color-foreground)] text-[var(--color-surface)] hover:opacity-90 disabled:opacity-40 text-sm px-4 py-2 rounded-lg font-medium">
          <Dices className="w-4 h-4" />
          {selecting ? "Selecting..." : "Run selection"}
        </button>

        {err && <div className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-bg)] px-3 py-2 rounded-lg">{err}</div>}

        {selectResult && (
          <div className="space-y-2 pt-2">
            <div className="text-sm text-[var(--color-foreground-subtle)]">
              Selected <span className="font-bold text-[var(--color-foreground)]">{selectResult.selected.length}</span> of {selectResult.total_population} in scope.
            </div>
            <div className="bg-[var(--color-surface-2)] rounded-lg p-3 font-mono text-xs text-[var(--color-foreground-subtle)] leading-relaxed">
              {selectResult.selected.join(", ") || "(none)"}
            </div>
            <Link href="/dashboard/controls" className="text-sm text-[var(--color-info)] hover:underline inline-flex items-center gap-1">
              Open controls with sample flagged →
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
