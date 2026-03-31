"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems: { href: string; label: string; icon: string; badge?: string }[] = [
  { href: "/dashboard", label: "Overview", icon: "📊" },
  { href: "/dashboard/connect", label: "Connect Tools", icon: "🔌" },
  { href: "/dashboard/monitoring", label: "Monitoring", icon: "📡" },
  { href: "/dashboard/scan", label: "Run Scan", icon: "🔍" },
  { href: "/dashboard/gap-analysis", label: "Gap Analysis", icon: "📄" },
  { href: "/dashboard/policies", label: "Policies", icon: "📋" },
  { href: "/dashboard/evidence", label: "Evidence", icon: "📁" },
  { href: "/dashboard/remediation", label: "Remediation", icon: "🔧" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
];

export default function DashboardLayout({ children, orgName = "Acme SaaS Inc." }: { children: React.ReactNode; orgName?: string }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-navy flex flex-col z-50 transition-transform md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/10">
          <Link href="/" className="text-lg font-extrabold text-white">🛡️ ShieldBase</Link>
        </div>

        {/* Org selector */}
        <div className="px-4 py-3 border-b border-white/10">
          <div className="bg-navy-light rounded-lg px-3 py-2">
            <div className="text-xs text-slate">Organization</div>
            <div className="text-sm text-white font-medium truncate">{orgName}</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue/15 text-blue-light"
                    : "text-slate hover:text-white hover:bg-white/5"
                }`}>
                <span className="text-base">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {"badge" in item && item.badge && (
                  <span className="text-xs bg-blue/20 text-blue-light px-1.5 py-0.5 rounded-full">{item.badge}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue/20 flex items-center justify-center text-sm text-blue-light font-bold">D</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white font-medium truncate">Demo User</div>
              <div className="text-xs text-slate truncate">demo@acme.com</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-navy-lighter">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="hidden md:block" />
          <div className="flex items-center gap-4">
            <span className="text-xs bg-green/10 text-green px-2.5 py-1 rounded-full font-medium">SOC 2 Type I</span>
            <span className="text-xs bg-blue/10 text-blue px-2.5 py-1 rounded-full font-medium">Day 6 of 30</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
