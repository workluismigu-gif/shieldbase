"use client";
import { useState } from "react";

interface Integration {
  id: string;
  name: string;
  logo: string;
  category: string;
  tags: string[];
  status: "connected" | "available" | "coming_soon";
  description: string;
  monitors: string[];
  builtBy?: string;
}

const integrations: Integration[] = [
  // Cloud Providers
  { id: "aws", name: "Amazon Web Services", logo: "☁️", category: "Cloud provider", tags: ["Access", "Inventory", "Vulnerabilities"], status: "available", description: "Automatically collect evidence from your AWS infrastructure including IAM, S3, RDS, CloudTrail, and more.", monitors: ["IAM users & MFA", "S3 encryption", "CloudTrail logs", "Security groups", "RDS backups"], },
  { id: "gcp", name: "Google Cloud Platform", logo: "🌐", category: "Cloud provider", tags: ["Access", "Inventory"], status: "available", description: "Connect GCP to monitor IAM, Cloud Storage, and audit logs.", monitors: ["IAM roles", "Cloud Storage", "Audit logs", "Firewall rules"], },
  { id: "azure", name: "Microsoft Azure", logo: "🔷", category: "Cloud provider", tags: ["Access", "Inventory"], status: "coming_soon", description: "Azure Active Directory and resource monitoring.", monitors: ["Azure AD", "Resource groups", "Security Center"], },

  // Identity Providers
  { id: "google-workspace", name: "Google Workspace", logo: "📧", category: "Identity provider", tags: ["Access", "People"], status: "connected", description: "Monitor user accounts, MFA enforcement, and login activity.", monitors: ["User directory", "MFA status", "Admin roles", "Login audit"], },
  { id: "okta", name: "Okta", logo: "🔐", category: "Identity provider", tags: ["Access", "People"], status: "available", description: "Monitor SSO, MFA policies, and user lifecycle.", monitors: ["User provisioning", "MFA policies", "App assignments", "System logs"], },
  { id: "azure-ad", name: "Azure Active Directory", logo: "🪟", category: "Identity provider", tags: ["Access"], status: "available", description: "Monitor AD users, groups, and conditional access policies.", monitors: ["Users & groups", "Conditional access", "Sign-in logs"], },
  { id: "auth0", name: "Auth0", logo: "🔒", category: "Identity provider", tags: ["Access"], status: "available", description: "Monitor Auth0 tenants, users, and security settings.", monitors: ["User accounts", "MFA enrollment", "Attack protection"], },

  // Source Control
  { id: "github", name: "GitHub", logo: "🐙", category: "Source control", tags: ["Change management", "Access"], status: "connected", description: "Monitor branch protection, code reviews, and security alerts.", monitors: ["Branch protection", "PR approvals", "2FA enforcement", "Dependabot alerts"], },
  { id: "gitlab", name: "GitLab", logo: "🦊", category: "Source control", tags: ["Change management", "Access"], status: "available", description: "Monitor GitLab projects, MRs, and security settings.", monitors: ["Merge request approvals", "Protected branches", "Security scanning"], },

  // HR Systems
  { id: "rippling", name: "Rippling", logo: "👥", category: "Human resource information system", tags: ["People", "Access"], status: "available", description: "Sync employee directory for access reviews and onboarding/offboarding.", monitors: ["Employee roster", "Onboarding status", "Offboarding triggers"], },
  { id: "gusto", name: "Gusto", logo: "💼", category: "Human resource information system", tags: ["People"], status: "available", description: "Sync payroll and employee records for HR security controls.", monitors: ["Employee directory", "Employment status"], },
  { id: "bamboohr", name: "BambooHR", logo: "🎋", category: "Human resource information system", tags: ["People"], status: "available", description: "Monitor employee lifecycle and policy acknowledgments.", monitors: ["Employee data", "Time-off", "Custom fields"], },
  { id: "workday", name: "Workday", logo: "📊", category: "Human resource information system", tags: ["People"], status: "coming_soon", description: "Enterprise HR integration for employee and contractor management.", monitors: ["Employee records", "Role changes", "Terminations"], },

  // Communication
  { id: "slack", name: "Slack", logo: "💬", category: "Communication platform", tags: ["Access"], status: "connected", description: "Monitor Slack workspace settings, SSO, and data retention.", monitors: ["Workspace members", "SSO enforcement", "Data retention", "Admin roles"], },

  // Endpoint Security
  { id: "jamf", name: "Jamf", logo: "🖥️", category: "Endpoint security tool", tags: ["Inventory", "Vulnerabilities"], status: "available", description: "Monitor macOS device compliance, encryption, and patch status.", monitors: ["Device inventory", "FileVault encryption", "OS patch level", "MDM enrollment"], },
  { id: "crowdstrike", name: "CrowdStrike", logo: "🦅", category: "Endpoint security tool", tags: ["Vulnerabilities"], status: "available", description: "Monitor endpoint protection coverage and threat detections.", monitors: ["Agent coverage", "Threat detections", "Prevention policies"], },
  { id: "sentinelone", name: "SentinelOne", logo: "🛡️", category: "Endpoint security tool", tags: ["Vulnerabilities"], status: "available", description: "Monitor EDR coverage and security policies.", monitors: ["Agent deployment", "Policy compliance", "Threats"], },

  // Monitoring
  { id: "datadog", name: "Datadog", logo: "🐕", category: "Monitoring service", tags: ["Monitoring"], status: "available", description: "Monitor infrastructure health and security events.", monitors: ["Alert configuration", "Log management", "Access controls"], },
  { id: "pagerduty", name: "PagerDuty", logo: "📟", category: "Monitoring service", tags: ["Monitoring"], status: "available", description: "Track incident response procedures and escalation policies.", monitors: ["On-call schedules", "Incident history", "Escalation policies"], },

  // Project Management
  { id: "jira", name: "Jira", logo: "🔷", category: "Issue tracking", tags: ["Change management"], status: "available", description: "Track change requests, security incidents, and remediation tickets.", monitors: ["Change tickets", "Incident records", "Workflow compliance"], },
  { id: "linear", name: "Linear", logo: "📐", category: "Issue tracking", tags: ["Change management"], status: "connected", description: "Monitor issue tracking and change management workflows.", monitors: ["Change requests", "Issue workflow", "Project access"], },

  // Security Awareness
  { id: "knowbe4", name: "KnowBe4", logo: "🎓", category: "Security awareness training", tags: ["Training"], status: "available", description: "Monitor phishing simulations and security training completion.", monitors: ["Training completion", "Phishing results", "Campaign status"], },
  { id: "proofpoint", name: "Proofpoint Security Awareness", logo: "🎯", category: "Security awareness training", tags: ["Training"], status: "available", description: "Track security awareness training and assessment scores.", monitors: ["Training completion", "Assessment scores"], },

  // Background Checks
  { id: "checkr", name: "Checkr", logo: "✅", category: "Background check service", tags: ["People"], status: "available", description: "Verify background check completion for employees and contractors.", monitors: ["Check status", "Completion rate"], },

  // Vulnerability Management
  { id: "snyk", name: "Snyk", logo: "🐍", category: "Vulnerability management", tags: ["Vulnerabilities"], status: "available", description: "Monitor code and container vulnerabilities.", monitors: ["Code vulnerabilities", "Container scans", "License issues"], },
  { id: "qualys", name: "Qualys", logo: "🔍", category: "Vulnerability management", tags: ["Vulnerabilities"], status: "coming_soon", description: "Enterprise vulnerability scanning and management.", monitors: ["Asset inventory", "Vulnerability findings", "Patch status"], },
];

const categories = [
  "All",
  "Cloud provider",
  "Identity provider",
  "Source control",
  "Human resource information system",
  "Communication platform",
  "Endpoint security tool",
  "Monitoring service",
  "Issue tracking",
  "Security awareness training",
  "Background check service",
  "Vulnerability management",
];

const categoryShort: Record<string, string> = {
  "Human resource information system": "HR system",
  "Security awareness training": "Security training",
  "Background check service": "Background checks",
  "Vulnerability management": "Vuln management",
  "Communication platform": "Communication",
  "Endpoint security tool": "Endpoint security",
};

const statusColors = {
  connected: "bg-green-100 text-green-700",
  available: "bg-gray-100 text-gray-600",
  coming_soon: "bg-purple-100 text-purple-700",
};

export default function IntegrationsPage() {
  const [tab, setTab] = useState<"connected" | "available">("available");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [connected, setConnected] = useState<Set<string>>(
    new Set(integrations.filter(i => i.status === "connected").map(i => i.id))
  );
  const [selected, setSelected] = useState<Integration | null>(null);

  const filtered = integrations.filter(i => {
    const matchesTab = tab === "connected" ? connected.has(i.id) : !connected.has(i.id);
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = category === "All" || i.category === category;
    return matchesTab && matchesSearch && matchesCategory && i.status !== "coming_soon";
  });

  const comingSoon = integrations.filter(i => i.status === "coming_soon" && tab === "available" && (category === "All" || i.category === category));

  const toggle = (id: string) => {
    setConnected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSelected(null);
  };

  if (selected) {
    const isConnected = connected.has(selected.id);
    return (
      <div className="space-y-6 max-w-2xl">
        <button onClick={() => setSelected(null)} className="text-sm text-blue-600 hover:underline">← Back to integrations</button>
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-3xl">{selected.logo}</div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{selected.name}</h1>
              <span className="text-sm text-gray-400">{selected.category}</span>
              <div className="flex gap-2 mt-2">
                {selected.tags.map(t => <span key={t} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{t}</span>)}
              </div>
            </div>
          </div>
          <p className="text-gray-600 mb-6">{selected.description}</p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="text-sm font-semibold text-gray-700 mb-3">What ShieldBase monitors:</div>
            <ul className="space-y-2">
              {selected.monitors.map((m, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-green-500">✓</span>{m}
                </li>
              ))}
            </ul>
          </div>
          <button onClick={() => toggle(selected.id)}
            className={`w-full py-3 rounded-xl font-semibold transition ${isConnected ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
            {isConnected ? "Disconnect" : `Connect ${selected.name}`}
          </button>
          {!isConnected && <p className="text-xs text-gray-400 text-center mt-2">You&apos;ll be redirected to authorize ShieldBase read-only access</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-sm text-gray-500 mt-1">Connect your tools to enable automated evidence collection and monitoring</p>
        </div>
        <a href="mailto:hello@shieldbase.io?subject=Missing integration request" className="text-sm text-blue-600 hover:underline font-medium">
          Missing an integration? Let us know →
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button onClick={() => setTab("connected")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "connected" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
          Connected ({connected.size})
        </button>
        <button onClick={() => setTab("available")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "available" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
          Available ({integrations.filter(i => !connected.has(i.id)).length})
        </button>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search integrations..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          {categories.map(c => <option key={c} value={c}>{categoryShort[c] || c}</option>)}
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 && comingSoon.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">🔌</div>
          <p>{tab === "connected" ? "No integrations connected yet." : "No integrations match your search."}</p>
          {tab === "connected" && <button onClick={() => setTab("available")} className="mt-3 text-blue-600 text-sm hover:underline">Browse available integrations →</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filtered.map(integration => {
            const isConn = connected.has(integration.id);
            return (
              <div key={integration.id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-blue-200 hover:shadow-sm transition">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-xl">{integration.logo}</div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{integration.name}</div>
                      <div className="text-xs text-gray-400">{categoryShort[integration.category] || integration.category}</div>
                    </div>
                  </div>
                  {isConn && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Connected</span>}
                </div>
                <div className="flex flex-wrap gap-1 mb-4">
                  {integration.tags.map(t => <span key={t} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{t}</span>)}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setSelected(integration)}
                    className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs py-2 rounded-lg font-medium transition">
                    View details
                  </button>
                  <button onClick={() => toggle(integration.id)}
                    className={`flex-1 text-xs py-2 rounded-lg font-medium transition ${isConn ? "border border-gray-200 text-gray-500 hover:bg-gray-50" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
                    {isConn ? "Manage" : "Connect"}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Coming soon */}
          {comingSoon.map(integration => (
            <div key={integration.id} className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-5 opacity-70">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center text-xl grayscale">{integration.logo}</div>
                <div>
                  <div className="text-sm font-semibold text-gray-600">{integration.name}</div>
                  <div className="text-xs text-gray-400">{categoryShort[integration.category] || integration.category}</div>
                </div>
              </div>
              <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">Coming Soon</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
