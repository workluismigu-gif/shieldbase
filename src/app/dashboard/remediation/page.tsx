"use client";
import { useState } from "react";
import { mockTasks } from "@/lib/mock-data";

type Status = "todo" | "in_progress" | "done";
type Priority = "critical" | "high" | "medium" | "low";

const priorityConfig = {
  critical: { color: "text-red-700 bg-red-100",    dot: "bg-red-500",    border: "border-l-red-500" },
  high:     { color: "text-orange-700 bg-orange-100", dot: "bg-orange-500", border: "border-l-orange-500" },
  medium:   { color: "text-yellow-700 bg-yellow-100", dot: "bg-yellow-400", border: "border-l-yellow-400" },
  low:      { color: "text-blue-700 bg-blue-100",   dot: "bg-blue-400",   border: "border-l-blue-400" },
};

const columns: { id: Status; label: string; icon: string; color: string }[] = [
  { id: "todo",        label: "To Do",      icon: "⭕", color: "bg-gray-100" },
  { id: "in_progress", label: "In Progress", icon: "🔄", color: "bg-blue-50" },
  { id: "done",        label: "Done",       icon: "✅", color: "bg-green-50" },
];

export default function RemediationPage() {
  const [tasks, setTasks] = useState(mockTasks.map(t => ({ ...t, status: t.status as Status, priority: t.priority as Priority })));
  const [dragId, setDragId] = useState<string | null>(null);

  const moveTask = (id: string, newStatus: Status) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const criticalTodo = tasks.filter(t => t.status !== "done" && t.priority === "critical").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Remediation Board</h1>
          <p className="text-sm text-gray-500 mt-1">Drag tasks across columns to track your compliance progress</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg font-medium">
            {tasks.filter(t => t.status === "done").length}/{tasks.length} complete
          </span>
          <span className={`px-3 py-1.5 rounded-lg font-medium ${criticalTodo > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
            {criticalTodo > 0 ? `${criticalTodo} critical remaining` : "No critical gaps 🎉"}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>Overall progress</span>
          <span className="font-semibold text-gray-800">{Math.round(tasks.filter(t => t.status === "done").length / tasks.length * 100)}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 flex overflow-hidden">
          <div className="bg-green-500 h-full transition-all duration-500 rounded-full"
            style={{ width: `${tasks.filter(t => t.status === "done").length / tasks.length * 100}%` }} />
        </div>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return (
            <div key={col.id}
              className={`${col.color} rounded-2xl p-4 min-h-[400px]`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (dragId) moveTask(dragId, col.id); setDragId(null); }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span>{col.icon}</span>
                  <span className="font-semibold text-gray-700 text-sm">{col.label}</span>
                </div>
                <span className="bg-white text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">{colTasks.length}</span>
              </div>

              <div className="space-y-3">
                {colTasks.map(task => {
                  const p = priorityConfig[task.priority];
                  return (
                    <div key={task.id}
                      draggable
                      onDragStart={() => setDragId(task.id)}
                      onDragEnd={() => setDragId(null)}
                      className={`bg-white rounded-xl border-l-4 ${p.border} shadow-sm p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-medium text-gray-800 leading-snug">{task.title}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${p.color} capitalize`}>
                          {task.priority}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{task.category}</span>
                        <span className="text-xs text-gray-400">Due {task.due}</span>
                      </div>
                      {/* Quick move buttons */}
                      <div className="flex gap-1 mt-2">
                        {columns.filter(c => c.id !== col.id).map(c => (
                          <button key={c.id} onClick={() => moveTask(task.id, c.id)}
                            className="text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-100 px-2 py-0.5 rounded transition">
                            → {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {colTasks.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                    Drop tasks here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Priority breakdown */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Priority Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(["critical","high","medium","low"] as Priority[]).map(p => {
            const total = tasks.filter(t => t.priority === p).length;
            const done = tasks.filter(t => t.priority === p && t.status === "done").length;
            const cfg = priorityConfig[p];
            return (
              <div key={p} className="text-center">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium capitalize mb-2 ${cfg.color}`}>
                  <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  {p}
                </div>
                <div className="text-2xl font-bold text-gray-800">{done}/{total}</div>
                <div className="text-xs text-gray-400 mt-0.5">complete</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
