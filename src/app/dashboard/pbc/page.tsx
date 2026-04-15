"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useOrg } from "@/lib/org-context";
import { supabase } from "@/lib/supabase";
import {
  ClipboardList, Plus, Check, X, ExternalLink, Filter, Trash2,
  CheckCircle2, AlertCircle, Clock, FileQuestion
} from "lucide-react";
import { formatDateOnly, isPast } from "@/lib/dates";

type Status = "requested" | "provided" | "accepted" | "rejected";

interface PbcRequest {
  id: string;
  org_id: string;
  control_id: string | null;
  title: string;
  description: string | null;
  status: Status;
  response_notes: string | null;
  response_url: string | null;
  response_storage_path: string | null;
  rejection_reason: string | null;
  requested_by: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  provided_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

const statusMeta: Record<Status, { label: string; Icon: typeof Clock; className: string }> = {
  requested: { label: "Requested", Icon: Clock, className: "text-[var(--color-warning)] bg-[var(--color-warning-bg)]" },
  provided:  { label: "Provided",  Icon: AlertCircle, className: "text-[var(--color-info)] bg-[var(--color-info-bg)]" },
  accepted:  { label: "Accepted",  Icon: CheckCircle2, className: "text-[var(--color-success)] bg-[var(--color-success-bg)]" },
  rejected:  { label: "Rejected",  Icon: X, className: "text-[var(--color-danger)] bg-[var(--color-danger-bg)]" },
};

export default function PbcPage() {
  const { org, role, canWrite, controls } = useOrg();
  const [items, setItems] = useState<PbcRequest[] | null>(null);
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [showCreate, setShowCreate] = useState(false);

  const isAuditor = role === "auditor_readonly";

  const load = useCallback(async () => {
    if (!org?.id) return;
    const { data } = await supabase
      .from("pbc_requests")
      .select("*")
      .eq("org_id", org.id)
      .order("created_at", { ascending: false });
    setItems((data as PbcRequest[]) ?? []);
  }, [org?.id]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!items) return [];
    if (filter === "all") return items;
    return items.filter(i => i.status === filter);
  }, [items, filter]);

  const counts = useMemo(() => {
    const c = { all: items?.length ?? 0, requested: 0, provided: 0, accepted: 0, rejected: 0 };
    items?.forEach(i => { c[i.status]++; });
    return c;
  }, [items]);

  return (
    <>
      <div className="space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-muted)] bg-[var(--color-surface-2)] px-2.5 py-1 rounded-md mb-3">
              <ClipboardList className="w-3.5 h-3.5" strokeWidth={1.8} />
              Provided By Client
            </div>
            <h1 className="text-2xl font-semibold text-[var(--color-foreground)] tracking-tight">PBC Requests</h1>
            <p className="text-sm text-[var(--color-muted)] mt-1.5 max-w-2xl">
              {isAuditor
                ? "Request specific evidence from the client. They\u2019ll respond, you\u2019ll review, and the trail is captured for your workpapers."
                : "The auditor uses this list to ask for evidence. Respond with notes and a link to the artifact, then they accept or send back for more detail."}
            </p>
          </div>
          {isAuditor && (
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={async () => {
                if (!org?.id) return;
                if (!confirm("Create standard SOC 2 PBC request list (~37 items)? You can edit or delete individually after.")) return;
                const { data: s } = await supabase.auth.getSession();
                const token = s?.session?.access_token;
                if (!token) return;
                const res = await fetch("/api/pbc/templates", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ org_id: org.id }),
                });
                const j = await res.json();
                if (res.ok) {
                  alert(`Created ${j.created} PBC requests from the standard library.`);
                  load();
                } else {
                  alert(`Error: ${j.error}`);
                }
              }}
                className="inline-flex items-center gap-2 bg-[var(--color-bg)] text-[var(--color-foreground)] border border-[var(--color-border)] hover:bg-[var(--color-surface-2)] text-sm px-4 py-2 rounded-lg font-medium transition">
                Load SOC 2 library
              </button>
              <button onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 bg-[var(--color-foreground)] text-[var(--color-surface)] hover:opacity-90 text-sm px-4 py-2 rounded-lg font-medium transition">
                <Plus className="w-4 h-4" strokeWidth={1.8} />
                New request
              </button>
            </div>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-3.5 h-3.5 text-[var(--color-muted)]" strokeWidth={1.8} />
          {(["all", "requested", "provided", "accepted", "rejected"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition capitalize ${
                filter === f ? "bg-[var(--color-foreground)] text-[var(--color-surface)]" : "bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              }`}>
              {f === "all" ? "All" : statusMeta[f].label} <span className="opacity-60 ml-0.5">{counts[f]}</span>
            </button>
          ))}
        </div>

        {/* List */}
        {items === null ? (
          <div className="text-center py-16 text-sm text-[var(--color-muted)]">Loading requests…</div>
        ) : filtered.length === 0 ? (
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-12 text-center">
            <FileQuestion className="w-10 h-10 text-[var(--color-muted)] mx-auto mb-3" strokeWidth={1.4} />
            <p className="text-sm text-[var(--color-muted)]">
              {filter !== "all"
                ? `No ${filter} requests.`
                : isAuditor
                  ? "No PBC requests yet — start by asking the client for evidence."
                  : "No requests from your auditor yet. They\u2019ll show up here as soon as one is sent."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => (
              <PbcCard key={item.id} item={item} role={role} canWrite={canWrite}
                controls={controls} onChanged={load} />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }}
          controls={controls} />
      )}
    </>
  );
}

function PbcCard({ item, role, canWrite, controls, onChanged }: {
  item: PbcRequest;
  role: string | null;
  canWrite: boolean;
  controls: { control_id: string; title: string }[];
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [responseNotes, setResponseNotes] = useState(item.response_notes ?? "");
  const [responseUrl, setResponseUrl] = useState(item.response_url ?? "");
  const [responseFile, setResponseFile] = useState<File | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const respondWithUpload = async (file: File | null) => {
    setBusy(true); setError("");
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      let storagePath: string | null = null;
      if (file) {
        const form = new FormData();
        form.append("file", file);
        form.append("control_key", `pbc_${item.id}`);
        form.append("category", "pbc");
        form.append("auth_token", session.session.access_token);
        const upRes = await fetch("/api/evidence/upload", { method: "POST", body: form });
        const upJson = await upRes.json();
        if (!upRes.ok) throw new Error(upJson.error || "Upload failed");
        storagePath = upJson.storage_path ?? null;
      }

      await post({
        action: "respond",
        request_id: item.id,
        response_notes: responseNotes,
        response_url: responseUrl,
        response_storage_path: storagePath,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submit failed");
      setBusy(false);
    }
  };

  const downloadArtifact = async () => {
    if (!item.response_storage_path) return;
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;
    const res = await fetch("/api/evidence/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storage_path: item.response_storage_path, auth_token: session.session.access_token }),
    });
    const json = await res.json();
    if (res.ok && json.url) window.open(json.url, "_blank");
  };

  const meta = statusMeta[item.status];
  const isAuditor = role === "auditor_readonly";

  const overdue = item.due_date && item.status === "requested" && isPast(item.due_date);
  const linkedControl = controls.find(c => c.control_id === item.control_id);

  const post = async (body: Record<string, unknown>) => {
    setBusy(true); setError("");
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");
      const res = await fetch("/api/pbc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, auth_token: session.session.access_token }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Action failed");
      onChanged();
      setExpanded(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full p-5 text-left hover:bg-[var(--color-surface)] transition">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${meta.className}`}>
                <meta.Icon className="w-3 h-3" strokeWidth={2} /> {meta.label}
              </span>
              {item.control_id && (
                <span className="text-[10px] font-mono text-[var(--color-muted)] bg-[var(--color-surface-2)] px-1.5 py-0.5 rounded">{item.control_id}</span>
              )}
              {overdue && (
                <span className="text-[10px] text-[var(--color-danger)] font-medium">Overdue</span>
              )}
            </div>
            <div className="text-[15px] font-medium text-[var(--color-foreground)]">{item.title}</div>
            {item.description && (
              <div className="text-sm text-[var(--color-muted)] mt-1 line-clamp-2">{item.description}</div>
            )}
            <div className="flex items-center gap-3 text-xs text-[var(--color-muted)] mt-2">
              <span>Created {new Date(item.created_at).toLocaleDateString()}</span>
              {item.due_date && <span>Due {formatDateOnly(item.due_date)}</span>}
              {item.provided_at && <span>Provided {new Date(item.provided_at).toLocaleDateString()}</span>}
              {item.reviewed_at && <span>Reviewed {new Date(item.reviewed_at).toLocaleDateString()}</span>}
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--color-border)] p-5 space-y-4 bg-[var(--color-surface)]">
          {item.description && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1">Description</div>
              <div className="text-sm text-[var(--color-foreground-subtle)] whitespace-pre-wrap">{item.description}</div>
            </div>
          )}

          {linkedControl && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1">Linked control</div>
              <div className="text-sm text-[var(--color-foreground-subtle)]">
                <span className="font-mono text-xs">{linkedControl.control_id}</span> — {linkedControl.title}
              </div>
            </div>
          )}

          {/* Response section */}
          {item.status === "requested" && !isAuditor && canWrite && (
            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Provide evidence</div>
              <textarea value={responseNotes} onChange={e => setResponseNotes(e.target.value)} rows={3}
                placeholder="What you're providing, who pulled it, when, and any caveats."
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-border-strong)]" />
              <input type="url" value={responseUrl} onChange={e => setResponseUrl(e.target.value)}
                placeholder="Link to the artifact (S3, Drive, GitHub, etc.) — optional"
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-border-strong)]" />
              <label className="block text-xs text-[var(--color-muted)]">
                Or upload a file directly:
                <input type="file" onChange={e => setResponseFile(e.target.files?.[0] ?? null)}
                  className="block mt-1 text-xs file:mr-2 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-[var(--color-surface-2)] file:text-[var(--color-foreground-subtle)] file:cursor-pointer" />
                {responseFile && <span className="text-[11px] text-[var(--color-foreground-subtle)] block mt-1">{responseFile.name} ({Math.round(responseFile.size / 1024)} KB)</span>}
              </label>
              <button onClick={() => respondWithUpload(responseFile)}
                disabled={busy || !responseNotes.trim()}
                className="inline-flex items-center gap-2 bg-[var(--color-foreground)] text-[var(--color-surface)] hover:opacity-90 disabled:opacity-50 text-sm px-4 py-2 rounded-lg font-medium transition">
                {busy ? "Submitting…" : "Submit response"}
              </button>
            </div>
          )}

          {item.status !== "requested" && (item.response_notes || item.response_url || item.response_storage_path) && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1">Client response</div>
              {item.response_notes && (
                <div className="text-sm text-[var(--color-foreground-subtle)] whitespace-pre-wrap mb-2">{item.response_notes}</div>
              )}
              {item.response_url && (
                <a href={item.response_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-[var(--color-info)] hover:underline mr-3">
                  Open artifact <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.8} />
                </a>
              )}
              {item.response_storage_path && (
                <button onClick={downloadArtifact}
                  className="inline-flex items-center gap-1 text-sm text-[var(--color-info)] hover:underline">
                  Download attached file <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.8} />
                </button>
              )}
            </div>
          )}

          {/* Review section */}
          {item.status === "provided" && isAuditor && (
            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Auditor review</div>
              <div className="flex gap-2">
                <button onClick={() => post({ action: "review", request_id: item.id, decision: "accepted" })}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 bg-[var(--color-success)] text-white hover:opacity-90 disabled:opacity-50 text-sm px-4 py-2 rounded-lg font-medium transition">
                  <Check className="w-4 h-4" strokeWidth={2} /> Accept
                </button>
                <button onClick={() => setRejectOpen(true)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 bg-[var(--color-danger)] text-white hover:opacity-90 disabled:opacity-50 text-sm px-4 py-2 rounded-lg font-medium transition">
                  <X className="w-4 h-4" strokeWidth={2} /> Reject
                </button>
              </div>

              {rejectOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setRejectOpen(false)}>
                  <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-6 max-w-lg w-full space-y-3" onClick={e => e.stopPropagation()}>
                    <h3 className="font-semibold text-[var(--color-foreground)]">Reject evidence</h3>
                    <p className="text-sm text-[var(--color-muted)]">Explain why this response isn&apos;t sufficient. The client sees your note verbatim.</p>
                    <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={5}
                      autoFocus
                      placeholder="e.g. The screenshot shows the policy was last reviewed in 2024. For this period (Jan–Mar 2026) we need evidence of quarterly review within the engagement window."
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-foreground-subtle)] resize-y" />
                    <div className="flex justify-end gap-2 pt-1">
                      <button onClick={() => setRejectOpen(false)} className="px-4 py-2 text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-foreground)]">Cancel</button>
                      <button onClick={() => {
                        if (!rejectReason.trim()) return;
                        post({ action: "review", request_id: item.id, decision: "rejected", rejection_reason: rejectReason.trim() });
                        setRejectOpen(false);
                        setRejectReason("");
                      }}
                        disabled={!rejectReason.trim()}
                        className="bg-[var(--color-danger)] text-white hover:opacity-90 disabled:opacity-40 text-sm px-4 py-2 rounded-lg font-medium">
                        Send rejection
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {item.status === "rejected" && item.rejection_reason && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1">Rejection reason</div>
              <div className="text-sm text-[var(--color-danger)]">{item.rejection_reason}</div>
            </div>
          )}

          {error && <div className="text-sm text-[var(--color-danger)]">{error}</div>}

          <div className="flex justify-end pt-2">
            {(role === "owner" || (isAuditor && item.requested_by /* requester only known via id; safe to show */)) && (
              <button onClick={() => {
                if (window.confirm("Delete this request? This cannot be undone.")) {
                  post({ action: "delete", request_id: item.id });
                }
              }}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)] transition">
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} /> Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateModal({ onClose, onCreated, controls }: {
  onClose: () => void;
  onCreated: () => void;
  controls: { control_id: string; title: string }[];
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [controlId, setControlId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");
      const res = await fetch("/api/pbc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          auth_token: session.session.access_token,
          title,
          description: description || null,
          control_id: controlId || null,
          due_date: dueDate || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Create failed");
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form onClick={e => e.stopPropagation()} onSubmit={submit}
        className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)] tracking-tight">New PBC request</h2>
          <p className="text-xs text-[var(--color-muted)] mt-1">Ask the client for a specific piece of evidence.</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
            placeholder="e.g. Q3 2025 quarterly access review evidence"
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-border-strong)]" />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Description (optional)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            placeholder="What you need, format expected, the audit period it covers."
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-border-strong)]" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Linked control (optional)</label>
            <select value={controlId} onChange={e => setControlId(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-foreground)]">
              <option value="">None</option>
              {controls.map(c => <option key={c.control_id} value={c.control_id}>{c.control_id} — {c.title.slice(0, 40)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Due date (optional)</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-foreground)]" />
          </div>
        </div>

        {error && <div className="text-sm text-[var(--color-danger)]">{error}</div>}

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 border border-[var(--color-border-strong)] text-[var(--color-foreground-subtle)] py-2.5 rounded-lg font-medium text-sm hover:bg-[var(--color-surface-2)]">
            Cancel
          </button>
          <button type="submit" disabled={busy || !title.trim()}
            className="flex-1 bg-[var(--color-foreground)] text-[var(--color-surface)] hover:opacity-90 disabled:opacity-50 py-2.5 rounded-lg font-semibold text-sm transition">
            {busy ? "Creating…" : "Create request"}
          </button>
        </div>
      </form>
    </div>
  );
}
