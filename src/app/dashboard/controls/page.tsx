"use client";
import { useState, useMemo } from "react";
import { useOrg } from "@/lib/org-context";
import ControlTestModal from "@/components/ControlTestModal";

type FilterStatus = "all" | "compliant" | "partial" | "non_compliant" | "not_assessed";

export default function ControlsPage() {
  const { controls, loading, canWrite, role } = useOrg();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [selected, setSelected] = useState<{ id: string; title: string; status: string } | null>(null);

  const categories = useMemo(() => {
    const set = new Set(controls.map(c => c.category));
    return Array.from(set).sort();
  }, [controls]);

  const filtered = useMemo(() => {
    return controls.filter(c => {
      if (filter !== "all" && c.status !== filter) return false;
      if (categoryFilter && c.category !== categoryFilter) return false;
      if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.control_id.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [controls, filter, categoryFilter, search]);

  const statusColor = (s: string) =>
    s === "compliant" ? "bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success)]" :
    s === "partial" ? "bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning)]" :
    s === "non_compliant" ? "bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger)]" :
    "bg-[var(--color-surface)] text-[var(--color-muted)] border-[var(--color-border)]";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-foreground)] tracking-tight">Controls</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          {role === "auditor_readonly"
            ? "View the client's SOC 2 controls. Sign-off and status changes are owner/admin only."
            : "Test, annotate, and sign off on individual controls for SOC 2 audit."}
        </p>
      </div>

      <div className="bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] p-4 flex flex-wrap gap-3">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by control ID or title…"
          className="flex-1 min-w-[200px] border border-[var(--color-border-strong)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={filter} onChange={(e) => setFilter(e.target.value as FilterStatus)}
          className="border border-[var(--color-border-strong)] rounded-lg px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          <option value="compliant">Compliant</option>
          <option value="partial">Partial</option>
          <option value="non_compliant">Non-compliant</option>
          <option value="not_assessed">Not assessed</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-[var(--color-border-strong)] rounded-lg px-3 py-2 text-sm">
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <thead className="bg-[var(--color-surface)]">
            <tr className="text-left text-[11px] uppercase tracking-wider text-[var(--color-muted)]">
              <th className="px-4 py-3 w-[90px]">ID</th>
              <th className="px-4 py-3 w-[140px]">Category</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3 w-[120px]">Status</th>
              <th className="px-4 py-3 w-[90px]">Severity</th>
              <th className="px-4 py-3 w-[140px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--color-muted)]">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--color-muted)]">No controls match — run a scan or adjust filters.</td></tr>
            ) : (
              filtered.map(c => (
                <tr key={c.control_id} className="hover:bg-[var(--color-surface)]">
                  <td className="px-4 py-3 font-mono text-xs text-[var(--color-muted)] truncate">{c.control_id}</td>
                  <td className="px-4 py-3 text-xs text-[var(--color-muted)] truncate">{c.category}</td>
                  <td className="px-4 py-3 text-[var(--color-foreground)] truncate" title={c.title}>{c.title}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded border ${statusColor(c.status)} whitespace-nowrap`}>
                      {c.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-muted)]">{c.severity ?? "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setSelected({ id: c.control_id, title: c.title, status: c.status })}
                      className="text-xs bg-[var(--color-foreground)] text-[var(--color-surface)] hover:opacity-90 px-3 py-1.5 rounded-md font-medium">
                      {canWrite ? "Test & sign off" : "Open"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <ControlTestModal
          controlId={selected.id}
          controlTitle={selected.title}
          currentStatus={selected.status}
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); window.location.reload(); }}
        />
      )}
    </div>
  );
}
