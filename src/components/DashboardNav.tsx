"use client";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: "" },
  { label: "Documents", href: "/dashboard/documents", icon: "" },
  { label: "Checklist", href: "/dashboard/checklist", icon: "" },
  { label: "Monitoring", href: "/dashboard/monitoring", icon: "" },
  { label: "Settings", href: "/dashboard/settings", icon: "" },
];

export default function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <aside className="w-64 bg-navy min-h-screen flex flex-col border-r border-white/5">
      {/* Logo */}
      <div className="p-6">
        <a href="/dashboard" className="text-xl font-extrabold text-white"> ShieldBase</a>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <a key={item.href} href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition
                ${active ? "bg-blue/10 text-blue" : "text-slate hover:text-white hover:bg-white/5"}`}>
              <span>{item.icon}</span>
              {item.label}
            </a>
          );
        })}
      </nav>

      {/* Compliance score mini */}
      <div className="px-4 pb-4">
        <div className="bg-navy-light rounded-xl p-4 border border-white/10">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate">SOC 2 Readiness</span>
            <span className="text-green font-bold">0%</span>
          </div>
          <div className="w-full bg-navy rounded-full h-2">
            <div className="bg-gradient-to-r from-blue to-green h-2 rounded-full transition-all duration-1000" style={{ width: "0%" }} />
          </div>
        </div>
      </div>

      {/* User */}
      <div className="p-4 border-t border-white/5">
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-slate hover:text-white transition w-full">
          <span></span> Log Out
        </button>
      </div>
    </aside>
  );
}
