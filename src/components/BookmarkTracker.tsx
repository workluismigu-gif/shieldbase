"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useOrg } from "@/lib/org-context";
import { supabase } from "@/lib/supabase";

// Silently records where auditors last navigated so "Resume where you left off"
// shows a meaningful link on the dashboard. Only active for auditor roles.
export default function BookmarkTracker() {
  const pathname = usePathname();
  const { org, role } = useOrg();
  const isAuditor = role === "auditor_readonly" || role === "auditor_staff";

  useEffect(() => {
    if (!isAuditor || !org?.id || !pathname) return;
    // Skip noisy paths
    if (pathname === "/dashboard" || pathname.startsWith("/dashboard/settings")) return;

    const t = setTimeout(async () => {
      const { data: s } = await supabase.auth.getSession();
      const token = s?.session?.access_token;
      if (!token) return;
      fetch("/api/auditor-bookmarks", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ org_id: org.id, last_path: pathname }),
      }).catch(() => { /* silent */ });
    }, 800);

    return () => clearTimeout(t);
  }, [pathname, org?.id, isAuditor]);

  return null;
}
