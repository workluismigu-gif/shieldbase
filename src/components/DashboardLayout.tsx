"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOrg } from "@/lib/org-context";
import { signOut } from "@/lib/supabase";
import {
  LayoutDashboard, Activity, FileText, Target, SlidersHorizontal,
  ShieldCheck, Folder, Wrench, Users, Settings, LogOut, Menu, Shield, ClipboardList, Gavel, UserCheck, Building2
} from "lucide-react";

type NavItem = { href: string; label: string; Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; badge?: string };

const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Overview", Icon: LayoutDashboard },
      { href: "/dashboard/monitoring", label: "Monitoring", Icon: Activity },
      { href: "/dashboard/gap-analysis", label: "Gap Analysis", Icon: FileText },
    ],
  },
  {
    label: "Compliance",
    items: [
      { href: "/dashboard/audit", label: "Audit Workspace", Icon: Gavel, badge: "New" },
      { href: "/dashboard/controls", label: "Controls", Icon: Target },
      { href: "/dashboard/pbc", label: "PBC Requests", Icon: ClipboardList },
      { href: "/dashboard/scope", label: "Audit Scope", Icon: SlidersHorizontal },
      { href: "/dashboard/access-reviews", label: "Access Reviews", Icon: UserCheck },
      { href: "/dashboard/vendors", label: "Vendor Risk", Icon: Building2 },
      { href: "/dashboard/policies", label: "Policies", Icon: ShieldCheck },
      { href: "/dashboard/evidence", label: "Evidence", Icon: Folder },
      { href: "/dashboard/remediation", label: "Remediation", Icon: Wrench },
    ],
  },
  {
    label: "Organization",
    items: [
      { href: "/dashboard/team", label: "Team & Auditors", Icon: Users },
      { href: "/dashboard/settings", label: "Settings", Icon: Settings },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { org, userEmail, loading, role } = useOrg();
  const orgName = loading ? "Loading..." : (org?.name ?? "Your Organization");
  const displayEmail = userEmail ?? "";
  const displayInitial = displayEmail ? displayEmail[0].toUpperCase() : "U";

  const dayOfJourney = useMemo(() => {
    if (!org?.created_at) return null;
    const created = new Date(org.created_at);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }, [org?.created_at]);

  const frameworks = (org?.frameworks ?? ["soc2"]) as string[];
  const frameworkLabel = frameworks.map(f =>
    f === "soc2" ? "SOC 2 Type I" :
    f === "iso27001" ? "ISO 27001" :
    f === "hipaa" ? "HIPAA" :
    f === "pci" ? "PCI DSS" : f.toUpperCase()
  ).join(" · ");

  useEffect(() => {
    if (!loading && !userEmail) window.location.href = "/auth";
  }, [loading, userEmail]);

  return (
    <div className="min-h-screen bg-[var(--color-surface)] flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col z-50 transition-transform md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo */}
        <div className="px-5 py-5">
          <Link href="/" className="inline-flex items-center gap-2 text-[var(--color-foreground)]">
            <div className="w-7 h-7 rounded-lg bg-[var(--color-foreground)]/10 flex items-center justify-center">
              <Shield className="w-4 h-4" strokeWidth={2} />
            </div>
            <span className="font-semibold tracking-tight text-[15px]">ShieldBase</span>
          </Link>
        </div>

        {/* Org */}
        <div className="px-3">
          <div className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)]">
            <div className="w-6 h-6 rounded-md bg-[var(--color-info)]/15 flex items-center justify-center text-[11px] font-semibold text-[var(--color-info)]">
              {orgName[0]?.toUpperCase() ?? "O"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">Organization</div>
              <div className="text-[13px] text-[var(--color-foreground)] font-medium truncate">{orgName}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.label}>
              <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">{section.label}</div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                        active
                          ? "bg-[var(--color-foreground)]/10 text-[var(--color-foreground)]"
                          : "text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]"
                      }`}>
                      <item.Icon className="w-[17px] h-[17px]" strokeWidth={1.6} />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="text-[10px] bg-[var(--color-info)]/15 text-[var(--color-info)] px-1.5 py-0.5 rounded-full">{item.badge}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-3 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="w-7 h-7 rounded-full bg-[var(--color-info)]/15 flex items-center justify-center text-xs text-[var(--color-info)] font-semibold">{displayInitial}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] text-[var(--color-foreground)] font-medium truncate">{displayEmail.split("@")[0] || "User"}</div>
              <div className="text-[11px] text-[var(--color-muted)] truncate">{displayEmail}</div>
            </div>
            <button
              onClick={async () => { await signOut(); window.location.href = "/auth"; }}
              className="text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition p-1" title="Sign out">
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-[var(--color-bg)]/60 backdrop-blur-xl border-b border-[var(--color-border)] px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-[var(--color-muted)]" aria-label="Open sidebar">
            <Menu className="w-5 h-5" strokeWidth={1.8} />
          </button>
          <div className="hidden md:block" />
          <div className="flex items-center gap-2">
            {role === "auditor_readonly" && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-info)] bg-[var(--color-info-bg)] px-2.5 py-1 rounded-md" title="You have read-only access to this organization">
                Auditor · Read-only
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-success)] bg-[var(--color-success-bg)] px-2.5 py-1 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
              {frameworkLabel}
            </span>
            {dayOfJourney !== null && role !== "auditor_readonly" && (
              <span className="text-xs font-medium text-[var(--color-info)] bg-[var(--color-info-bg)] px-2.5 py-1 rounded-md">
                Day {dayOfJourney} of 90
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
