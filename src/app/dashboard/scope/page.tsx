"use client";
import { useState, useEffect, useCallback } from "react";
import { useOrg } from "@/lib/org-context";
import { supabase } from "@/lib/supabase";

interface ScopeConfig {
  included_environments?: string[];
  aws_accounts?: { id: string; label?: string; in_scope: boolean }[];
  github_orgs?: { login: string; in_scope: boolean }[];
  data_classification?: "public" | "internal" | "confidential" | "restricted";
  audit_period_start?: string;
  audit_period_end?: string;
  scoped_products?: string;
  notes?: string;
}

const ENV_OPTIONS = ["production", "staging", "development"];

export default function ScopePage() {
  const { org } = useOrg();
  const [cfg, setCfg] = useState<ScopeConfig>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    setCfg((org?.scope_config as ScopeConfig) ?? {});
  }, [org?.scope_config]);

  useEffect(() => { load(); }, [load]);

  const techStack = (org?.tech_stack ?? {}) as Record<string, string>;
  const awsArn = techStack.aws_role_arn;
  const awsAccountId = awsArn ? awsArn.split(":")[4] : null;
  const githubLogin = techStack.github_login;

  // Seed AWS accounts / GitHub orgs from connected integrations if cfg is empty
  useEffect(() => {
    if (!cfg.aws_accounts && awsAccountId) {
      setCfg(prev => ({
        ...prev,
        aws_accounts: [{ id: awsAccountId, label: "Primary connected account", in_scope: true }],
      }));
    }
    if (!cfg.github_orgs && githubLogin) {
      setCfg(prev => ({
        ...prev,
        github_orgs: [{ login: githubLogin, in_scope: true }],
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awsAccountId, githubLogin]);

  const toggleEnv = (env: string) => {
    const set = new Set(cfg.included_environments ?? []);
    if (set.has(env)) set.delete(env);
    else set.add(env);
    setCfg(prev => ({ ...prev, included_environments: Array.from(set) }));
  };

  const handleSave = async () => {
    if (!org?.id) return;
    setSaving(true);
    setSaved(false);
    const { error } = await supabase
      .from("organizations")
      .update({ scope_config: cfg })
      .eq("id", org.id);
    setSaving(false);
    if (error) alert(error.message);
    else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Scope</h1>
        <p className="text-sm text-gray-500 mt-1">
          Define exactly what&apos;s in scope for your SOC 2 audit. Auditors reference this to bound their evidence requests and testing.
        </p>
      </div>

      {/* Audit period */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Audit period</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Period start</label>
            <input type="date" value={cfg.audit_period_start ?? ""}
              onChange={(e) => setCfg(prev => ({ ...prev, audit_period_start: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Period end</label>
            <input type="date" value={cfg.audit_period_end ?? ""}
              onChange={(e) => setCfg(prev => ({ ...prev, audit_period_end: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
      </section>

      {/* Products / systems */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Products & systems in scope</h2>
        <p className="text-xs text-gray-500">List the products, services, or systems that are part of the audit.</p>
        <textarea value={cfg.scoped_products ?? ""}
          onChange={(e) => setCfg(prev => ({ ...prev, scoped_products: e.target.value }))}
          rows={3}
          placeholder="e.g. ShieldBase SaaS platform — web app, API, scanning pipeline. Excludes internal marketing site and employee tooling."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </section>

      {/* Environments */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Environments in scope</h2>
        <div className="flex flex-wrap gap-2">
          {ENV_OPTIONS.map(env => {
            const isIn = (cfg.included_environments ?? []).includes(env);
            return (
              <button key={env} onClick={() => toggleEnv(env)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                  isIn ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-300 text-gray-700 hover:border-gray-400"
                }`}>
                {isIn ? "✓ " : "+ "}{env}
              </button>
            );
          })}
        </div>
      </section>

      {/* AWS accounts */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">AWS accounts</h2>
        {(cfg.aws_accounts ?? []).length === 0 ? (
          <p className="text-xs text-gray-500">No AWS account connected. Connect one on the Settings page to manage scope.</p>
        ) : (
          <div className="space-y-2">
            {(cfg.aws_accounts ?? []).map((acct, idx) => (
              <div key={acct.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <input type="checkbox" checked={acct.in_scope}
                  onChange={(e) => {
                    const updated = [...(cfg.aws_accounts ?? [])];
                    updated[idx] = { ...acct, in_scope: e.target.checked };
                    setCfg(prev => ({ ...prev, aws_accounts: updated }));
                  }}
                />
                <code className="text-xs text-gray-600 font-mono">{acct.id}</code>
                <input type="text" value={acct.label ?? ""}
                  onChange={(e) => {
                    const updated = [...(cfg.aws_accounts ?? [])];
                    updated[idx] = { ...acct, label: e.target.value };
                    setCfg(prev => ({ ...prev, aws_accounts: updated }));
                  }}
                  placeholder="Label (e.g. Production)"
                  className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* GitHub orgs */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">GitHub organizations</h2>
        {(cfg.github_orgs ?? []).length === 0 ? (
          <p className="text-xs text-gray-500">No GitHub org connected.</p>
        ) : (
          <div className="space-y-2">
            {(cfg.github_orgs ?? []).map((gh, idx) => (
              <div key={gh.login} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <input type="checkbox" checked={gh.in_scope}
                  onChange={(e) => {
                    const updated = [...(cfg.github_orgs ?? [])];
                    updated[idx] = { ...gh, in_scope: e.target.checked };
                    setCfg(prev => ({ ...prev, github_orgs: updated }));
                  }}
                />
                <span className="text-sm font-medium text-gray-800">@{gh.login}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Data classification */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Data classification</h2>
        <p className="text-xs text-gray-500">Highest classification of data handled within the audit scope.</p>
        <select value={cfg.data_classification ?? ""}
          onChange={(e) => setCfg(prev => ({ ...prev, data_classification: e.target.value as ScopeConfig["data_classification"] }))}
          className="w-full md:w-72 border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Select classification…</option>
          <option value="public">Public</option>
          <option value="internal">Internal</option>
          <option value="confidential">Confidential</option>
          <option value="restricted">Restricted (PII, PHI, financial)</option>
        </select>
      </section>

      {/* Notes */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Scope exclusions & notes</h2>
        <textarea value={cfg.notes ?? ""}
          onChange={(e) => setCfg(prev => ({ ...prev, notes: e.target.value }))}
          rows={4}
          placeholder="Document anything explicitly out of scope, carve-outs, or dependencies an auditor should know about."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </section>

      <div className="sticky bottom-4 flex justify-end gap-2">
        {saved && <span className="text-sm text-green-600 self-center">✓ Saved</span>}
        <button onClick={handleSave} disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-semibold text-sm shadow">
          {saving ? "Saving…" : "Save scope"}
        </button>
      </div>
    </div>
  );
}
