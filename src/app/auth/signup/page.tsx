"use client";
import { Shield } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/supabase";

export default function SignupPage() {
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    setError("");
    try {
      await signUp(email, password, orgName);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center px-4 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(204,120,92,0.18), transparent 70%)" }}
      />
      <div className="w-full max-w-md relative">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2.5 text-[17px] text-[var(--color-foreground)]" style={{ fontFamily: "var(--font-fraunces)" }}>
            <span className="w-7 h-7 rounded-md bg-[var(--color-foreground)] text-[var(--color-surface)] flex items-center justify-center">
              <Shield className="w-3.5 h-3.5" strokeWidth={2} />
            </span>
            <span className="italic">ShieldBase</span>
          </Link>
          <h1 className="text-[32px] text-[var(--color-foreground)] mt-8 mb-2" style={{ fontFamily: "var(--font-fraunces)", fontWeight: 400, lineHeight: 1.1 }}>
            Start your program.
          </h1>
          <p className="text-sm text-[var(--color-muted)]">Free while we&apos;re in early access.</p>
        </div>
        <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-8">
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-foreground-subtle)] mb-1.5">Company name</label>
              <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)} required
                placeholder="Acme SaaS Inc."
                className="w-full border border-[var(--color-border)] bg-[var(--color-surface)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-foreground)] transition" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-foreground-subtle)] mb-1.5">Work email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@company.com"
                className="w-full border border-[var(--color-border)] bg-[var(--color-surface)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-foreground)] transition" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-foreground-subtle)] mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="Min. 8 characters"
                className="w-full border border-[var(--color-border)] bg-[var(--color-surface)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-foreground)] transition" />
            </div>
            {error && <p className="text-[var(--color-danger)] text-sm bg-[var(--color-danger-bg)] px-3 py-2 rounded-md">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-[var(--color-foreground)] hover:opacity-90 disabled:opacity-60 text-[var(--color-surface)] py-2.5 rounded-lg font-medium text-sm transition">
              {loading ? "Creating account…" : "Create free account"}
            </button>
          </form>
          <p className="text-xs text-[var(--color-muted)] text-center mt-4">
            No credit card. Cancel anytime.
          </p>
        </div>
        <p className="text-center text-xs text-[var(--color-muted)] mt-6">
          Already have an account? <Link href="/auth/login" className="text-[var(--color-foreground)] underline underline-offset-4 decoration-[var(--color-border)] hover:decoration-[var(--color-foreground)]">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
