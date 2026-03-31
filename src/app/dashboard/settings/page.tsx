"use client";
import { useState } from "react";

export default function SettingsPage() {
  const [companyName, setCompanyName] = useState("Acme Corp");
  const [industry, setIndustry] = useState("SaaS");
  const [employees, setEmployees] = useState("11-50");
  const [cloud, setCloud] = useState("AWS");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Settings</h1>
        <p className="text-slate text-sm mt-1">Manage your organization and integrations</p>
      </div>

      <div className="max-w-2xl space-y-8">
        {/* Organization Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-navy mb-4">Organization</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Company Name</label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-navy mb-1">Industry</label>
                <select value={industry} onChange={(e) => setIndustry(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue">
                  <option>SaaS</option>
                  <option>Fintech</option>
                  <option>Healthcare</option>
                  <option>E-commerce</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy mb-1">Employees</label>
                <select value={employees} onChange={(e) => setEmployees(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue">
                  <option>1-10</option>
                  <option>11-50</option>
                  <option>51-200</option>
                  <option>201-500</option>
                  <option>500+</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Primary Cloud Provider</label>
              <select value={cloud} onChange={(e) => setCloud(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue">
                <option>AWS</option>
                <option>Google Cloud (GCP)</option>
                <option>Microsoft Azure</option>
                <option>Multi-cloud</option>
                <option>Other</option>
              </select>
            </div>
            <button onClick={handleSave}
              className="bg-blue hover:bg-blue-dark text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition">
              {saved ? "✓ Saved" : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Connected Integrations */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-navy mb-4">Connected Integrations</h2>
          <div className="space-y-3">
            {[
              { name: "Amazon Web Services", icon: "☁️", connected: false },
              { name: "GitHub", icon: "🐙", connected: false },
              { name: "Google Workspace", icon: "📧", connected: false },
              { name: "Okta", icon: "🔐", connected: false },
            ].map((int, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{int.icon}</span>
                  <span className="text-sm font-medium text-navy">{int.name}</span>
                </div>
                <button className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                  int.connected
                    ? "bg-green/10 text-green"
                    : "bg-gray-100 text-slate hover:bg-blue hover:text-white transition"
                }`}>
                  {int.connected ? "✓ Connected" : "Connect"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Frameworks */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-navy mb-4">Compliance Frameworks</h2>
          <div className="space-y-3">
            {[
              { name: "SOC 2 Type I", active: true, available: true },
              { name: "SOC 2 Type II", active: false, available: true },
              { name: "ISO 27001", active: false, available: false },
              { name: "HIPAA", active: false, available: false },
            ].map((fw, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <span className="text-sm font-medium text-navy">{fw.name}</span>
                {fw.available ? (
                  <span className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                    fw.active ? "bg-blue/10 text-blue" : "bg-gray-100 text-slate"
                  }`}>
                    {fw.active ? "Active" : "Available"}
                  </span>
                ) : (
                  <span className="text-xs text-slate">Coming Soon</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-xl border border-red-200 p-6">
          <h2 className="text-lg font-bold text-red-500 mb-2">Danger Zone</h2>
          <p className="text-sm text-slate mb-4">Permanently delete your organization and all associated data.</p>
          <button className="border border-red-200 text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium transition">
            Delete Organization
          </button>
        </div>
      </div>
    </div>
  );
}
