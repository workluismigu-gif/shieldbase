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

export interface TaskRow {
  id: string;
  phase: string;
  task: string;
  description?: string;
  completed: boolean;
  completed_at?: string;
  order: number;
}

export interface PolicyRow {
  id: string;
  title: string;
  type: string;
  status: string;
  updated_at: string;
}

export interface TimelineEvent {
  id: string;
  type: "scan" | "integration" | "org_created";
  title: string;
  detail?: string;
  timestamp: string;
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
  timeline: TimelineEvent[];
  tasks: TaskRow[];
  policies: PolicyRow[];
  realtimeConnected: boolean;
}

const OrgContext = createContext<OrgContextValue>({
  org: null,
  userEmail: null,
  loading: true,
  controls: [],
  lastScan: null,
  scanHistory: [],
  timeline: [],
  tasks: [],
  policies: [],
  realtimeConnected: false,
});

export function OrgProvider({ children }: { children: ReactNode }) {
  const [org, setOrg] = useState<OrgRow | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [controls, setControls] = useState<ControlRow[]>([]);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanEvent[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  function buildTimeline(org: OrgRow | null, scans: ScanEvent[]): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    // Org created
    if (org?.created_at) {
      events.push({ id: "org-created", type: "org_created", title: "Organization created", detail: org.name, timestamp: org.created_at });
    }

    // AWS connected
    const tech = (org?.tech_stack ?? {}) as Record<string, string>;
    if (tech.aws_connected_at) {
      events.push({ id: "aws-connected", type: "integration", title: "AWS connected", detail: tech.aws_role_arn, timestamp: tech.aws_connected_at });
    } else if (tech.aws_role_arn) {
      // Fallback: no timestamp stored yet, use now as approximation
      events.push({ id: "aws-connected", type: "integration", title: "AWS connected", detail: tech.aws_role_arn, timestamp: new Date().toISOString() });
    }

    // Scans
    for (const scan of scans) {
      const s = scan.summary ?? {};
      events.push({
        id: scan.id,
        type: "scan",
        title: "Prowler AWS scan completed",
        detail: s.total ? `${s.total} controls assessed${s.score != null ? ` • ${s.score}% score` : ""}${s.nonCompliant ? ` • ${s.nonCompliant} failing` : ""}` : undefined,
        timestamp: scan.created_at,
      });
    }

    // Sort newest first
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

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
          const scans = (scanData ?? []) as ScanEvent[];
          if (scans.length > 0) {
            setLastScan(new Date(scans[0].created_at).toLocaleString());
            setScanHistory(scans);
          }
          setTimeline(buildTimeline(orgData, scans));

          // Fetch tasks
          const { data: taskData } = await supabase
            .from("checklist_items")
            .select("id, phase, task, description, completed, completed_at, order")
            .eq("org_id", orgId)
            .order("order", { ascending: true });
          if (taskData) setTasks(taskData as TaskRow[]);

          // Fetch policies
          const { data: policyData } = await supabase
            .from("documents")
            .select("id, title, type, status, updated_at")
            .eq("org_id", orgId)
            .order("updated_at", { ascending: false });
          if (policyData) setPolicies(policyData as PolicyRow[]);
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
        .on("postgres_changes", { event: "*", schema: "public", table: "checklist_items", filter: `org_id=eq.${orgId}` },
          async () => {
            const { data } = await supabase
              .from("checklist_items")
              .select("id, phase, task, description, completed, completed_at, order")
              .eq("org_id", orgId)
              .order("order", { ascending: true });
            if (data) setTasks(data as TaskRow[]);
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
              const updatedScans = data as ScanEvent[];
              setScanHistory(updatedScans);
              setOrg(current => {
                setTimeline(buildTimeline(current, updatedScans));
                return current;
              });
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
    <OrgContext.Provider value={{ org, userEmail, loading, controls, lastScan, scanHistory, timeline, tasks, policies, realtimeConnected }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  return useContext(OrgContext);
}
