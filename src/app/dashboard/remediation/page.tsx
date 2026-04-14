"use client";
import { useState, useEffect, useCallback } from "react";
import { useOrg } from "@/lib/org-context";
import { supabase } from "@/lib/supabase";

const PHASE_COLORS: Record<string, string> = {
  Foundation: "bg-orange-100 text-orange-700",
  Policies: "bg-purple-100 text-purple-700",
  Remediation: "bg-red-100 text-red-700",
  "Audit Prep": "bg-blue-100 text-blue-700",
};

const PHASE_ICONS: Record<string, string> = {
  Foundation: "🏗️",
  Policies: "📋",
  Remediation: "🔧",
  "Audit Prep": "🎯",
};

type Status = "open" | "in_progress" | "done" | "blocked";

interface Task {
  id: string;
  phase: string;
  task: string;
  description?: string;
  completed: boolean;
  completed_at?: string;
  order: number;
  status?: Status;
  due_date?: string | null;
  owner_user_id?: string | null;
}

interface Member {
  user_id: string | null;
  email: string;
  role: string;
}

const STATUS_STYLES: Record<Status, string> = {
  open: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
  blocked: "bg-red-100 text-red-700",
};

export default function RemediationPage() {
  const { org, loading: orgLoading } = useOrg();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    if (!org?.id) return;
    const { data } = await supabase
      .from("checklist_items")
      .select("id, phase, task, description, completed, completed_at, order, status, due_date, owner_user_id")
      .eq("org_id", org.id)
      .order("order", { ascending: true });
    if (data) setTasks(data as Task[]);
  }, [org?.id]);

  const loadMembers = useCallback(async () => {
    if (!org?.id) return;
    const { data } = await supabase
      .from("org_members")
      .select("user_id, email, role")
      .eq("org_id", org.id)
      .not("accepted_at", "is", null);
    if (data) setMembers(data as Member[]);
  }, [org?.id]);

  useEffect(() => { loadTasks(); loadMembers(); }, [loadTasks, loadMembers]);

  const updateTask = async (id: string, patch: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
    await supabase.from("checklist_items").update(patch).eq("id", id);
  };

  const toggleCompleted = async (t: Task) => {
    const completed = !t.completed;
    await updateTask(t.id, {
      completed,
      completed_at: completed ? new Date().toISOString() : null as unknown as undefined,
      status: completed ? "done" : "open",
    });
  };

  const done = tasks.filter(t => t.completed).length;
  const total = tasks.length;
  const filtered = tasks.filter(t =>
    filter === "all" ? true : filter === "done" ? t.completed : !t.completed
  );
  const overdue = (t: Task) => t.due_date && !t.completed && new Date(t.due_date) < new Date();

  if (orgLoading) return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading tasks...</div>;

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-3">🔧</div>
        <p className="text-sm">No tasks yet. Connect AWS to get your remediation list.</p>
      </div>
    );
  }

  const phases = [...new Set(filtered.map(t => t.phase))];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Remediation Board</h1>
          <p className="text-sm text-gray-500 mt-1">{done}/{total} tasks complete · assign owners & due dates for audit accountability</p>
        </div>
        <div className="flex gap-2">
          {(["all", "open", "done"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition capitalize ${filter === f ? "bg-navy text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {f === "all" ? `All (${total})` : f === "done" ? `Done (${done})` : `Open (${total - done})`}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-700"
          style={{ width: `${total > 0 ? Math.round((done / total) * 100) : 0}%` }} />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">No tasks in this filter.</div>
      ) : (
        phases.map(phase => {
          const phaseTasks = filtered.filter(t => t.phase === phase);
          if (phaseTasks.length === 0) return null;
          return (
            <div key={phase}>
              <div className="flex items-center gap-2 mb-3">
                <span>{PHASE_ICONS[phase] ?? "📌"}</span>
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{phase}</h2>
                <span className="text-xs text-gray-400">{phaseTasks.filter(t => t.completed).length}/{phaseTasks.length}</span>
              </div>
              <div className="space-y-2">
                {phaseTasks.sort((a, b) => a.order - b.order).map(task => {
                  const isExpanded = expanded === task.id;
                  const owner = members.find(m => m.user_id === task.owner_user_id);
                  return (
                    <div key={task.id}
                      className={`bg-white rounded-xl border p-4 transition ${task.completed ? "border-green-200 bg-green-50/30" : overdue(task) ? "border-red-300" : "border-gray-200"}`}>
                      <div className="flex items-start gap-4">
                        <button
                          onClick={() => toggleCompleted(task)}
                          className={`w-6 h-6 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition ${
                            task.completed ? "bg-green-500 border-green-500 text-white" : "border-gray-300 hover:border-blue-400"
                          }`}>
                          {task.completed && <span className="text-xs">✓</span>}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${task.completed ? "line-through text-gray-400" : "text-gray-800"}`}>{task.task}</div>
                          {task.description && <div className="text-xs text-gray-400 mt-0.5">{task.description}</div>}
                          <div className="flex items-center gap-2 flex-wrap mt-2 text-xs">
                            {task.status && (
                              <span className={`px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[task.status] ?? "bg-gray-100 text-gray-600"}`}>
                                {task.status.replace("_", " ")}
                              </span>
                            )}
                            {owner && (
                              <span className="text-gray-500">👤 {owner.email}</span>
                            )}
                            {task.due_date && (
                              <span className={overdue(task) ? "text-red-600 font-medium" : "text-gray-500"}>
                                📅 Due {new Date(task.due_date).toLocaleDateString()}{overdue(task) ? " (overdue)" : ""}
                              </span>
                            )}
                            {task.completed && task.completed_at && (
                              <span className="text-green-600">✓ {new Date(task.completed_at).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${PHASE_COLORS[phase] ?? "bg-gray-100 text-gray-600"}`}>{phase}</span>
                        <button onClick={() => setExpanded(isExpanded ? null : task.id)}
                          className="text-xs text-blue-600 hover:underline flex-shrink-0">
                          {isExpanded ? "Close" : "Edit"}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-gray-100 grid md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-gray-700 mb-1 block">Status</label>
                            <select value={task.status ?? "open"} onChange={(e) => updateTask(task.id, { status: e.target.value as Status })}
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs">
                              <option value="open">Open</option>
                              <option value="in_progress">In progress</option>
                              <option value="done">Done</option>
                              <option value="blocked">Blocked</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-700 mb-1 block">Owner</label>
                            <select value={task.owner_user_id ?? ""} onChange={(e) => updateTask(task.id, { owner_user_id: e.target.value || null })}
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs">
                              <option value="">Unassigned</option>
                              {members.map(m => (
                                <option key={m.user_id ?? m.email} value={m.user_id ?? ""}>{m.email}</option>
                              ))}
                            </select>
                            {members.length === 0 && <p className="text-xs text-gray-400 mt-1">Invite teammates from /dashboard/team</p>}
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-700 mb-1 block">Due date</label>
                            <input type="date" value={task.due_date ?? ""}
                              onChange={(e) => updateTask(task.id, { due_date: e.target.value || null })}
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
