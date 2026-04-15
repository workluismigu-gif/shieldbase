"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useOrg } from "@/lib/org-context";

interface Member {
  id: string;
  email: string;
  role: "owner" | "admin" | "auditor_readonly" | "auditor_staff";
  invited_at: string;
  accepted_at: string | null;
  invite_token: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  auditor_readonly: "Lead Auditor",
  auditor_staff: "Auditor Staff",
};

export default function TeamPage() {
  const { org, userEmail, canWrite } = useOrg();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "auditor_readonly" | "auditor_staff">("auditor_readonly");
  const [inviting, setInviting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    if (!org?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("org_members")
      .select("id, email, role, invited_at, accepted_at, invite_token")
      .eq("org_id", org.id)
      .order("invited_at", { ascending: false });
    if (error) setError(error.message);
    if (data) setMembers(data as Member[]);
    setLoading(false);
  }, [org?.id]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;
      const res = await fetch("/api/team/owner", {
        headers: { Authorization: `Bearer ${session.session.access_token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setOwnerEmail(json.email ?? null);
    })();
  }, []);

  const handleInvite = async () => {
    if (!email || !email.includes("@")) {
      setError("Enter a valid email");
      return;
    }
    setInviting(true);
    setError("");
    setInviteUrl(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) throw new Error("Not logged in");

      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          role,
          auth_token: sessionData.session.access_token,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Invite failed");

      setInviteUrl(json.invite_url);
      setEmail("");
      await loadMembers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = async (memberId: string) => {
    if (!confirm("Revoke this member's access?")) return;
    const { error } = await supabase.from("org_members").delete().eq("id", memberId);
    if (error) {
      alert(error.message);
      return;
    }
    await loadMembers();
  };

  const copyInviteUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    alert("Invite link copied to clipboard");
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Team & Auditors</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          Invite teammates or an external auditor to access your SOC 2 workspace. Auditors get read-only access to evidence, controls, and reports.
        </p>
      </div>

      {canWrite && (
      <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-6">
        <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-4">Invite a member</h2>
        <div className="grid md:grid-cols-[1fr_200px_auto] gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="auditor@firm.com"
            className="border border-[var(--color-border-strong)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "auditor_readonly" | "auditor_staff")}
            className="border border-[var(--color-border-strong)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="auditor_readonly">Lead Auditor</option>
            <option value="auditor_staff">Auditor Staff (per-control assignments)</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={handleInvite}
            disabled={inviting}
            className="bg-blue-600 hover:opacity-90 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition"
          >
            {inviting ? "Inviting…" : "Send invite"}
          </button>
        </div>
        {error && <p className="text-sm text-[var(--color-danger)] mt-3">{error}</p>}
        {inviteUrl && (
          <div className="mt-4 bg-[var(--color-success-bg)] border border-[var(--color-success)] rounded-lg p-4">
            <p className="text-sm font-semibold text-[var(--color-success)] mb-2">Invite created — share this link:</p>
            <div className="flex gap-2">
              <code className="flex-1 bg-[var(--color-bg)] border border-[var(--color-success)] rounded px-3 py-2 text-xs font-mono text-[var(--color-foreground-subtle)] truncate">{inviteUrl}</code>
              <button onClick={() => copyInviteUrl(inviteUrl)} className="text-xs bg-[var(--color-foreground)] text-[var(--color-surface)] hover:opacity-90 px-4 py-2 rounded font-medium">Copy</button>
            </div>
          </div>
        )}
      </div>
      )}

      <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Current members</h2>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-[var(--color-muted)]">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface)]">
              <tr className="text-left text-xs uppercase text-[var(--color-muted)]">
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ownerEmail && (
                <tr>
                  <td className="px-6 py-4 font-medium text-[var(--color-foreground)]">
                    {ownerEmail}
                    {ownerEmail === userEmail && <span className="text-xs text-[var(--color-muted)] ml-1">(you)</span>}
                  </td>
                  <td className="px-6 py-4"><span className="text-xs font-medium bg-[var(--color-info-bg)] text-[var(--color-info)] px-2 py-1 rounded">Owner</span></td>
                  <td className="px-6 py-4"><span className="text-xs font-medium text-[var(--color-success)]">Active</span></td>
                  <td className="px-6 py-4"></td>
                </tr>
              )}
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="px-6 py-4 font-medium text-[var(--color-foreground)]">{m.email}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      m.role === "auditor_readonly" ? "bg-purple-50 text-purple-700"
                      : m.role === "auditor_staff" ? "bg-indigo-50 text-indigo-700"
                      : "bg-[var(--color-surface-2)] text-[var(--color-foreground-subtle)]"
                    }`}>
                      {ROLE_LABELS[m.role] ?? m.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {m.accepted_at ? (
                      <span className="text-xs font-medium text-[var(--color-success)]">Active</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[var(--color-warning)]">Pending</span>
                        {m.invite_token && (
                          <button
                            onClick={() => copyInviteUrl(`${window.location.origin}/invite/${m.invite_token}`)}
                            className="text-xs text-[var(--color-info)] hover:underline"
                          >
                            Copy link
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {canWrite && (
                      <button onClick={() => handleRevoke(m.id)} className="text-xs text-[var(--color-danger)] hover:underline">Revoke</button>
                    )}
                  </td>
                </tr>
              ))}
              {members.length === 0 && !loading && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-[var(--color-muted)]">No invites yet</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-[var(--color-surface)] rounded-xl p-4 text-xs text-[var(--color-muted)]">
        <p className="font-semibold text-[var(--color-foreground-subtle)] mb-1">About roles</p>
        <ul className="space-y-1">
          <li>• <strong>Owner</strong> — full access, billing, cannot be removed</li>
          <li>• <strong>Admin</strong> — manage integrations, controls, policies, team members</li>
          <li>• <strong>Auditor (read-only)</strong> — view controls, evidence, and reports only. Cannot modify data. Use this role for external SOC 2 auditors.</li>
        </ul>
      </div>
    </div>
  );
}
