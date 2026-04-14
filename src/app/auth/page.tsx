"use client";
import { useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_CHECKLIST, DEFAULT_POLICIES } from "@/lib/onboarding-defaults";

function AuthForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "signup") {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://shieldbase.vercel.app"}/auth/callback` },
          });
        if (signUpError) throw signUpError;

        if (signUpData.session) {
          // Email confirmation is disabled — session is active immediately, create org now
          const { data: newOrg } = await supabase
            .from("organizations")
            .insert({ name: companyName, owner_id: signUpData.session.user.id })
            .select("id")
            .single();

          if (newOrg?.id) {
            await supabase.from("checklist_items").insert(
              DEFAULT_CHECKLIST.map(item => ({ ...item, org_id: newOrg.id, completed: false }))
            );
            await supabase.from("documents").insert(
              DEFAULT_POLICIES.map(policy => ({
                ...policy, org_id: newOrg.id, updated_at: new Date().toISOString(),
              }))
            );
          }
          router.push("/dashboard");
        } else {
          // Email confirmation is enabled — store org name for after callback
          if (typeof window !== "undefined") {
            sessionStorage.setItem("pending_org_name", companyName);
          }
          setMessage("Check your email to confirm your account, then log in.");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push(next);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="text-2xl font-extrabold text-navy"> ShieldBase</a>
          <p className="text-slate text-sm mt-2">
            {mode === "login" ? "Welcome back" : "Start your SOC 2 journey"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {/* Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            {(["login", "signup"] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(""); setMessage(""); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition ${mode === m ? "bg-white shadow-sm text-navy" : "text-slate"}`}>
                {m === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-sm font-medium text-navy mb-1">Company Name</label>
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required
                  placeholder="Acme Corp" className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue transition" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="you@company.com" className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                placeholder="••••••••" minLength={8} className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue transition" />
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">{error}</div>}
            {message && <div className="bg-green-50 border border-green-200 text-green-600 text-sm rounded-lg p-3">{message}</div>}

            <button type="submit" disabled={loading}
              className="w-full bg-blue hover:bg-blue-dark text-white py-3 rounded-lg font-semibold transition disabled:opacity-50">
              {loading ? "..." : mode === "login" ? "Log In" : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate mt-6">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-blue font-medium hover:underline">
            {mode === "login" ? "Sign up free" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm />
    </Suspense>
  );
}
