"use client";
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
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
  provider?: string;
  scan_type?: string;
  summary: {
    score?: number;
    compliant?: number;
    nonCompliant?: number;
    total?: number;
  };
}

export interface RawFinding {
  check_id?: string;
  metadata?: { event_code?: string };
  finding_info?: { title?: string; desc?: string };
  status_code?: string;
  status?: string;
  severity?: string;
  message?: string;
  status_detail?: string;
  remediation?: { desc?: string };
  unmapped?: { compliance?: Record<string, string[]>; categories?: string[] };
  cloud?: { region?: string };
  resources?: Array<{ group?: { name?: string }; type?: string }>;
  provider?: string;
}

interface OrgContextValue {
  org: OrgRow | null;
  userEmail: string | null;
  loading: boolean;
  controls: ControlRow[];
  lastScan: string | null;
  lastGithubScan: string | null;
  scanHistory: ScanEvent[];
  timeline: TimelineEvent[];
  tasks: TaskRow[];
  policies: PolicyRow[];
  githubFindings: RawFinding[];
  realtimeConnected: boolean;
  pushActivityEvent: (event: Omit<TimelineEvent, "id">) => void;
}

const OrgContext = createContext<OrgContextValue>({
  org: null,
  userEmail: null,
  loading: true,
  controls: [],
  lastScan: null,
  lastGithubScan: null,
  scanHistory: [],
  timeline: [],
  tasks: [],
  policies: [],
  githubFindings: [],
  realtimeConnected: false,
  pushActivityEvent: () => {},
});

export function OrgProvider({ children }: { children: ReactNode }) {
  const [org, setOrg] = useState<OrgRow | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [controls, setControls] = useState<ControlRow[]>([]);
  const [lastScan, setLastScan] = useState<string | null>(null); // AWS last scan
  const [lastGithubScan, setLastGithubScan] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanEvent[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [githubFindings, setGithubFindings] = useState<RawFinding[]>([]);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const pushActivityEvent = useCallback((event: Omit<TimelineEvent, "id">) => {
    const newEvent: TimelineEvent = { ...event, id: `local-${Date.now()}` };
    setTimeline(prev => [newEvent, ...prev]);
  }, []);

  function buildTimeline(org: OrgRow | null, scans: ScanEvent[]): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    // Org created
    if (org?.created_at) {
      events.push({ id: "org-created", type: "org_created", title: "Organization created", detail: org.name, timestamp: org.created_at });
    }

    const tech = (org?.tech_stack ?? {}) as Record<string, string>;

    // All integrations
    const integrations = [
      { key: "aws", label: "AWS", icon: "☁️", connectedAt: tech.aws_connected_at, detail: tech.aws_role_arn },
      { key: "github", label: "GitHub", icon: "🐙", connectedAt: tech.github_connected_at, detail: tech.github_login ? `@${tech.github_login}` : undefined },
      { key: "google", label: "Google Workspace", icon: "📧", connectedAt: tech.google_connected_at, detail: tech.google_domain },
      { key: "azure", label: "Azure", icon: "🔷", connectedAt: tech.azure_connected_at, detail: undefined },
      { key: "gcp", label: "GCP", icon: "☁️", connectedAt: tech.gcp_connected_at, detail: undefined },
    ];

    for (const int of integrations) {
      if (int.connectedAt) {
        events.push({ id: `${int.key}-connected`, type: "integration", title: `${int.label} connected`, detail: int.detail, timestamp: int.connectedAt });
      }
      // Don't show integration events without a real timestamp
    }

    // Scans — label by provider
    const providerLabels: Record<string, string> = { aws: "☁️ AWS", github: "🐙 GitHub", gcp: "GCP", azure: "Azure", kubernetes: "Kubernetes" };
    for (const scan of scans) {
      const s = scan.summary ?? {};
      const scanProvider = scan.scan_type || "aws";
      const providerLabel = providerLabels[scanProvider] ?? scanProvider.toUpperCase();
      const scanScore = s.total && s.compliant != null ? Math.round((s.compliant / s.total) * 100) : null;
      events.push({
        id: scan.id,
        type: "scan",
        title: `${providerLabel} scan completed`,
        detail: s.total ? `${s.total} controls assessed${scanScore != null ? ` • ${scanScore}% score` : ""}${s.nonCompliant ? ` • ${s.nonCompliant} failing` : ""}` : undefined,
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
            .select("id, created_at, summary, scan_type")
            .eq("org_id", orgId)
            .order("created_at", { ascending: false })
            .limit(10);
          const scans = (scanData ?? []) as ScanEvent[];
          if (scans.length > 0) {
            setScanHistory(scans);
            // Set last scan per provider
            const lastAws = scans.find(s => s.scan_type === "aws" || !s.scan_type);
            const lastGh = scans.find(s => s.scan_type === "github");
            if (lastAws) setLastScan(new Date(lastAws.created_at).toLocaleString());
            if (lastGh) setLastGithubScan(new Date(lastGh.created_at).toLocaleString());
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

          // Fetch latest GitHub scan findings
          const { data: githubScan } = await supabase
            .from("scan_results")
            .select("findings, scan_type")
            .eq("org_id", orgId)
            // .eq("scan_type", "github")  // TEMP: removed to debug
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          if (githubScan?.findings && Array.isArray(githubScan.findings) && githubScan.findings.length > 0) {
            setGithubFindings(githubScan.findings as RawFinding[]);
            console.log("GitHub findings loaded, scan_type:", githubScan.scan_type);
          } else {
            console.log("No GitHub findings. Latest scan:", githubScan);
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
        // Org changes (tech_stack updates when integrations connect/disconnect)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "organizations", filter: `id=eq.${orgId}` },
          async () => {
            const updated = await getOrg();
            if (updated) setOrg(updated);
          }
        )
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
              .select("id, created_at, summary, scan_type")
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
            // Re-fetch GitHub findings on new scan
            const { data: ghScan } = await supabase
              .from("scan_results")
              .select("findings")
              .eq("org_id", orgId)
              .eq("scan_type", "github")
              .order("created_at", { ascending: false })
              .limit(1)
              .single();
            if (ghScan?.findings && Array.isArray(ghScan.findings) && (ghScan.findings as unknown[]).length > 0) {
              setGithubFindings(ghScan.findings as RawFinding[]);
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
    <OrgContext.Provider value={{ org, userEmail, loading, controls, lastScan, lastGithubScan, scanHistory, timeline, tasks, policies, githubFindings, realtimeConnected, pushActivityEvent }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  return useContext(OrgContext);
}
