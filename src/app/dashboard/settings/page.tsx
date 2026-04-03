"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/connect"); }, [router]);
  return <div className="p-8 text-center text-gray-500">Redirecting to Integrations...</div>;
}
