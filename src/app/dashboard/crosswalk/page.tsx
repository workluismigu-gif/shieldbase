"use client";
import { useMemo, useState } from "react";
import { Download, Grid3x3, Search } from "lucide-react";
import { CROSSWALK, crosswalkToCsv } from "@/lib/framework-crosswalk";

const FRAMEWORKS = [
  { key: "iso27001", label: "ISO 27001" },
  { key: "hipaa", label: "HIPAA" },
  { key: "pci_dss", label: "PCI DSS" },
  { key: "nist_csf", label: "NIST CSF" },
] as const;
type FrameworkKey = typeof FRAMEWORKS[number]["key"];

export default function CrosswalkPage() {
  const [q, setQ] = useState("");
  const [active, setActive] = useState<FrameworkKey[]>(["iso27001","hipaa","pci_dss","nist_csf"]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return CROSSWALK;
    return CROSSWALK.filter(r =>
      r.tsc.toLowerCase().includes(needle)
      || r.tsc_title.toLowerCase().includes(needle)
      || (r.iso27001 ?? []).some(v => v.toLowerCase().includes(needle))
      || (r.hipaa ?? []).some(v => v.toLowerCase().includes(needle))
      || (r.pci_dss ?? []).some(v => v.toLowerCase().includes(needle))
      || (r.nist_csf ?? []).some(v => v.toLowerCase().includes(needle))
    );
  }, [q]);

  const downloadCsv = () => {
    const csv = crosswalkToCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shieldbase-crosswalk-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggle = (k: FrameworkKey) => {
    setActive(cur => cur.includes(k) ? cur.filter(x => x !== k) : [...cur, k]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)] flex items-center gap-2">
            <Grid3x3 className="w-6 h-6 text-[var(--color-foreground-subtle)]" strokeWidth={1.8} /> Framework Crosswalk
          </h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">SOC 2 TSC mappings to ISO 27001:2022, HIPAA Security Rule, PCI DSS 4.0, and NIST CSF 2.0. Export as CSV for multi-framework engagements.</p>
        </div>
        <button onClick={downloadCsv}
          className="inline-flex items-center gap-2 bg-[var(--color-foreground)] text-[var(--color-surface)] hover:opacity-90 text-sm px-4 py-2 rounded-lg font-medium">
          <Download className="w-4 h-4" /> Download CSV
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--color-muted)]" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search TSC, ISO annex, HIPAA §, PCI req…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm focus:outline-none focus:border-[var(--color-foreground)]" />
        </div>
        {FRAMEWORKS.map(f => (
          <button key={f.key} onClick={() => toggle(f.key)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
              active.includes(f.key)
                ? "bg-[var(--color-foreground)] text-[var(--color-surface)] border-[var(--color-foreground)]"
                : "bg-[var(--color-bg)] text-[var(--color-muted)] border-[var(--color-border)]"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] text-left text-[11px] uppercase tracking-wider text-[var(--color-muted)]">
            <tr>
              <th className="px-4 py-3 w-[90px]">SOC 2</th>
              <th className="px-4 py-3">Criterion</th>
              {active.includes("iso27001") && <th className="px-4 py-3 w-[180px]">ISO 27001</th>}
              {active.includes("hipaa") && <th className="px-4 py-3 w-[160px]">HIPAA</th>}
              {active.includes("pci_dss") && <th className="px-4 py-3 w-[140px]">PCI DSS</th>}
              {active.includes("nist_csf") && <th className="px-4 py-3 w-[160px]">NIST CSF</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {filtered.map(r => (
              <tr key={r.tsc} className="hover:bg-[var(--color-surface)]">
                <td className="px-4 py-3 font-mono text-xs text-[var(--color-foreground)]">{r.tsc}</td>
                <td className="px-4 py-3 text-[var(--color-foreground-subtle)]">{r.tsc_title}</td>
                {active.includes("iso27001") && <td className="px-4 py-3 text-xs font-mono text-[var(--color-muted)]">{(r.iso27001 ?? []).join(", ") || "—"}</td>}
                {active.includes("hipaa") && <td className="px-4 py-3 text-xs font-mono text-[var(--color-muted)]">{(r.hipaa ?? []).join(", ") || "—"}</td>}
                {active.includes("pci_dss") && <td className="px-4 py-3 text-xs font-mono text-[var(--color-muted)]">{(r.pci_dss ?? []).join(", ") || "—"}</td>}
                {active.includes("nist_csf") && <td className="px-4 py-3 text-xs font-mono text-[var(--color-muted)]">{(r.nist_csf ?? []).join(", ") || "—"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
