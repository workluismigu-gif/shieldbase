"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Shield, CheckCircle2, AlertTriangle } from "lucide-react";

type InviteInfo = { email: string; role: string; org_name: string };

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  auditor_readonly: "Auditor (read-only)",
};

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loadingInvite, setLoadingInvite] = useState(true);
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [lookupError, setLookupError] = useState("");

  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [inviteRes, sessionRes] = await Promise.all([
          fetch(`/api/team/invite/lookup?token=${encodeURIComponent(token)}`),
          supabase.auth.getSession(),
        ]);
        const inviteJson = await inviteRes.json();
        if (!inviteRes.ok) {
          setLookupError(inviteJson.error ?? "Invite could not be loaded");
        } else {
          setInvite(inviteJson);
        }
        setSessionEmail(sessionRes.data.session?.user.email ?? null);
      } catch {
        setLookupError("Could not load invite");
      } finally {
        setLoadingInvite(false);
      }
    })();
  }, [token]);

  const acceptInvite = async (accessToken: string) => {
    const res = await fetch("/api/team/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_token: token, auth_token: accessToken }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Accept failed");
  };

  const handleSignupAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;
    setSubmitting(true);
    setError("");
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: invite.email,
        password,
      });
      if (signUpError) throw signUpError;

      let accessToken = signUpData.session?.access_token;
      if (!accessToken) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: invite.email,
          password,
        });
        if (signInError) throw signInError;
        accessToken = signInData.session?.access_token;
      }
      if (!accessToken) throw new Error("Could not establish a session");

      await acceptInvite(accessToken);
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoginAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;
    setSubmitting(true);
    setError("");
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: invite.email,
        password,
      });
      if (signInError) throw signInError;
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error("Could not establish a session");
      await acceptInvite(accessToken);
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptExistingSession = async () => {
    setSubmitting(true);
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error("No session");
      await acceptInvite(accessToken);
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Accept failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSessionEmail(null);
  };

  const [mode, setMode] = useState<"signup" | "login">("signup");

  if (loadingInvite) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center p-6">
        <div className="text-sm text-[var(--color-muted)]">Loading invite…</div>
      </div>
    );
  }

  if (lookupError || !invite) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center p-6">
        <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-10 h-10 text-[var(--color-warning)] mx-auto mb-4" strokeWidth={1.6} />
          <h1 className="text-xl font-semibold text-[var(--color-foreground)] mb-2">Invite unavailable</h1>
          <p className="text-sm text-[var(--color-muted)]">{lookupError || "This invite could not be found."}</p>
        </div>
      </div>
    );
  }

  const wrongSession = sessionEmail && sessionEmail.toLowerCase() !== invite.email.toLowerCase();

  return (
    <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center p-6">
      <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-xl bg-[var(--color-foreground)]/10 items-center justify-center mb-4">
            <Shield className="w-5 h-5 text-[var(--color-foreground)]" strokeWidth={2} />
          </div>
          <h1 className="text-xl font-semibold text-[var(--color-foreground)] tracking-tight">You&apos;ve been invited</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1.5">
            Join <span className="font-medium text-[var(--color-foreground)]">{invite.org_name}</span> on ShieldBase as{" "}
            <span className="font-medium text-[var(--color-foreground)]">{ROLE_LABELS[invite.role] ?? invite.role}</span>.
          </p>
          <p className="text-xs text-[var(--color-muted)] mt-1">Invite sent to {invite.email}</p>
        </div>

        {success && (
          <div className="bg-[var(--color-success-bg)] border border-[var(--color-success)]/30 rounded-xl p-4 text-sm text-[var(--color-success)] text-center">
            <CheckCircle2 className="w-5 h-5 mx-auto mb-1.5" strokeWidth={1.8} />
            Invite accepted — redirecting to dashboard…
          </div>
        )}

        {!success && wrongSession && (
          <div className="space-y-3">
            <div className="bg-[var(--color-warning-bg)] border border-[var(--color-warning)]/30 rounded-xl p-4 text-sm text-[var(--color-warning)]">
              You&apos;re signed in as <span className="font-medium">{sessionEmail}</span>, but this invite is for <span className="font-medium">{invite.email}</span>.
            </div>
            <button onClick={handleSignOut}
              className="w-full bg-[var(--color-foreground)] text-[var(--color-surface)] py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition">
              Sign out & continue
            </button>
          </div>
        )}

        {!success && !wrongSession && sessionEmail && (
          <button onClick={handleAcceptExistingSession} disabled={submitting}
            className="w-full bg-[var(--color-foreground)] text-[var(--color-surface)] py-3 rounded-lg font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition">
            {submitting ? "Accepting…" : "Accept invite"}
          </button>
        )}

        {!success && !sessionEmail && (
          <div className="space-y-4">
            <div className="flex bg-[var(--color-surface-2)] rounded-lg p-1">
              {(["signup", "login"] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setError(""); }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-md transition ${
                    mode === m ? "bg-[var(--color-bg)] text-[var(--color-foreground)] shadow-sm" : "text-[var(--color-muted)]"
                  }`}>
                  {m === "signup" ? "Create account" : "I already have one"}
                </button>
              ))}
            </div>

            <form onSubmit={mode === "signup" ? handleSignupAndAccept : handleLoginAndAccept} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">Email</label>
                <input type="email" value={invite.email} readOnly
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--color-foreground-subtle)] cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
                  {mode === "signup" ? "Choose a password" : "Password"}
                </label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  required minLength={8} placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-border-strong)] transition" />
              </div>
              {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
              <button type="submit" disabled={submitting}
                className="w-full bg-[var(--color-foreground)] text-[var(--color-surface)] py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition">
                {submitting
                  ? "Working…"
                  : mode === "signup" ? "Create account & accept" : "Log in & accept"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
