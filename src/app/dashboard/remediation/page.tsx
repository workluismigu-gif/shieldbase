"use client";
import { useState } from "react";
import { useOrg, type TaskRow } from "@/lib/org-context";
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

export default function RemediationPage() {
  const { tasks, loading } = useOrg();
  const [localTasks, setLocalTasks] = useState<TaskRow[] | null>(null);
  const [filter, setFilter] = useState<"all" | "todo" | "done">("all");

  const displayTasks = localTasks ?? tasks;

  const handleToggle = async (id: string, completed: boolean) => {
    const updated = (localTasks ?? tasks).map(t =>
      t.id === id ? { ...t, completed, completed_at: completed ? new Date().toISOString() : undefined } : t
    );
    setLocalTasks(updated);
    await supabase
      .from("checklist_items")
      .update({ completed, completed_at: completed ? new Date().toISOString() : null })
      .eq("id", id);
  };

  const filtered = displayTasks.filter(t =>
    filter === "all" ? true : filter === "done" ? t.completed : !t.completed
  );

  const done = displayTasks.filter(t => t.completed).length;
  const total = displayTasks.length;

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading tasks...</div>;

  if (displayTasks.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-3">🔧</div>
        <p className="text-sm">No tasks yet. Connect AWS to get your remediation list.</p>
      </div>
    );
  }

  // Group by phase
  const phases = [...new Set(filtered.map(t => t.phase))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Remediation Board</h1>
          <p className="text-sm text-gray-500 mt-1">{done}/{total} tasks complete</p>
        </div>
        <div className="flex gap-2">
          {(["all", "todo", "done"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition capitalize ${filter === f ? "bg-navy text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {f === "all" ? `All (${total})` : f === "done" ? `Done (${done})` : `Todo (${total - done})`}
            </button>
          ))}
        </div>
      </div>

      {/* Progress */}
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
                {phaseTasks.sort((a, b) => a.order - b.order).map(task => (
                  <div key={task.id}
                    className={`bg-white rounded-xl border p-4 flex items-start gap-4 transition ${task.completed ? "border-green-200 bg-green-50/30" : "border-gray-200 hover:border-gray-300"}`}>
                    <button
                      onClick={() => handleToggle(task.id, !task.completed)}
                      className={`w-6 h-6 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition ${
                        task.completed ? "bg-green-500 border-green-500 text-white" : "border-gray-300 hover:border-blue-400"
                      }`}>
                      {task.completed && <span className="text-xs">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${task.completed ? "line-through text-gray-400" : "text-gray-800"}`}>
                        {task.task}
                      </div>
                      {task.description && <div className="text-xs text-gray-400 mt-0.5">{task.description}</div>}
                      {task.completed && task.completed_at && (
                        <div className="text-xs text-green-600 mt-1">Completed {new Date(task.completed_at).toLocaleDateString()}</div>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${PHASE_COLORS[phase] ?? "bg-gray-100 text-gray-600"}`}>
                      {phase}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
