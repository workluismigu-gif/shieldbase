"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useOrg } from "@/lib/org-context";

interface Member {
  id: string;
  email: string;
  role: "owner" | "admin" | "auditor_readonly";
  invited_at: string;
  accepted_at: string | null;
  invite_token: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  auditor_readonly: "Auditor (read-only)",
};

export default function TeamPage() {
  const { org, userEmail } = useOrg();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "auditor_readonly">("auditor_readonly");
  const [inviting, setInviting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

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
        <h1 className="text-2xl font-bold text-gray-900">Team & Auditors</h1>
        <p className="text-sm text-gray-500 mt-1">
          Invite teammates or an external auditor to access your SOC 2 workspace. Auditors get read-only access to evidence, controls, and reports.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Invite a member</h2>
        <div className="grid md:grid-cols-[1fr_200px_auto] gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="auditor@firm.com"
            className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "auditor_readonly")}
            className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="auditor_readonly">Auditor (read-only)</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={handleInvite}
            disabled={inviting}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition"
          >
            {inviting ? "Inviting…" : "Send invite"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        {inviteUrl && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-green-800 mb-2">Invite created — share this link:</p>
            <div className="flex gap-2">
              <code className="flex-1 bg-white border border-green-200 rounded px-3 py-2 text-xs font-mono text-gray-700 truncate">{inviteUrl}</code>
              <button onClick={() => copyInviteUrl(inviteUrl)} className="text-xs bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium">Copy</button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Current members</h2>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs uppercase text-gray-500">
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-6 py-4 font-medium text-gray-900">{userEmail} <span className="text-xs text-gray-400">(you)</span></td>
                <td className="px-6 py-4"><span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded">Owner</span></td>
                <td className="px-6 py-4"><span className="text-xs font-medium text-green-600">Active</span></td>
                <td className="px-6 py-4"></td>
              </tr>
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="px-6 py-4 font-medium text-gray-900">{m.email}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      m.role === "auditor_readonly" ? "bg-purple-50 text-purple-700" : "bg-gray-100 text-gray-700"
                    }`}>
                      {ROLE_LABELS[m.role] ?? m.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {m.accepted_at ? (
                      <span className="text-xs font-medium text-green-600">Active</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-yellow-600">Pending</span>
                        {m.invite_token && (
                          <button
                            onClick={() => copyInviteUrl(`${window.location.origin}/invite/${m.invite_token}`)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Copy link
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleRevoke(m.id)} className="text-xs text-red-600 hover:underline">Revoke</button>
                  </td>
                </tr>
              ))}
              {members.length === 0 && !loading && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-400">No invites yet</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500">
        <p className="font-semibold text-gray-700 mb-1">About roles</p>
        <ul className="space-y-1">
          <li>• <strong>Owner</strong> — full access, billing, cannot be removed</li>
          <li>• <strong>Admin</strong> — manage integrations, controls, policies, team members</li>
          <li>• <strong>Auditor (read-only)</strong> — view controls, evidence, and reports only. Cannot modify data. Use this role for external SOC 2 auditors.</li>
        </ul>
      </div>
    </div>
  );
}
