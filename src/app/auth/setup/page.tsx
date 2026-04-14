"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DEFAULT_CHECKLIST, DEFAULT_POLICIES } from "@/lib/onboarding-defaults";

export default function SetupPage() {
  const router = useRouter();

  useEffect(() => {
    async function setup() {
      // Wait briefly for session to settle
      await new Promise(r => setTimeout(r, 500));

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) {
        router.push("/auth");
        return;
      }

      // Check if org already exists for this user
      const { data: existing } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!existing) {
        // Get org name from sessionStorage (set during signup)
        const orgName =
          (typeof window !== "undefined" && sessionStorage.getItem("pending_org_name")) ||
          user.email?.split("@")[0] ||
          "My Organization";

        const { data: newOrg } = await supabase
          .from("organizations")
          .insert({ name: orgName, owner_id: user.id })
          .select("id")
          .single();

        if (typeof window !== "undefined") {
          sessionStorage.removeItem("pending_org_name");
        }

        // Seed default checklist items
        if (newOrg?.id) {
          await supabase.from("checklist_items").insert(
            DEFAULT_CHECKLIST.map(item => ({ ...item, org_id: newOrg.id, completed: false }))
          );
          await supabase.from("documents").insert(
            DEFAULT_POLICIES.map(policy => ({
              ...policy,
              org_id: newOrg.id,
              updated_at: new Date().toISOString(),
            }))
          );
        }
      }

      router.push("/dashboard");
    }

    setup();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-3xl mb-3"></div>
        <p className="text-sm text-gray-500">Setting up your workspace...</p>
      </div>
    </div>
  );
}
