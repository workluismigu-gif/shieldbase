"use client";
import { useState } from "react";

type ChecklistItem = {
  id: string;
  task: string;
  description: string;
  completed: boolean;
};

type Phase = {
  name: string;
  color: string;
  dotColor: string;
  items: ChecklistItem[];
};

const initialPhases: Phase[] = [
  {
    name: "🔴 Critical (Week 1–2)",
    color: "border-red-200 bg-red-50/50",
    dotColor: "bg-red-400",
    items: [
      { id: "c1", task: "Enable MFA for all users", description: "Enforce multi-factor authentication on identity provider, cloud consoles, and GitHub", completed: false },
      { id: "c2", task: "Enable encryption at rest", description: "Verify all databases, S3 buckets, and EBS volumes have encryption enabled", completed: false },
      { id: "c3", task: "Create Incident Response Plan", description: "Document severity levels, escalation procedures, and communication templates", completed: false },
      { id: "c4", task: "Remove public access to storage", description: "Ensure no S3 buckets, GCS buckets, or databases are publicly accessible", completed: false },
    ],
  },
  {
    name: "🟠 High Priority (Week 2–4)",
    color: "border-orange-200 bg-orange-50/50",
    dotColor: "bg-orange-400",
    items: [
      { id: "h1", task: "Implement access reviews", description: "Set up quarterly user access reviews for all critical systems", completed: false },
      { id: "h2", task: "Deploy centralized logging", description: "Enable CloudTrail, configure log aggregation, set up alerting", completed: false },
      { id: "h3", task: "Document change management process", description: "Formalize PR review requirements, deployment procedures, and rollback plans", completed: false },
      { id: "h4", task: "Create offboarding checklist", description: "Document access revocation process with timelines for each system", completed: false },
      { id: "h5", task: "Enable branch protection", description: "Require PR reviews and CI checks before merging to production branches", completed: false },
    ],
  },
  {
    name: "🟡 Medium Priority (Week 4–6)",
    color: "border-yellow-200 bg-yellow-50/50",
    dotColor: "bg-yellow-400",
    items: [
      { id: "m1", task: "Conduct vendor risk assessments", description: "Assess security posture of critical vendors (request SOC 2 reports)", completed: false },
      { id: "m2", task: "Set up security awareness training", description: "Enroll all employees in security training, track completion", completed: false },
      { id: "m3", task: "Test backup restoration", description: "Perform a backup restore test and document results", completed: false },
      { id: "m4", task: "Implement vulnerability scanning", description: "Set up automated vulnerability scanning on production infrastructure", completed: false },
    ],
  },
  {
    name: "🟢 Audit Preparation (Week 6–8)",
    color: "border-green-200 bg-green-50/50",
    dotColor: "bg-green-400",
    items: [
      { id: "a1", task: "Evidence collection dry run", description: "Collect all required evidence and verify completeness", completed: false },
      { id: "a2", task: "Policy review and sign-off", description: "Have all stakeholders review and formally approve security policies", completed: false },
      { id: "a3", task: "Engage CPA auditor", description: "Select and engage a CPA firm for the SOC 2 audit", completed: false },
      { id: "a4", task: "Audit kickoff meeting", description: "Schedule and conduct kickoff meeting with auditor", completed: false },
    ],
  },
];

export default function ChecklistPage() {
  const [phases, setPhases] = useState(initialPhases);

  const toggleItem = (phaseIdx: number, itemId: string) => {
    setPhases((prev) =>
      prev.map((phase, pi) =>
        pi === phaseIdx
          ? { ...phase, items: phase.items.map((item) => item.id === itemId ? { ...item, completed: !item.completed } : item) }
          : phase
      )
    );
  };

  const totalItems = phases.reduce((sum, p) => sum + p.items.length, 0);
  const completedItems = phases.reduce((sum, p) => sum + p.items.filter((i) => i.completed).length, 0);
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">Remediation Checklist</h1>
          <p className="text-slate text-sm mt-1">Track your progress toward audit readiness</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate">{completedItems} of {totalItems} tasks complete</div>
          <div className="text-2xl font-black text-navy">{progress}%</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div className="bg-gradient-to-r from-blue to-green h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between mt-3 text-xs text-slate">
          <span>Getting Started</span>
          <span>In Progress</span>
          <span>Audit Ready 🎉</span>
        </div>
      </div>

      {/* Phases */}
      <div className="space-y-6">
        {phases.map((phase, phaseIdx) => {
          const phaseComplete = phase.items.filter((i) => i.completed).length;
          return (
            <div key={phaseIdx} className={`rounded-xl border p-6 ${phase.color}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-navy">{phase.name}</h2>
                <span className="text-sm text-slate">{phaseComplete}/{phase.items.length}</span>
              </div>
              <div className="space-y-2">
                {phase.items.map((item) => (
                  <div key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-lg transition cursor-pointer ${
                      item.completed ? "bg-white/60" : "bg-white hover:bg-white/80"
                    }`}
                    onClick={() => toggleItem(phaseIdx, item.id)}>
                    <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${
                      item.completed ? "bg-green border-green" : "border-gray-300"
                    }`}>
                      {item.completed && <span className="text-white text-xs">✓</span>}
                    </div>
                    <div>
                      <div className={`text-sm font-medium ${item.completed ? "text-slate line-through" : "text-navy"}`}>
                        {item.task}
                      </div>
                      <div className="text-xs text-slate mt-0.5">{item.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
