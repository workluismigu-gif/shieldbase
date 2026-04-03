"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ConnectRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/settings"); }, [router]);
  return <div className="p-8 text-center text-gray-500">Redirecting to Settings...</div>;
}