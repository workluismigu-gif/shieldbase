"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getOrg, getSession, type OrgRow } from "@/lib/supabase";

interface OrgContextValue {
  org: OrgRow | null;
  userEmail: string | null;
  loading: boolean;
}

const OrgContext = createContext<OrgContextValue>({ org: null, userEmail: null, loading: true });

export function OrgProvider({ children }: { children: ReactNode }) {
  const [org, setOrg] = useState<OrgRow | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const session = await getSession();
        if (session) {
          setUserEmail(session.user.email ?? null);
          const orgData = await getOrg();
          setOrg(orgData);
        }
      } catch (e) {
        console.error("Failed to load org context:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <OrgContext.Provider value={{ org, userEmail, loading }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  return useContext(OrgContext);
}
