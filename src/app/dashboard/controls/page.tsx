"use client";
import { useState, useMemo, useEffect } from "react";
import { useOrg } from "@/lib/org-context";
import ControlTestModal from "@/components/ControlTestModal";
import { supabase } from "@/lib/supabase";
import { Beaker, Users as UsersIcon, X, AlertOctagon } from "lucide-react";

type FilterStatus = "all" | "compliant" | "partial" | "non_compliant" | "not_assessed";

interface Assignment { id: string; control_id: string; assigned_to: string }
interface StaffMember { user_id: string; email: string; role: string }

export default function ControlsPage() {
  const { org, controls, loading, canWrite, role } = useOrg();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [sampleFilter, setSampleFilter] = useState<"all" | "in_sample">("all");
  const [selected, setSelected] = useState<{ id: string; title: string; status: string } | null>(null);
  const [sampleOverrides, setSampleOverrides] = useState<Record<string, boolean>>({});
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [assignPickerFor, setAssignPickerFor] = useState<string | null>(null);

  const isAuditor = role === "auditor_readonly";
  const isStaff = role === "auditor_staff";
  const isLead = role === "owner" || role === "admin" || role === "auditor_readonly";

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!org?.id) return;
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const token = s?.session?.access_token;
      if (!token) return;
      const res = await fetch(`/api/control-assignments?org_id=${org.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      setAssignments(j.assignments ?? []);
    })();
    // Fetch staff list (members with auditor_staff role)
    (async () => {
      const { data } = await supabase
        .from("org_members").select("user_id, email, role").eq("org_id", org.id);
      setStaff((data ?? []).filter(m => m.role === "auditor_staff") as StaffMember[]);
    })();
  }, [org?.id]);

  const assignmentsByControl = useMemo(() => {
    const m: Record<string, Assignment[]> = {};
    for (const a of assignments) (m[a.control_id] ||= []).push(a);
    return m;
  }, [assignments]);

  const myAssignedControlIds = useMemo(() => {
    if (!currentUserId) return new Set<string>();
    return new Set(assignments.filter(a => a.assigned_to === currentUserId).map(a => a.control_id));
  }, [assignments, currentUserId]);

  const categories = useMemo(() => {
    const set = new Set(controls.map(c => c.category));
    return Array.from(set).sort();
  }, [controls]);

  const inSample = (control_id: string, dbValue?: boolean) => {
    if (control_id in sampleOverrides) return sampleOverrides[control_id];
    return !!dbValue;
  };

  const sampleCount = useMemo(() =>
    controls.filter(c => inSample(c.control_id, c.in_sample)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [controls, sampleOverrides]);

  const filtered = useMemo(() => {
    return controls.filter(c => {
      // Staff see only controls assigned to them.
      if (isStaff && !myAssignedControlIds.has(c.control_id)) return false;
      if (filter !== "all" && c.status !== filter) return false;
      if (categoryFilter && c.category !== categoryFilter) return false;
      if (sampleFilter === "in_sample" && !inSample(c.control_id, c.in_sample)) return false;
      if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.control_id.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls, filter, categoryFilter, search, sampleFilter, sampleOverrides, isStaff, myAssignedControlIds]);

  const toggleAssignment = async (control_id: string, assigned_to: string) => {
    if (!org?.id) return;
    const { data: s } = await supabase.auth.getSession();
    const token = s?.session?.access_token;
    if (!token) return;
    const existing = assignments.find(a => a.control_id === control_id && a.assigned_to === assigned_to);
    if (existing) {
      const res = await fetch("/api/control-assignments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: existing.id }),
      });
      if (res.ok) setAssignments(a => a.filter(x => x.id !== existing.id));
    } else {
      const res = await fetch("/api/control-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ org_id: org.id, control_id, assigned_to }),
      });
      const j = await res.json();
      if (res.ok && j.assignment) setAssignments(a => [...a, j.assignment]);
    }
  };

  const toggleSample = async (control_id: string, current: boolean) => {
    const next = !current;
    setSampleOverrides(o => ({ ...o, [control_id]: next }));
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;
    const res = await fetch("/api/controls/sample", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ control_id, in_sample: next, auth_token: session.session.access_token }),
    });
    if (!res.ok) {
      // Revert on failure.
      setSampleOverrides(o => ({ ...o, [control_id]: current }));
    }
  };

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
          {isStaff
            ? `Showing ${myAssignedControlIds.size} control${myAssignedControlIds.size === 1 ? "" : "s"} assigned to you by the lead auditor.`
            : isAuditor
            ? "View the client's SOC 2 controls. Mark items as in-sample to track which ones you'll test for this engagement."
            : "Test, annotate, and sign off on individual controls for SOC 2 audit."}
        </p>
      </div>

      <div className="bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] p-4 flex flex-wrap gap-3 items-center">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by control ID or title…"
          className="flex-1 min-w-[200px] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-border-strong)]" />
        <select value={filter} onChange={(e) => setFilter(e.target.value as FilterStatus)}
          className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-foreground)]">
          <option value="all">All statuses</option>
          <option value="compliant">Compliant</option>
          <option value="partial">Partial</option>
          <option value="non_compliant">Non-compliant</option>
          <option value="not_assessed">Not assessed</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-foreground)]">
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => setSampleFilter(sampleFilter === "all" ? "in_sample" : "all")}
          title={sampleFilter === "in_sample" ? "Click to show all controls" : "Click to show only in-sample controls"}
          className={`inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border transition ${
            sampleFilter === "in_sample"
              ? "bg-[var(--color-info-bg)] text-[var(--color-info)] border-[var(--color-info)]"
              : "bg-[var(--color-bg)] text-[var(--color-muted)] border-[var(--color-border)] hover:text-[var(--color-foreground)]"
          }`}>
          <Beaker className="w-3.5 h-3.5" strokeWidth={1.8} />
          {sampleFilter === "in_sample" ? "In-sample only" : "All controls"}
          {sampleCount > 0 && (
            <span className={`ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full ${
              sampleFilter === "in_sample"
                ? "bg-[var(--color-info)] text-white"
                : "bg-[var(--color-info-bg)] text-[var(--color-info)]"
            }`}>{sampleCount}</span>
          )}
        </button>
      </div>

      <div className="bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <thead className="bg-[var(--color-surface)]">
            <tr className="text-left text-[11px] uppercase tracking-wider text-[var(--color-muted)]">
              <th className="px-4 py-3 w-[60px]">Smpl</th>
              <th className="px-4 py-3 w-[90px]">ID</th>
              <th className="px-4 py-3 w-[140px]">Category</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3 w-[120px]">Status</th>
              <th className="px-4 py-3 w-[90px]">Severity</th>
              {isLead && <th className="px-4 py-3 w-[130px]">Staff</th>}
              <th className="px-4 py-3 w-[140px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {loading ? (
              <tr><td colSpan={isLead ? 8 : 7} className="px-4 py-8 text-center text-sm text-[var(--color-muted)]">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={isLead ? 8 : 7} className="px-4 py-12 text-center">
                <div className="text-sm font-medium text-[var(--color-foreground)]">No controls match</div>
                <div className="text-xs text-[var(--color-muted)] mt-1">
                  {isStaff ? "No controls are assigned to you yet — ask the lead auditor." : "Run a scan to populate findings, or clear filters above."}
                </div>
              </td></tr>
            ) : (
              filtered.map(c => {
                const sampled = inSample(c.control_id, c.in_sample);
                return (
                  <tr key={c.control_id} className="hover:bg-[var(--color-surface)]">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={sampled}
                        disabled={!isAuditor}
                        onChange={() => isAuditor && toggleSample(c.control_id, sampled)}
                        title={isAuditor ? (sampled ? "In sample — uncheck to remove" : "Add to sample") : "Only the auditor can change the sample"}
                        className="accent-[var(--color-info)] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50" />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--color-muted)] truncate">{c.control_id}</td>
                    <td className="px-4 py-3 text-xs text-[var(--color-muted)] truncate">{c.category}</td>
                    <td className="px-4 py-3 text-[var(--color-foreground)] truncate" title={c.title}>{c.title}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded border ${statusColor(c.status)} whitespace-nowrap`}>
                        {c.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-muted)]">{c.severity ?? "-"}</td>
                    {isLead && (
                      <td className="px-4 py-3">
                        <button onClick={() => setAssignPickerFor(c.control_id)}
                          className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-2 py-1">
                          <UsersIcon className="w-3 h-3" />
                          {(assignmentsByControl[c.control_id]?.length ?? 0) === 0 ? "Unassigned" : `${assignmentsByControl[c.control_id].length} assigned`}
                        </button>
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        {(isAuditor || isStaff) && (c.status === "non_compliant" || c.status === "partial") && (
                          <button title="Flag as finding"
                            onClick={async () => {
                              if (!org?.id) return;
                              const { data: sess } = await supabase.auth.getSession();
                              const token = sess?.session?.access_token;
                              if (!token) return;
                              const res = await fetch("/api/findings", {
                                method: "POST",
                                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                body: JSON.stringify({
                                  org_id: org.id,
                                  control_id: c.control_id,
                                  title: `${c.control_id}: ${c.title}`,
                                  description: `Flagged from Controls list on ${new Date().toLocaleDateString()} (status: ${c.status}).`,
                                  severity: c.severity === "critical" ? "critical" : c.severity === "high" ? "high" : "medium",
                                  disposition: "deficiency",
                                }),
                              });
                              const j = await res.json();
                              if (res.ok && j.finding?.id) window.location.href = `/dashboard/findings/${j.finding.id}`;
                            }}
                            className="p-1.5 text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] rounded-md">
                            <AlertOctagon className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => setSelected({ id: c.control_id, title: c.title, status: c.status })}
                          className="text-xs bg-[var(--color-foreground)] text-[var(--color-surface)] hover:opacity-90 px-3 py-1.5 rounded-md font-medium">
                          {canWrite ? "Test & sign off" : "Open"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
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

      {assignPickerFor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setAssignPickerFor(null)}>
          <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-[var(--color-foreground)]">Assign staff</h3>
                <p className="text-xs text-[var(--color-muted)] font-mono mt-1">{assignPickerFor}</p>
              </div>
              <button onClick={() => setAssignPickerFor(null)} className="text-[var(--color-muted)] hover:text-[var(--color-foreground)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            {staff.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">No auditor staff invited yet. Invite them from the Team page — assign controls afterward.</p>
            ) : (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {staff.map(s => {
                  const isAssigned = !!assignments.find(a => a.control_id === assignPickerFor && a.assigned_to === s.user_id);
                  return (
                    <label key={s.user_id} className="flex items-center gap-3 py-2 px-2 hover:bg-[var(--color-surface-2)] rounded-lg cursor-pointer">
                      <input type="checkbox" checked={isAssigned} onChange={() => toggleAssignment(assignPickerFor, s.user_id)}
                        className="accent-[var(--color-info)]" />
                      <span className="text-sm text-[var(--color-foreground)]">{s.email}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
