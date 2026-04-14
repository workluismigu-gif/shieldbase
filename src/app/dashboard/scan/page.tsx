"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useOrg } from "@/lib/org-context";

const PROWLER_INSTALL = `pip install prowler`;

type ScanStatus = "idle" | "uploading" | "success" | "error";

export default function ScanPage() {
  const { org } = useOrg();
  const techStack = (org?.tech_stack ?? {}) as Record<string, string>;
  const roleArn = techStack.aws_role_arn ?? "";
  const PROWLER_COMMAND = roleArn
    ? `prowler aws -M json -o /tmp/shieldbase-scan --compliance aws_soc2 --role ${roleArn}`
    : `prowler aws -M json -o /tmp/shieldbase-scan --compliance aws_soc2`;

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [result, setResult] = useState<{ summary?: Record<string, number>; controls_mapped?: number } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus("uploading");
    setError("");
    try {
      const text = await file.text();
      const scan_data = JSON.parse(text);

      // Get current session + org
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const org_id = org?.id;
      if (!org_id) throw new Error("No organization found.");
      if (!org_id) throw new Error("No organization found. Please complete onboarding first.");

      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id, scan_data, auth_token: token }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");

      setResult(json);
      setStatus("success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStatus("error");
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Run Your Security Scan</h1>
        <p className="text-[var(--color-muted)] mt-1 text-sm">Use Prowler to scan your AWS account — it&apos;s free and open source. Takes about 10 minutes.</p>
      </div>

      {!roleArn && (
        <div className="bg-[var(--color-warning-bg)] border border-[var(--color-warning)] rounded-xl p-4 flex items-start gap-3">
          <span className="text-yellow-500 text-lg flex-shrink-0"></span>
          <div>
            <p className="text-sm font-semibold text-[var(--color-warning)]">AWS not connected yet</p>
            <p className="text-xs text-[var(--color-warning)] mt-0.5">Connect your AWS account first so we can pre-fill your role ARN in the scan command. <a href="/dashboard/settings" className="underline font-medium">Connect AWS →</a></p>
          </div>
        </div>
      )}

      {roleArn && (
        <div className="bg-[var(--color-success-bg)] border border-[var(--color-success)] rounded-xl p-4 flex items-center gap-3">
          <span className="text-[var(--color-success)]"></span>
          <div>
            <p className="text-sm font-semibold text-green-800">AWS connected — role ARN pre-filled in scan command</p>
            <p className="text-xs text-[var(--color-success)] font-mono mt-0.5 truncate">{roleArn}</p>
          </div>
        </div>
      )}

      {/* Step 1 */}
      <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">1</div>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Install Prowler</h2>
        </div>
        <p className="text-sm text-[var(--color-muted)] mb-3">Prowler is a free, open-source security tool. Requires Python 3.9+.</p>
        <div className="bg-[var(--color-foreground)] rounded-lg p-4 flex justify-between items-center">
          <code className="text-green-400 text-sm font-mono">{PROWLER_INSTALL}</code>
          <button onClick={() => copyToClipboard(PROWLER_INSTALL, "install")}
            className="text-[var(--color-muted)] hover:text-white text-xs ml-4 flex-shrink-0">
            {copied === "install" ? "✓ Copied" : "Copy"}
          </button>
        </div>
        <p className="text-xs text-[var(--color-muted)] mt-2">
          Or install via brew: <code className="bg-[var(--color-surface-2)] px-1 rounded">brew install prowler</code>
        </p>
      </div>

      {/* Step 2 */}
      <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">2</div>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Configure AWS Credentials</h2>
        </div>
        <p className="text-sm text-[var(--color-muted)] mb-3">
          Prowler needs read-only access to your AWS account. The safest approach is using a temporary role or existing CLI credentials.
        </p>
        <div className="bg-[var(--color-info-bg)] border border-blue-100 rounded-lg p-4 text-sm text-[var(--color-info)]">
          <strong>Minimum IAM permissions needed:</strong>
          <ul className="mt-2 space-y-1 list-disc list-inside text-[var(--color-info)]">
            <li>ReadOnlyAccess (AWS managed policy)</li>
            <li>SecurityAudit (AWS managed policy)</li>
          </ul>
          <p className="mt-2 text-xs">These are read-only — Prowler never modifies anything in your account.</p>
        </div>
        <div className="mt-3 bg-[var(--color-foreground)] rounded-lg p-4 flex justify-between items-center">
          <code className="text-green-400 text-sm font-mono">aws configure</code>
          <button onClick={() => copyToClipboard("aws configure", "configure")}
            className="text-[var(--color-muted)] hover:text-white text-xs ml-4">
            {copied === "configure" ? "✓ Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Step 3 */}
      <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">3</div>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Run the SOC 2 Scan</h2>
        </div>
        <p className="text-sm text-[var(--color-muted)] mb-3">
          Run this command. It takes 5–15 minutes depending on how many resources you have. The output JSON file is saved to <code className="bg-[var(--color-surface-2)] px-1 rounded">/tmp/shieldbase-scan/</code>
        </p>
        <div className="bg-[var(--color-foreground)] rounded-lg p-4 flex justify-between items-start">
          <code className="text-green-400 text-sm font-mono break-all">{PROWLER_COMMAND}</code>
          <button onClick={() => copyToClipboard(PROWLER_COMMAND, "scan")}
            className="text-[var(--color-muted)] hover:text-white text-xs ml-4 flex-shrink-0">
            {copied === "scan" ? "✓ Copied" : "Copy"}
          </button>
        </div>
        <p className="text-xs text-[var(--color-muted)] mt-2">
          This maps checks to the SOC 2 framework. Look for a <code className="bg-[var(--color-surface-2)] px-1 rounded">.json</code> file in the output directory when it finishes.
        </p>
      </div>

      {/* Step 4 — Upload */}
      <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">4</div>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Upload Your Results</h2>
        </div>
        <p className="text-sm text-[var(--color-muted)] mb-4">
          Upload the JSON file that Prowler generated. We&apos;ll analyze it and populate your compliance dashboard with real findings.
        </p>

        {status === "success" && result ? (
          <div className="bg-[var(--color-success-bg)] border border-[var(--color-success)] rounded-xl p-6 text-center">
            <div className="text-3xl mb-3"></div>
            <h3 className="text-lg font-bold text-green-800 mb-1">Scan uploaded successfully!</h3>
            <p className="text-[var(--color-success)] text-sm mb-4">{result.controls_mapped} controls mapped to SOC 2 criteria</p>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {result.summary && Object.entries(result.summary).map(([k, v]) => (
                <div key={k} className="bg-[var(--color-bg)] rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-[var(--color-foreground)]">{String(v)}</div>
                  <div className="text-xs text-[var(--color-muted)] capitalize">{k.replace(/_/g, " ")}</div>
                </div>
              ))}
            </div>
            <a href="/dashboard" className="inline-block bg-blue-600 hover:opacity-90 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition">
              View Dashboard →
            </a>
          </div>
        ) : (
          <>
            <div className={`border-2 border-dashed rounded-xl p-8 text-center transition ${file ? "border-blue-400 bg-[var(--color-info-bg)]" : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.name.endsWith(".json")) setFile(f); }}>
              {file ? (
                <div>
                  <div className="text-2xl mb-2"></div>
                  <p className="text-sm font-medium text-[var(--color-foreground-subtle)]">{file.name}</p>
                  <p className="text-xs text-[var(--color-muted)] mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  <button onClick={() => setFile(null)} className="text-xs text-[var(--color-danger)] mt-2 hover:underline">Remove</button>
                </div>
              ) : (
                <div>
                  <div className="text-3xl mb-2"></div>
                  <p className="text-sm text-[var(--color-muted)] mb-2">Drag & drop your Prowler JSON file here</p>
                  <label className="cursor-pointer text-sm text-[var(--color-info)] font-medium hover:underline">
                    or browse to select
                    <input type="file" accept=".json" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
              )}
            </div>

            {error && <p className="text-[var(--color-danger)] text-sm mt-3">{error}</p>}

            <button onClick={handleUpload} disabled={!file || status === "uploading"}
              className="w-full mt-4 bg-blue-600 hover:opacity-90 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition">
              {status === "uploading" ? "Analyzing scan results..." : "Upload & Analyze →"}
            </button>
          </>
        )}
      </div>

      {/* FAQ */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
        <h3 className="font-semibold text-[var(--color-foreground-subtle)] mb-3">Common questions</h3>
        <div className="space-y-3 text-sm">
          <div>
            <p className="font-medium text-[var(--color-foreground-subtle)]">Is this safe? Does Prowler modify anything?</p>
            <p className="text-[var(--color-muted)] mt-0.5">Prowler is 100% read-only. It only reads configuration data — it never changes, deletes, or creates anything in your AWS account.</p>
          </div>
          <div>
            <p className="font-medium text-[var(--color-foreground-subtle)]">What does ShieldBase do with my scan data?</p>
            <p className="text-[var(--color-muted)] mt-0.5">We store it in your private Supabase database to populate your dashboard. It&apos;s never shared with third parties.</p>
          </div>
          <div>
            <p className="font-medium text-[var(--color-foreground-subtle)]">The scan is taking a long time</p>
            <p className="text-[var(--color-muted)] mt-0.5">Normal — Prowler runs hundreds of checks. Large accounts (100+ resources) can take 20–30 minutes. Let it finish.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
