"use client";
import { mockControls, mockTasks, mockPolicies, mockEvidenceItems } from "@/lib/mock-data";
import { useOrg } from "@/lib/org-context";

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#22c55e" : score >= 50 ? "#3b82f6" : "#ef4444";
  return (
    <div className="relative w-36 h-36">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle cx="60" cy="60" r="54" fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-gray-900">{score}%</span>
        <span className="text-xs text-gray-500">Ready</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color = "text-gray-900" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="text-xs text-gray-500 font-medium mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

const priorityColor = { critical: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700", medium: "bg-yellow-100 text-yellow-700", low: "bg-blue-100 text-blue-700" };
const statusColor = { todo: "bg-gray-100 text-gray-600", in_progress: "bg-blue-100 text-blue-700", done: "bg-green-100 text-green-700" };
const statusLabel = { todo: "To Do", in_progress: "In Progress", done: "Done" };
const policyStatusColor = { draft: "bg-yellow-100 text-yellow-700", review: "bg-blue-100 text-blue-700", approved: "bg-green-100 text-green-700", needs_update: "bg-red-100 text-red-700" };

export default function DashboardPage() {
  const { org, loading, controls, lastScan, scanHistory, timeline, tasks: realTasks, policies: realPolicies, realtimeConnected } = useOrg();

  // Use real data if available, fall back to mock
  const activeTasks = realTasks.length > 0
    ? realTasks.filter(t => !t.completed).slice(0, 6).map(t => ({
        id: t.id, title: t.task, category: t.phase,
        priority: "medium" as const, status: "todo" as const, due: "",
      }))
    : mockTasks.filter(t => t.status !== "done").slice(0, 6);

  const displayPolicies = realPolicies.length > 0
    ? realPolicies.slice(0, 6).map(p => ({
        id: p.id, title: p.title, status: p.status,
        updated: new Date(p.updated_at).toLocaleDateString(),
      }))
    : mockPolicies.slice(0, 6).map(p => ({ id: p.id, title: p.title, status: p.status, updated: p.updated }));

  // Use real data if available, fallback to mock
  const score = org?.readiness_score ?? mockControls.compliant;
  const orgName = org?.name ?? "Your Organization";
  const techStack = (org?.tech_stack ?? {}) as Record<string, string>;
  const awsConnected = !!techStack.aws_role_arn;
  const githubConnected = !!techStack.github_token;
  const githubScans = scanHistory.filter(s => s.scan_type === "github");
  const githubCompliant = githubScans.length > 0 ? (githubScans[0].summary?.compliant ?? 0) : 0;
  const githubTotal = githubScans.length > 0 ? (githubScans[0].summary?.total ?? 0) : 0;
  const githubPct = githubTotal > 0 ? Math.round((githubCompliant / githubTotal) * 100) : 0;
  const hasGithubData = githubTotal > 0;
  const hasRealData = controls.length > 0;

  const realCompliant = controls.filter(c => c.status === "compliant").length;
  const realNonCompliant = controls.filter(c => c.status === "non_compliant").length;
  const realTotal = controls.length;

  const doneTasks = realTasks.length > 0 ? realTasks.filter(t => t.completed).length : mockTasks.filter(t => t.status === "done").length;
  const totalTaskCount = realTasks.length > 0 ? realTasks.length : mockTasks.length;
  const inProgressTasks = realTasks.length > 0 ? 0 : mockTasks.filter(t => t.status === "in_progress").length;
  const totalEvidence = mockEvidenceItems.reduce((a, b) => a + b.items, 0);
  const collectedEvidence = mockEvidenceItems.reduce((a, b) => a + b.collected, 0);
  const approvedPolicies = realPolicies.length > 0 ? realPolicies.filter(p => p.status === "approved").length : mockPolicies.filter(p => p.status === "approved").length;
  const totalPolicies = realPolicies.length > 0 ? realPolicies.length : mockPolicies.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SOC 2 Compliance Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {hasRealData
              ? `Real scan data from your AWS account • Last scanned: ${lastScan || "today"}`
              : "Track your progress toward SOC 2 Type I certification"}
          </p>
        </div>
        {hasRealData && (
          <div className="flex items-center gap-2 text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-2 rounded-lg font-medium">
            {realtimeConnected ? (
              <><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" /> Live</>  
            ) : "✅"} AWS scan data
          </div>
        )}
      </div>

      {/* Two-track progress */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Track 1: Automated */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold text-gray-800">Automated Checks</div>
              <div className="text-xs text-gray-400">Prowler security scans</div>
            </div>
            {realtimeConnected && (
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                Live
              </span>
            )}
          </div>

          {/* Per-provider breakdown */}
          <div className="space-y-2 mb-3">
            {awsConnected && (
              <div className="flex items-center gap-2">
                <span className="text-sm">☁️</span>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-gray-600">AWS</span>
                    <span className="text-gray-400">{hasRealData ? `${realCompliant}/${realTotal}` : "pending"}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${hasRealData ? Math.round((realCompliant / realTotal) * 100) : 0}%` }} />
                  </div>
                </div>
                <span className="text-xs font-bold text-gray-700 w-8 text-right">{hasRealData ? Math.round((realCompliant / realTotal) * 100) : 0}%</span>
              </div>
            )}
            {githubConnected && (
              <div className="flex items-center gap-2">
                <span className="text-sm">🐙</span>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-gray-600">GitHub</span>
                    <span className="text-gray-400">{hasGithubData ? `${githubCompliant}/${githubTotal}` : "pending..."}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className={`h-full rounded-full transition-all duration-700 ${hasGithubData ? "bg-purple-500" : "bg-purple-300 animate-pulse"}`}
                      style={{ width: hasGithubData ? `${githubPct}%` : "30%" }} />
                  </div>
                </div>
                {hasGithubData && <span className="text-xs font-bold text-gray-700 w-8 text-right">{githubPct}%</span>}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-gray-900">{hasRealData ? Math.round((realCompliant / realTotal) * 100) : 0}%</span>
            <span className="text-xs text-gray-400">{hasRealData ? `${realCompliant}/${realTotal} passing` : "No scan yet"}</span>
          </div>
          {realNonCompliant > 0 && (
            <div className="mt-1 text-xs text-red-600 font-medium">{realNonCompliant} failing — needs attention</div>
          )}
        </div>

        {/* Track 2: Manual Evidence */}
        <a href="/dashboard/checklist" className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 transition block">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📋</span>
            <div>
              <div className="text-sm font-semibold text-gray-800">Manual Evidence</div>
              <div className="text-xs text-gray-400">Policies, training, procedures</div>
            </div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl font-black text-gray-900">{totalTaskCount > 0 ? Math.round((doneTasks / totalTaskCount) * 100) : 0}%</span>
            <span className="text-xs text-gray-400">{doneTasks}/{totalTaskCount} complete</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-700 rounded-full" style={{ width: `${totalTaskCount > 0 ? Math.round((doneTasks / totalTaskCount) * 100) : 0}%` }} />
          </div>
          <div className="mt-2 text-xs text-blue-600 font-medium">View roadmap →</div>
        </a>
      </div>

      {/* Integrations bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-gray-500 font-medium">Connected:</span>
        {awsConnected ? (
          <span className="flex items-center gap-1.5 text-xs bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-full font-medium">
            ☁️ AWS
            {realtimeConnected && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block ml-1" />}
          </span>
        ) : (
          <a href="/dashboard/connect" className="text-xs text-gray-400 border border-dashed border-gray-300 px-3 py-1.5 rounded-full hover:text-blue-600 hover:border-blue-300 transition">
            + Connect AWS
          </a>
        )}
      </div>

      {/* Score + Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="md:col-span-1 bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center justify-center">
          {loading ? (
            <div className="w-36 h-36 rounded-full border-8 border-gray-100 flex items-center justify-center">
              <span className="text-gray-400 text-sm">Loading...</span>
            </div>
          ) : (
            <ScoreRing score={score} />
          )}
          <div className="mt-3 text-sm font-medium text-gray-600">Overall Readiness</div>
        </div>
        <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Controls Passing"
            value={hasRealData ? `${realCompliant}/${realTotal}` : `${mockControls.compliant}/${mockControls.total}`}
            sub={hasRealData ? `${realNonCompliant} failing` : `${Math.round(mockControls.compliant/mockControls.total*100)}% compliant`}
            color={hasRealData && realNonCompliant > 0 ? "text-orange-600" : "text-green-600"}
          />
          <StatCard label="Policies" value={`${approvedPolicies}/${totalPolicies}`} sub={`${totalPolicies - approvedPolicies} pending`} color="text-blue-600" />
          <StatCard label="Evidence Collected" value={`${collectedEvidence}/${totalEvidence}`} sub={`${Math.round(collectedEvidence/totalEvidence*100)}% complete`} color="text-purple-600" />
          <StatCard label="Tasks Completed" value={`${doneTasks}/${totalTaskCount}`} sub={`${inProgressTasks} in progress`} color="text-orange-600" />
        </div>
      </div>

      {/* Real Controls from Scan */}
      {hasRealData && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">AWS Scan Results</h2>
            <span className="text-xs text-gray-400">Prowler SOC 2 scan • {controls.length} checks</span>
          </div>
          <div className="space-y-2">
            {controls.map((ctrl, i) => {
              const statusMap: Record<string, string> = { compliant: "bg-green-100 text-green-700", non_compliant: "bg-red-100 text-red-700", partial: "bg-yellow-100 text-yellow-700", not_assessed: "bg-gray-100 text-gray-600" };
              const dotMap: Record<string, string> = { compliant: "bg-green-500", non_compliant: "bg-red-500", partial: "bg-yellow-400", not_assessed: "bg-gray-300" };
              const labelMap: Record<string, string> = { compliant: "Pass", non_compliant: "Fail", partial: "Partial", not_assessed: "Unknown" };
              const sevMap: Record<string, string> = { critical: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700", medium: "bg-yellow-100 text-yellow-700", low: "bg-blue-100 text-blue-700" };
              return (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${ctrl.status === "non_compliant" ? "border-red-100 bg-red-50" : "border-gray-100"}`}>
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotMap[ctrl.status] || "bg-gray-300"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{ctrl.title}</div>
                    <div className="text-xs text-gray-400">{ctrl.control_id}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {ctrl.status === "non_compliant" && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${sevMap[ctrl.severity] || ""}`}>{ctrl.severity}</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusMap[ctrl.status] || ""}`}>{labelMap[ctrl.status] || ctrl.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mock controls breakdown (when no real data) */}
      {!hasRealData && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Controls by Category</h2>
          <div className="space-y-4">
            {mockControls.byCategory.map((cat, i) => {
              const pct = Math.round(cat.compliant / cat.total * 100);
              return (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-medium text-gray-700">{cat.category}</span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-green-600">{cat.compliant} pass</span>
                      <span className="text-yellow-600">{cat.partial} partial</span>
                      <span className="text-red-500">{cat.non_compliant} fail</span>
                      <span className="font-semibold text-gray-700">{pct}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 flex overflow-hidden">
                    <div className="bg-green-500 h-full" style={{ width: `${cat.compliant/cat.total*100}%` }} />
                    <div className="bg-yellow-400 h-full" style={{ width: `${cat.partial/cat.total*100}%` }} />
                    <div className="bg-red-400 h-full" style={{ width: `${cat.non_compliant/cat.total*100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tasks + Policies */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Active Tasks</h2>
            <a href="/dashboard/remediation" className="text-xs text-blue-600 font-medium hover:underline">View all →</a>
          </div>
          <div className="space-y-2">
            {activeTasks.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">All tasks complete ✅</p>
            ) : activeTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.priority === "critical" ? "bg-red-500" : task.priority === "high" ? "bg-orange-500" : "bg-yellow-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{task.title}</div>
                  <div className="text-xs text-gray-400">{task.category} · Due {task.due}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColor[task.status as keyof typeof statusColor]}`}>
                  {statusLabel[task.status as keyof typeof statusLabel]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Policies</h2>
            <a href="/dashboard/policies" className="text-xs text-blue-600 font-medium hover:underline">View all →</a>
          </div>
          <div className="space-y-2">
            {displayPolicies.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No policies yet</p>
            ) : displayPolicies.map((policy) => (
              <div key={policy.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{policy.title}</div>
                  <div className="text-xs text-gray-400">Updated {policy.updated}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize flex-shrink-0 ${policyStatusColor[policy.status as keyof typeof policyStatusColor] ?? "bg-gray-100 text-gray-600"}`}>
                  {policy.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h2>
        {timeline.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-3xl mb-2">📡</div>
            <p className="text-sm">No activity yet. Connect AWS to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {timeline.map((event, i) => {
              const dotColor = event.type === "scan" ? "bg-orange-500" : event.type === "integration" ? "bg-blue-500" : "bg-gray-400";
              const icon = event.type === "scan" ? "🔍" : event.type === "integration" ? "🔌" : "🏢";
              return (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${dotColor}`} />
                    {i < timeline.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                  </div>
                  <div className="pb-4">
                    <div className="text-sm text-gray-800">{icon} {event.title}</div>
                    {event.detail && <div className="text-xs text-gray-500 mt-0.5 truncate max-w-md">{event.detail}</div>}
                    <div className="text-xs text-gray-400 mt-0.5">{new Date(event.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
