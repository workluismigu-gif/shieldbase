"use client";
import { useState, useEffect, useCallback } from "react";
import { mockPolicies } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase";
import { useOrg } from "@/lib/org-context";

interface Ack {
  user_id: string;
  policy_key: string;
  acknowledged_at: string;
}

const typeIcons: Record<string, string> = {
  information_security: "", access_control: "", incident_response: "",
  data_classification: "", change_management: "", vendor_management: "",
  encryption: "", bcp_dr: "", acceptable_use: "", other: "",
};

const statusConfig = {
  approved:     { label: "Approved",     color: "bg-green-100 text-green-700",  dot: "bg-green-500" },
  review:       { label: "In Review",    color: "bg-blue-100 text-blue-700",    dot: "bg-blue-500" },
  draft:        { label: "Draft",        color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-400" },
  needs_update: { label: "Needs Update", color: "bg-red-100 text-red-700",      dot: "bg-red-500" },
};

const policyContent: Record<string, string> = {
  "1": `# Information Security Policy

**Effective Date:** March 28, 2026 | **Version:** 1.0

## Purpose
This policy establishes the framework for protecting [COMPANY_NAME]'s information assets from unauthorized access, disclosure, alteration, and destruction.

## Scope
Applies to all employees, contractors, and third parties who access company systems.

## Policy Statements

### Access Control
- MFA required for all production systems and cloud consoles
- Least-privilege access model enforced
- Quarterly access reviews mandatory

### Encryption
- All customer data encrypted at rest (AES-256)
- All data in transit encrypted (TLS 1.2+)
- Key rotation at least annually

### Incident Response
- All security incidents reported within 1 hour to security@company.com
- Incident response plan tested annually

### Risk Management
- Annual risk assessments conducted
- Risk register maintained and reviewed quarterly

## Enforcement
Violations may result in disciplinary action up to termination.`,

  "2": `# Access Control Policy

**Effective Date:** March 28, 2026 | **Version:** 1.0

## Purpose
Establish requirements for managing access to information systems.

## Principles
- **Least Privilege:** Minimum access required for job function
- **Separation of Duties:** No single user controls entire processes  
- **Need-to-Know:** Access scoped to required resources only

## Authentication Requirements
- Minimum password length: 12 characters
- MFA required for all cloud consoles, IdPs, and source code repos
- Session timeout: 30 minutes idle

## Provisioning
1. Manager submits access request with justification
2. Security reviews against RBAC matrix
3. Access provisioned and logged

## Access Reviews
- User access reviewed quarterly
- Privileged access reviewed monthly
- Annual certification by department managers

## Offboarding
- All access revoked within 4 hours of termination
- Devices retrieved within 24 hours`,

  "3": `# Incident Response Plan

**Effective Date:** March 28, 2026 | **Version:** 1.0

## Severity Levels

| Level | Definition | Response Time |
|-------|-----------|---------------|
| SEV-1 | Active breach, data exfiltration | 15 minutes |
| SEV-2 | Confirmed unauthorized access | 1 hour |
| SEV-3 | Suspected access, malware detected | 4 hours |
| SEV-4 | Minor anomaly, policy violation | 24 hours |

## Response Phases
1. **Detection** — Monitor alerts, employee reports
2. **Triage** — Classify severity, scope impact
3. **Containment** — Isolate systems, revoke credentials
4. **Eradication** — Remove threat, patch vulnerability
5. **Recovery** — Restore from backups, verify integrity
6. **Post-Incident Review** — Root cause, lessons learned

## Contacts
- Incident Commander: [CTO/CISO Name]
- Security Team: security@company.com
- Legal Counsel: [Attorney Name]
- Cyber Insurance: [Provider, Policy #]`,
};

export default function PoliciesPage() {
  const { org, userEmail } = useOrg();
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [acks, setAcks] = useState<Ack[]>([]);
  const [acking, setAcking] = useState(false);

  const loadAcks = useCallback(async () => {
    if (!org?.id) return;
    const { data } = await supabase
      .from("policy_acknowledgements")
      .select("user_id, policy_key, acknowledged_at")
      .eq("org_id", org.id);
    if (data) setAcks(data as Ack[]);
  }, [org?.id]);

  useEffect(() => { loadAcks(); }, [loadAcks]);

  const acknowledge = async (policyKey: string) => {
    setAcking(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) return;
      const res = await fetch("/api/policies/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policy_key: policyKey, auth_token: sessionData.session.access_token }),
      });
      if (res.ok) await loadAcks();
      else alert("Failed to acknowledge");
    } finally {
      setAcking(false);
    }
  };

  const filters = ["all", "approved", "review", "draft"];
  const filtered = filter === "all" ? mockPolicies : mockPolicies.filter(p => p.status === filter);

  const counts = {
    all: mockPolicies.length,
    approved: mockPolicies.filter(p => p.status === "approved").length,
    review: mockPolicies.filter(p => p.status === "review").length,
    draft: mockPolicies.filter(p => p.status === "draft").length,
  };

  const selectedPolicy = selected ? mockPolicies.find(p => p.id === selected) : null;

  if (selectedPolicy) {
    const s = statusConfig[selectedPolicy.status];
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelected(null)} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            ← Back to policies
          </button>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{typeIcons[selectedPolicy.type] || ""}</span>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{selectedPolicy.title}</h1>
                <p className="text-sm text-gray-400 mt-0.5">Last updated {selectedPolicy.updated}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
                ⬇ Download
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
                {policyContent[selectedPolicy.id] || `# ${selectedPolicy.title}\n\nThis policy document will be generated based on your organization's tech stack and specific requirements.\n\nSchedule a call with your ShieldBase consultant to review and customize this policy.`}
              </pre>
            </div>
          </div>

          {/* Acknowledgement section */}
          <div className="border-t border-gray-100 bg-gray-50 p-6">
            {(() => {
              const policyKey = selectedPolicy.id;
              const policyAcks = acks.filter(a => a.policy_key === policyKey);
              const myAck = policyAcks.find(a => a.user_id);
              const hasAcked = !!myAck;
              return (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Policy acknowledgement</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{policyAcks.length} signature{policyAcks.length === 1 ? "" : "s"} on record</p>
                    </div>
                    <button
                      onClick={() => acknowledge(policyKey)}
                      disabled={acking || hasAcked}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                        hasAcked ? "bg-green-100 text-green-700 cursor-default" : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}>
                      {hasAcked ? "✓ Acknowledged" : acking ? "Signing…" : "Acknowledge policy"}
                    </button>
                  </div>
                  {policyAcks.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 text-sm">
                      {policyAcks.map(a => (
                        <div key={`${a.user_id}-${a.policy_key}`} className="px-4 py-2 flex justify-between items-center text-xs">
                          <span className="font-mono text-gray-600 truncate max-w-[300px]">{a.user_id === (userEmail ? a.user_id : "") ? userEmail : a.user_id}</span>
                          <span className="text-gray-500">{new Date(a.acknowledged_at).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Policy Documents</h1>
          <p className="text-sm text-gray-500 mt-1">Your custom security policies generated for your tech stack</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition">
          ⬇ Download All as ZIP
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["all","approved","review","draft"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`bg-white rounded-xl border p-4 text-left transition ${filter === f ? "ring-2 ring-blue-500 border-blue-300" : "border-gray-200 hover:border-gray-300"}`}>
            <div className={`text-2xl font-black ${f === "approved" ? "text-green-600" : f === "review" ? "text-blue-600" : f === "draft" ? "text-yellow-600" : "text-gray-800"}`}>
              {counts[f]}
            </div>
            <div className="text-xs text-gray-500 capitalize mt-0.5">{f === "all" ? "Total Policies" : f}</div>
          </button>
        ))}
      </div>

      {/* Policy list */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filtered.map(policy => {
            const s = statusConfig[policy.status];
            return (
              <button key={policy.id} onClick={() => setSelected(policy.id)}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition text-left">
                <span className="text-2xl flex-shrink-0">{typeIcons[policy.type] || ""}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900">{policy.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Updated {policy.updated}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span>
                  <span className="text-gray-300 text-sm">→</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
