"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useOrg } from "@/lib/org-context";
import { MessageSquare, Trash2, Send } from "lucide-react";

interface Props {
  controlId: string;
  controlTitle: string;
  currentStatus: string;
  onClose: () => void;
  onSaved?: () => void;
}

interface Comment {
  id: string;
  control_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export default function ControlTestModal({ controlId, controlTitle, currentStatus, onClose, onSaved }: Props) {
  const { org, canWrite, role, userEmail } = useOrg();
  const [notes, setNotes] = useState("");
  const [overrideStatus, setOverrideStatus] = useState("");
  const [approve, setApprove] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [comments, setComments] = useState<Comment[] | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    if (!org?.id) return;
    const { data } = await supabase
      .from("control_comments")
      .select("*")
      .eq("org_id", org.id)
      .eq("control_id", controlId)
      .order("created_at", { ascending: true });
    setComments((data as Comment[]) ?? []);
  }, [org?.id, controlId]);

  useEffect(() => {
    loadComments();
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, [loadComments]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) throw new Error("Not logged in");

      const res = await fetch("/api/controls/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          control_id: controlId,
          test_notes: notes || null,
          approve,
          override_status: overrideStatus || null,
          auth_token: sessionData.session.access_token,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const postComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setPostingComment(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) throw new Error("Not logged in");
      const res = await fetch("/api/controls/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          control_id: controlId,
          body: commentBody,
          auth_token: sessionData.session.access_token,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Post failed");
      }
      setCommentBody("");
      await loadComments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Post failed");
    } finally {
      setPostingComment(false);
    }
  };

  const deleteComment = async (id: string) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) return;
      await fetch("/api/controls/comments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_id: id, auth_token: sessionData.session.access_token }),
      });
      await loadComments();
    } catch { /* swallow */ }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)] tracking-tight">
            {canWrite ? "Test & sign off" : "Control detail"}
          </h2>
          <p className="text-xs text-[var(--color-muted)] mt-1.5">
            <span className="font-mono bg-[var(--color-surface-2)] px-1.5 py-0.5 rounded text-[var(--color-foreground-subtle)]">{controlId}</span>
            <span className="ml-2">{controlTitle}</span>
          </p>
          <p className="text-xs text-[var(--color-muted)] mt-1">
            Current status: <span className="font-medium text-[var(--color-foreground-subtle)]">{currentStatus.replace("_", " ")}</span>
          </p>
        </div>

        {/* Test form — owners/admins only */}
        {canWrite && (
          <div className="p-6 space-y-4 border-b border-[var(--color-border)]">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1.5 block">Test notes (tester, date, method, result)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
                placeholder="e.g. Tested 2026-04-14 by Luis. Inspected CloudTrail trail config via AWS Console. Verified log file validation and multi-region capture are enabled. Evidence: CloudTrail-config-screenshot.png uploaded."
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-border-strong)]" />
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1.5 block">Override status (optional)</label>
              <select value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value)}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-foreground)]">
                <option value="">Keep current</option>
                <option value="compliant">Compliant</option>
                <option value="partial">Partial</option>
                <option value="non_compliant">Non-compliant</option>
                <option value="not_assessed">Not assessed</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-[var(--color-foreground-subtle)]">
              <input type="checkbox" checked={approve} onChange={(e) => setApprove(e.target.checked)} />
              Sign off — approve this control
            </label>

            {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 border border-[var(--color-border-strong)] text-[var(--color-foreground-subtle)] py-2.5 rounded-lg font-medium text-sm hover:bg-[var(--color-surface-2)]">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-[var(--color-foreground)] text-[var(--color-surface)] hover:opacity-90 disabled:opacity-50 py-2.5 rounded-lg font-semibold text-sm">
                {saving ? "Saving…" : "Save test record"}
              </button>
            </div>
          </div>
        )}

        {!canWrite && (
          <div className="p-6 border-b border-[var(--color-border)]">
            <div className="bg-[var(--color-info-bg)] border border-[var(--color-info)]/30 rounded-lg p-3 text-sm text-[var(--color-foreground-subtle)]">
              You have read-only access to this control. Use comments below to ask the client for changes or evidence.
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[var(--color-foreground-subtle)]" strokeWidth={1.8} />
            <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Comments</h3>
            {comments && comments.length > 0 && (
              <span className="text-xs text-[var(--color-muted)]">{comments.length}</span>
            )}
          </div>

          {comments === null ? (
            <div className="text-xs text-[var(--color-muted)]">Loading…</div>
          ) : comments.length === 0 ? (
            <div className="text-xs text-[var(--color-muted)] italic">No comments yet — start the conversation.</div>
          ) : (
            <div className="space-y-3">
              {comments.map(c => (
                <div key={c.id} className="bg-[var(--color-surface)] rounded-lg p-3 border border-[var(--color-border)]">
                  <div className="flex items-center justify-between text-xs text-[var(--color-muted)] mb-1.5">
                    <span className="font-mono">{c.user_id === currentUserId ? `${userEmail ?? "you"} (you)` : c.user_id.slice(0, 8) + "…"}</span>
                    <div className="flex items-center gap-2">
                      <time dateTime={c.created_at}>{new Date(c.created_at).toLocaleString()}</time>
                      {(c.user_id === currentUserId || role === "owner") && (
                        <button onClick={() => deleteComment(c.id)} className="text-[var(--color-muted)] hover:text-[var(--color-danger)]" title="Delete comment">
                          <Trash2 className="w-3 h-3" strokeWidth={1.8} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-[var(--color-foreground-subtle)] whitespace-pre-wrap">{c.body}</div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={postComment} className="flex gap-2">
            <input type="text" value={commentBody} onChange={e => setCommentBody(e.target.value)}
              placeholder={role === "auditor_readonly" ? "Ask the client for evidence or clarification…" : "Add a comment…"}
              className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-border-strong)]" />
            <button type="submit" disabled={postingComment || !commentBody.trim()}
              className="inline-flex items-center gap-1.5 bg-[var(--color-foreground)] text-[var(--color-surface)] hover:opacity-90 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium">
              <Send className="w-3.5 h-3.5" strokeWidth={1.8} />
              Post
            </button>
          </form>
        </div>

        {!canWrite && (
          <div className="p-4 border-t border-[var(--color-border)] flex justify-end">
            <button onClick={onClose} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] px-4 py-2">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
