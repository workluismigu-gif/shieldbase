"use client";
import { useState, useMemo } from "react";
import { useOrg } from "@/lib/org-context";
import ControlTestModal from "@/components/ControlTestModal";

type FilterStatus = "all" | "compliant" | "partial" | "non_compliant" | "not_assessed";

export default function ControlsPage() {
  const { controls, loading } = useOrg();
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
    s === "compliant" ? "bg-green-50 text-green-700 border-green-200" :
    s === "partial" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
    s === "non_compliant" ? "bg-red-50 text-red-700 border-red-200" :
    "bg-gray-50 text-gray-600 border-gray-200";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Controls</h1>
        <p className="text-sm text-gray-500 mt-1">Test, annotate, and sign off on individual controls for SOC 2 audit.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by control ID or title…"
          className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={filter} onChange={(e) => setFilter(e.target.value as FilterStatus)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          <option value="compliant">Compliant</option>
          <option value="partial">Partial</option>
          <option value="non_compliant">Non-compliant</option>
          <option value="not_assessed">Not assessed</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs uppercase text-gray-500">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No controls match — run a scan or adjust filters.</td></tr>
            ) : (
              filtered.map(c => (
                <tr key={c.control_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{c.control_id}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{c.category}</td>
                  <td className="px-4 py-3 text-gray-900">{c.title}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded border ${statusColor(c.status)}`}>
                      {c.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.severity ?? "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setSelected({ id: c.control_id, title: c.title, status: c.status })}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md font-medium">
                      Test & sign off
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
