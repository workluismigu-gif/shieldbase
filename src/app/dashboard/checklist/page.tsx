"use client";
import { useState } from "react";
import { useOrg, type TaskRow } from "@/lib/org-context";
import { supabase } from "@/lib/supabase";

const PHASES = ["Foundation", "Policies", "Remediation", "Audit Prep"];

const PHASE_ICONS: Record<string, string> = {
  Foundation: "",
  Policies: "",
  Remediation: "",
  "Audit Prep": "",
};

const PHASE_DESC: Record<string, string> = {
  Foundation: "Connect tools and secure your AWS infrastructure",
  Policies: "Review and approve your compliance policy templates",
  Remediation: "Fix failing controls from your automated scans",
  "Audit Prep": "Collect evidence and schedule your SOC 2 audit",
};

function PhaseCard({
  phase,
  tasks,
  isActive,
  isLocked,
  onToggle,
}: {
  phase: string;
  tasks: TaskRow[];
  isActive: boolean;
  isLocked: boolean;
  onToggle: (id: string, completed: boolean) => void;
}) {
  const done = tasks.filter(t => t.completed).length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const allDone = done === total && total > 0;

  return (
    <div className={`bg-[var(--color-bg)] rounded-2xl border ${isLocked ? "border-[var(--color-border)] opacity-60" : allDone ? "border-[var(--color-success)]" : "border-[var(--color-border)]"} overflow-hidden`}>
      {/* Phase header */}
      <div className={`px-6 py-4 flex items-center justify-between ${allDone ? "bg-[var(--color-success-bg)]" : isActive ? "bg-[var(--color-info-bg)]" : "bg-[var(--color-surface)]"}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{PHASE_ICONS[phase]}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-[var(--color-foreground)]">{phase}</h3>
              {isLocked && <span className="text-xs bg-[var(--color-border)] text-[var(--color-muted)] px-2 py-0.5 rounded-full"> Locked</span>}
              {allDone && <span className="text-xs bg-[var(--color-success-bg)] text-[var(--color-success)] px-2 py-0.5 rounded-full font-medium"> Complete</span>}
              {isActive && !allDone && <span className="text-xs bg-blue-200 text-[var(--color-info)] px-2 py-0.5 rounded-full font-medium"> Active</span>}
            </div>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">{PHASE_DESC[phase]}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-sm font-bold text-[var(--color-foreground-subtle)]">{done}/{total}</div>
          <div className="text-xs text-[var(--color-muted)]">{pct}%</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-[var(--color-surface-2)] h-1.5">
        <div className={`h-full transition-all duration-500 ${allDone ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
      </div>

      {/* Milestone banner */}
      {allDone && (
        <div className="bg-[var(--color-success-bg)] border-b border-green-100 px-6 py-3 flex items-center gap-2">
          <span className="text-lg"></span>
          <p className="text-sm font-medium text-green-800">{phase} complete! Great work.</p>
        </div>
      )}

      {/* Tasks */}
      {!isLocked && (
        <div className="divide-y divide-gray-50">
          {tasks.sort((a, b) => a.order - b.order).map(task => (
            <div key={task.id} className={`flex items-start gap-4 px-6 py-4 transition ${task.completed ? "bg-[var(--color-success-bg)]/40" : "hover:bg-[var(--color-surface)]"}`}>
              <button
                onClick={() => onToggle(task.id, !task.completed)}
                className={`w-6 h-6 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition ${
                  task.completed ? "bg-green-500 border-green-500 text-white" : "border-[var(--color-border-strong)] hover:border-blue-400"
                }`}
              >
                {task.completed && <span className="text-xs">✓</span>}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${task.completed ? "line-through text-[var(--color-muted)]" : "text-[var(--color-foreground-subtle)]"}`}>
                  {task.task}
                </div>
                {task.description && (
                  <div className="text-xs text-[var(--color-muted)] mt-0.5">{task.description}</div>
                )}
                {task.completed && task.completed_at && (
                  <div className="text-xs text-[var(--color-success)] mt-1"> Completed {new Date(task.completed_at).toLocaleDateString()}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChecklistPage() {
  const { tasks, loading, org } = useOrg();
  const [localTasks, setLocalTasks] = useState<TaskRow[] | null>(null);

  const displayTasks = localTasks ?? tasks;

  const handleToggle = async (id: string, completed: boolean) => {
    // Optimistic update
    const updated = (localTasks ?? tasks).map(t =>
      t.id === id ? { ...t, completed, completed_at: completed ? new Date().toISOString() : undefined } : t
    );
    setLocalTasks(updated);

    await supabase
      .from("checklist_items")
      .update({ completed, completed_at: completed ? new Date().toISOString() : null })
      .eq("id", id);
  };

  const totalDone = displayTasks.filter(t => t.completed).length;
  const totalTasks = displayTasks.length;
  const overallPct = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

  // Find active phase (first incomplete)
  const phaseCompletion = PHASES.map(phase => {
    const phaseTasks = displayTasks.filter(t => t.phase === phase);
    return { phase, done: phaseTasks.every(t => t.completed) && phaseTasks.length > 0 };
  });
  const activePhaseIndex = phaseCompletion.findIndex(p => !p.done);

  // Next action
  const nextTask = displayTasks
    .filter(t => !t.completed)
    .sort((a, b) => a.order - b.order)[0];

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-[var(--color-muted)] text-sm">Loading checklist...</div>;
  }

  if (displayTasks.length === 0) {
    return (
      <div className="text-center py-16 text-[var(--color-muted)]">
        <div className="text-4xl mb-3"></div>
        <p className="text-sm">No checklist items yet. Sign up to get your SOC 2 roadmap.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">SOC 2 Roadmap</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">Your step-by-step path to certification</p>
        </div>
        <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] px-5 py-3 text-center flex-shrink-0">
          <div className="text-3xl font-black text-[var(--color-info)]">{overallPct}%</div>
          <div className="text-xs text-[var(--color-muted)]">{totalDone}/{totalTasks} done</div>
        </div>
      </div>

      {/* Overall progress */}
      <div className="w-full bg-[var(--color-surface-2)] rounded-full h-3 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-700 rounded-full" style={{ width: `${overallPct}%` }} />
      </div>

      {/* Phase journey */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {PHASES.map((phase, i) => {
          const phaseDone = phaseCompletion[i].done;
          const isActive = i === activePhaseIndex;
          return (
            <div key={phase} className="flex items-center gap-2 flex-shrink-0">
              <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium ${phaseDone ? "bg-[var(--color-success-bg)] text-[var(--color-success)]" : isActive ? "bg-[var(--color-info-bg)] text-[var(--color-info)]" : "bg-[var(--color-surface-2)] text-[var(--color-muted)]"}`}>
                {phaseDone ? "" : isActive ? "" : ""} {phase}
              </div>
              {i < PHASES.length - 1 && <span className="text-[var(--color-muted)]">→</span>}
            </div>
          );
        })}
      </div>

      {/* Next action CTA */}
      {nextTask && (
        <div className="bg-[var(--color-info-bg)] border border-[var(--color-info)] rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">→</div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-[var(--color-info)] uppercase tracking-wide mb-0.5">Next Action</div>
            <div className="text-sm font-semibold text-[var(--color-foreground-subtle)]">{nextTask.task}</div>
            <div className="text-xs text-[var(--color-muted)]">{nextTask.phase} phase</div>
          </div>
          <button
            onClick={() => handleToggle(nextTask.id, true)}
            className="bg-blue-600 hover:opacity-90 text-white text-xs px-4 py-2 rounded-lg font-semibold transition flex-shrink-0"
          >
            Mark Done ✓
          </button>
        </div>
      )}

      {/* Phase cards */}
      {PHASES.map((phase, i) => {
        const phaseTasks = displayTasks.filter(t => t.phase === phase);
        if (phaseTasks.length === 0) return null;
        const isActive = i === activePhaseIndex;
        const isLocked = i > activePhaseIndex + 1; // allow 2 phases open at once
        return (
          <PhaseCard
            key={phase}
            phase={phase}
            tasks={phaseTasks}
            isActive={isActive}
            isLocked={isLocked}
            onToggle={handleToggle}
          />
        );
      })}
    </div>
  );
}
