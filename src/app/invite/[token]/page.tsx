"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    setError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        router.push(`/auth?redirect=/invite/${token}`);
        return;
      }

      const res = await fetch("/api/team/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invite_token: token,
          auth_token: sessionData.session.access_token,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Accept failed");

      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Accept failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center p-6">
      <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-8 max-w-md w-full text-center">
        <div className="text-4xl mb-4"></div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">You&apos;ve been invited to ShieldBase</h1>
        <p className="text-sm text-[var(--color-muted)] mb-6">
          Accept the invite to access this organization&apos;s SOC 2 workspace.
        </p>

        {success ? (
          <div className="bg-[var(--color-success-bg)] border border-[var(--color-success)] rounded-xl p-4 text-sm text-green-800">
             Invite accepted! Redirecting to dashboard…
          </div>
        ) : (
          <>
            <button
              onClick={handleAccept}
              disabled={loading}
              className="w-full bg-blue-600 hover:opacity-90 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition"
            >
              {loading ? "Accepting…" : "Accept invite"}
            </button>
            <p className="text-xs text-[var(--color-muted)] mt-3">
              You&apos;ll need to sign in with the email the invite was sent to.
            </p>
            {error && <p className="text-sm text-[var(--color-danger)] mt-4">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
