"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import Sidebar from "@/components/Sidebar";
import Loader from "@/components/Loader";

export default function TeamLayout({ children }) {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status !== "ready") return;
    if (!user) {
      router.replace("/login");
    } else if (user.role !== "team_member") {
      router.replace("/admin");
    }
  }, [status, user, router]);

  if (status !== "ready" || !user || user.role !== "team_member") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <Loader label="Checking access" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-ink">
      <Sidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
