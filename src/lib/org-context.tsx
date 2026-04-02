"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getOrg, getSession, supabase, type OrgRow } from "@/lib/supabase";

export interface ControlRow {
  control_id: string;
  category: string;
  title: string;
  status: "compliant" | "non_compliant" | "partial" | "not_assessed";
  severity: "critical" | "high" | "medium" | "low";
  updated_at?: string;
}

export interface ScanEvent {
  id: string;
  created_at: string;
  summary: {
    score?: number;
    compliant?: number;
    nonCompliant?: number;
    total?: number;
  };
}

interface OrgContextValue {
  org: OrgRow | null;
  userEmail: string | null;
  loading: boolean;
  controls: ControlRow[];
  lastScan: string | null;
  scanHistory: ScanEvent[];
  realtimeConnected: boolean;
}

const OrgContext = createContext<OrgContextValue>({
  org: null,
  userEmail: null,
  loading: true,
  controls: [],
  lastScan: null,
  scanHistory: [],
  realtimeConnected: false,
});

export function OrgProvider({ children }: { children: ReactNode }) {
  const [org, setOrg] = useState<OrgRow | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [controls, setControls] = useState<ControlRow[]>([]);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanEvent[]>([]);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  useEffect(() => {
    let orgId: string | null = null;

    async function load() {
      try {
        const session = await getSession();
        if (!session) { setLoading(false); return; }
        setUserEmail(session.user.email ?? null);
        const orgData = await getOrg();
        setOrg(orgData);
        orgId = orgData?.id ?? null;

        if (orgId) {
          // Initial fetch
          const { data: controlData } = await supabase
            .from("controls")
            .select("control_id, category, title, status, severity, updated_at")
            .eq("org_id", orgId);
          if (controlData) setControls(controlData as ControlRow[]);

          const { data: scanData } = await supabase
            .from("scan_results")
            .select("id, created_at, summary")
            .eq("org_id", orgId)
            .order("created_at", { ascending: false })
            .limit(10);
          if (scanData && scanData.length > 0) {
            setLastScan(new Date(scanData[0].created_at).toLocaleString());
            setScanHistory(scanData as ScanEvent[]);
          }
        }
      } catch (e) {
        console.error("Failed to load org context:", e);
      } finally {
        setLoading(false);
      }
    }

    load().then(() => {
      if (!orgId) return;

      // Subscribe to realtime updates
      const channel = supabase
        .channel(`org-${orgId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "controls", filter: `org_id=eq.${orgId}` },
          async () => {
            const { data } = await supabase
              .from("controls")
              .select("control_id, category, title, status, severity, updated_at")
              .eq("org_id", orgId);
            if (data) setControls(data as ControlRow[]);
          }
        )
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "scan_results", filter: `org_id=eq.${orgId}` },
          async () => {
            const { data } = await supabase
              .from("scan_results")
              .select("id, created_at, summary")
              .eq("org_id", orgId)
              .order("created_at", { ascending: false })
              .limit(10);
            if (data && data.length > 0) {
              setLastScan(new Date(data[0].created_at).toLocaleString());
              setScanHistory(data as ScanEvent[]);
            }
          }
        )
        .subscribe((status) => {
          setRealtimeConnected(status === "SUBSCRIBED");
        });

      return () => { supabase.removeChannel(channel); };
    });
  }, []);

  return (
    <OrgContext.Provider value={{ org, userEmail, loading, controls, lastScan, scanHistory, realtimeConnected }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  return useContext(OrgContext);
}
