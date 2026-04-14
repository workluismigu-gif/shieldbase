"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useOrg } from "@/lib/org-context";
import { supabase } from "@/lib/supabase";
import { Building2, Plus, Edit2, Trash2, AlertTriangle, ExternalLink } from "lucide-react";
import { formatDateOnly, isPast } from "@/lib/dates";

type Crit = "critical" | "high" | "medium" | "low";
type Status = "active" | "pending" | "offboarded";

interface Vendor {
  id: string;
  name: string;
  category: string | null;
  criticality: Crit;
  data_access: string | null;
  soc2_on_file: boolean;
  soc2_expires_at: string | null;
  soc2_url: string | null;
  last_reassessed_at: string | null;
  next_reassessment_due: string | null;
  notes: string | null;
  contact_email: string | null;
  status: Status;
}

const CRIT_META: Record<Crit, { label: string; cls: string }> = {
  critical: { label: "Critical", cls: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]" },
  high:     { label: "High",     cls: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]" },
  medium:   { label: "Medium",   cls: "bg-[var(--color-info-bg)] text-[var(--color-info)]" },
  low:      { label: "Low",      cls: "bg-[var(--color-surface-2)] text-[var(--color-muted)]" },
};

export default function VendorsPage() {
  const { org, canWrite, role } = useOrg();
  const [vendors, setVendors] = useState<Vendor[] | null>(null);
  const [editing, setEditing] = useState<Vendor | "new" | null>(null);
  const [filter, setFilter] = useState<"all" | Crit>("all");

  const load = useCallback(async () => {
    if (!org?.id) return;
    const { data } = await supabase.from("vendors").select("*").eq("org_id", org.id).order("criticality").order("name");
    setVendors((data as Vendor[]) ?? []);
  }, [org?.id]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!vendors) return [];
    return filter === "all" ? vendors : vendors.filter(v => v.criticality === filter);
  }, [vendors, filter]);

  const expiringSoon = (v: Vendor) => v.soc2_expires_at && isPast(v.soc2_expires_at);
  const dueForReview = (v: Vendor) => v.next_reassessment_due && isPast(v.next_reassessment_due);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-muted)] bg-[var(--color-surface-2)] px-2.5 py-1 rounded-md mb-3">
            <Building2 className="w-3.5 h-3.5" strokeWidth={1.8} />
            Vendor Risk
          </div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)] tracking-tight">Vendor risk register</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1.5 max-w-2xl">
            {role === "auditor_readonly"
              ? "Sample these records during testing for CC9.2. Critical vendors should have a SOC 2 report on file with annual reassessment."
              : "Track third-party vendors with access to your data. Auditors verify SOC 2 reports on file and annual reassessments."}
          </p>
        </div>
        {canWrite && (
          <button onClick={() => setEditing("new")}
            className="inline-flex items-center gap-2 bg-[var(--color-foreground)] text-[var(--color-surface)] hover:opacity-90 text-sm px-4 py-2 rounded-lg font-medium transition flex-shrink-0">
            <Plus className="w-4 h-4" strokeWidth={1.8} />
            Add vendor
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "critical", "high", "medium", "low"] as const).map(f => {
          const count = (vendors ?? []).filter(v => f === "all" || v.criticality === f).length;
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition capitalize ${
                filter === f ? "bg-[var(--color-foreground)] text-[var(--color-surface)]" : "bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              }`}>
              {f === "all" ? "All" : CRIT_META[f].label} <span className="opacity-60 ml-0.5">{count}</span>
            </button>
          );
        })}
      </div>

      {vendors === null ? (
        <div className="text-sm text-[var(--color-muted)]">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-12 text-center">
          <Building2 className="w-10 h-10 text-[var(--color-muted)] mx-auto mb-3" strokeWidth={1.4} />
          <p className="text-sm text-[var(--color-muted)]">
            No vendors yet. {canWrite ? "Add critical providers (AWS, Stripe, Datadog, etc.) and any vendor with PII access." : ""}
          </p>
        </div>
      ) : (
        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface)]">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Criticality</th>
                <th className="px-4 py-3">SOC 2</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Reassess by</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filtered.map(v => (
                <tr key={v.id} className="hover:bg-[var(--color-surface)]">
                  <td className="px-4 py-3">
                    <div className="text-[13px] font-medium text-[var(--color-foreground)]">{v.name}</div>
                    {v.category && <div className="text-xs text-[var(--color-muted)]">{v.category}</div>}
                    {v.data_access && <div className="text-[11px] text-[var(--color-muted)] mt-0.5">{v.data_access}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded font-medium ${CRIT_META[v.criticality].cls}`}>
                      {CRIT_META[v.criticality].label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {v.soc2_on_file ? (
                      <span className="inline-flex items-center gap-1 text-xs text-[var(--color-success)]">
                        On file
                        {v.soc2_url && <a href={v.soc2_url} target="_blank" rel="noopener noreferrer" className="text-[var(--color-info)] hover:underline"><ExternalLink className="w-3 h-3 inline" strokeWidth={1.8} /></a>}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--color-muted)] italic">missing</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {v.soc2_expires_at ? (
                      <span className={expiringSoon(v) ? "text-[var(--color-danger)] font-medium" : "text-[var(--color-foreground-subtle)]"}>
                        {formatDateOnly(v.soc2_expires_at)}
                        {expiringSoon(v) && <AlertTriangle className="w-3 h-3 inline ml-1" strokeWidth={1.8} />}
                      </span>
                    ) : <span className="text-[var(--color-muted)]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {v.next_reassessment_due ? (
                      <span className={dueForReview(v) ? "text-[var(--color-warning)] font-medium" : "text-[var(--color-foreground-subtle)]"}>
                        {formatDateOnly(v.next_reassessment_due)}
                      </span>
                    ) : <span className="text-[var(--color-muted)]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canWrite && (
                      <button onClick={() => setEditing(v)}
                        className="text-xs text-[var(--color-info)] hover:underline inline-flex items-center gap-1">
                        <Edit2 className="w-3 h-3" strokeWidth={1.8} /> Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing !== null && (
        <VendorModal vendor={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }} />
      )}
    </div>
  );
}

function VendorModal({ vendor, onClose, onSaved }: {
  vendor: Vendor | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string | boolean>>({
    name: vendor?.name ?? "",
    category: vendor?.category ?? "",
    criticality: vendor?.criticality ?? "medium",
    data_access: vendor?.data_access ?? "",
    soc2_on_file: vendor?.soc2_on_file ?? false,
    soc2_expires_at: vendor?.soc2_expires_at ?? "",
    soc2_url: vendor?.soc2_url ?? "",
    last_reassessed_at: vendor?.last_reassessed_at ?? "",
    next_reassessment_due: vendor?.next_reassessment_due ?? "",
    notes: vendor?.notes ?? "",
    contact_email: vendor?.contact_email ?? "",
    status: vendor?.status ?? "active",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");
      const payload: Record<string, unknown> = { auth_token: session.session.access_token };
      if (vendor) payload.vendor_id = vendor.id;
      for (const [k, v] of Object.entries(form)) {
        if (typeof v === "boolean") payload[k] = v;
        else if (v === "") payload[k] = null;
        else payload[k] = v;
      }
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!vendor || !window.confirm(`Delete ${vendor.name}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;
      await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", vendor_id: vendor.id, auth_token: session.session.access_token }),
      });
      onSaved();
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form onClick={e => e.stopPropagation()} onSubmit={submit}
        className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-3">
        <h2 className="text-lg font-semibold text-[var(--color-foreground)] tracking-tight">{vendor ? "Edit vendor" : "New vendor"}</h2>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" value={form.name as string} onChange={v => setForm(f => ({ ...f, name: v }))} required />
          <Field label="Category" value={form.category as string} onChange={v => setForm(f => ({ ...f, category: v }))} placeholder="Cloud, CRM, Email, …" />
          <SelectField label="Criticality" value={form.criticality as string} onChange={v => setForm(f => ({ ...f, criticality: v }))}
            options={[{value: "critical", label: "Critical"}, {value: "high", label: "High"}, {value: "medium", label: "Medium"}, {value: "low", label: "Low"}]} />
          <SelectField label="Status" value={form.status as string} onChange={v => setForm(f => ({ ...f, status: v }))}
            options={[{value: "active", label: "Active"}, {value: "pending", label: "Pending"}, {value: "offboarded", label: "Offboarded"}]} />
        </div>

        <Field label="Data access (what they touch)" value={form.data_access as string} onChange={v => setForm(f => ({ ...f, data_access: v }))} placeholder="PII, payment data, source code, …" />

        <div className="bg-[var(--color-surface)] rounded-lg p-3 border border-[var(--color-border)] space-y-2">
          <label className="flex items-center gap-2 text-sm text-[var(--color-foreground-subtle)] cursor-pointer">
            <input type="checkbox" checked={form.soc2_on_file as boolean} onChange={e => setForm(f => ({ ...f, soc2_on_file: e.target.checked }))} />
            SOC 2 report on file
          </label>
          {form.soc2_on_file && (
            <div className="grid grid-cols-2 gap-3 pl-6">
              <Field label="Expires" type="date" value={form.soc2_expires_at as string} onChange={v => setForm(f => ({ ...f, soc2_expires_at: v }))} />
              <Field label="URL" type="url" value={form.soc2_url as string} onChange={v => setForm(f => ({ ...f, soc2_url: v }))} placeholder="https://..." />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Last reassessed" type="date" value={form.last_reassessed_at as string} onChange={v => setForm(f => ({ ...f, last_reassessed_at: v }))} />
          <Field label="Next reassessment due" type="date" value={form.next_reassessment_due as string} onChange={v => setForm(f => ({ ...f, next_reassessment_due: v }))} />
        </div>

        <Field label="Vendor contact" type="email" value={form.contact_email as string} onChange={v => setForm(f => ({ ...f, contact_email: v }))} placeholder="security@vendor.com" />
        <Field label="Notes" type="textarea" value={form.notes as string} onChange={v => setForm(f => ({ ...f, notes: v }))} />

        {error && <div className="text-sm text-[var(--color-danger)]">{error}</div>}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 border border-[var(--color-border-strong)] text-[var(--color-foreground-subtle)] py-2.5 rounded-lg font-medium text-sm hover:bg-[var(--color-surface-2)]">
            Cancel
          </button>
          {vendor && (
            <button type="button" onClick={handleDelete} disabled={busy}
              className="px-4 py-2.5 text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] rounded-lg font-medium text-sm inline-flex items-center gap-1">
              <Trash2 className="w-4 h-4" strokeWidth={1.8} /> Delete
            </button>
          )}
          <button type="submit" disabled={busy}
            className="flex-1 bg-[var(--color-foreground)] text-[var(--color-surface)] hover:opacity-90 disabled:opacity-50 py-2.5 rounded-lg font-semibold text-sm">
            {busy ? "Saving…" : vendor ? "Save" : "Add vendor"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, required }: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">{label}{required && <span className="text-[var(--color-danger)]"> *</span>}</label>
      {type === "textarea" ? (
        <textarea value={value ?? ""} onChange={e => onChange(e.target.value)} rows={2} placeholder={placeholder}
          className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-border-strong)]" />
      ) : (
        <input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
          className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-border-strong)]" />
      )}
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-foreground)]">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
