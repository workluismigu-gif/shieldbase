"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useOrg } from "@/lib/org-context";

export default function AzureConnectPage() {
  const router = useRouter();
  const { org } = useOrg();
  const [subId, setSubId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async () => {
    if (!subId || !tenantId || !clientId || !clientSecret) {
      setError("All fields are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const tech = { 
        ...(org?.tech_stack ?? {}), 
        azure_subscription_id: subId, 
        azure_tenant_id: tenantId, 
        azure_client_id: clientId, 
        azure_client_secret: clientSecret, 
        azure_connected_at: new Date().toISOString() 
      };
      const { error } = await supabase.from("organizations").update({ tech_stack: tech }).eq("id", org!.id);
      if (error) throw error;

      // Trigger scan
      fetch("/api/scan/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer shieldbase-internal-2026` },
        body: JSON.stringify({ org_id: org!.id, provider: "azure" }),
      }).catch(console.error);

      router.push("/dashboard/settings");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <button onClick={() => router.push("/dashboard/settings")} className="text-sm text-blue-600 hover:underline mb-4">← Back to Settings</button>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Connect Microsoft Azure</h1>
      
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="bg-[#0078D4] px-6 py-5">
          <h2 className="text-lg font-bold text-white">Service Principal Setup</h2>
          <p className="text-sm text-blue-100">Enter your Azure Service Principal credentials</p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subscription ID</label>
            <input type="text" value={subId} onChange={(e) => setSubId(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tenant ID</label>
            <input type="text" value={tenantId} onChange={(e) => setTenantId(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
            <input type="text" value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
            <input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 font-mono" />
          </div>
          
          {error && <p className="text-red-500 text-sm">{error}</p>}
          
          <button onClick={handleConnect} disabled={saving} className="w-full bg-[#0078D4] text-white py-3 rounded-lg font-bold hover:bg-[#006cbd] disabled:opacity-50">
            {saving ? "Connecting..." : "Connect Azure"}
          </button>
        </div>
      </div>
    </div>
  );
}
