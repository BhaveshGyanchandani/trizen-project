"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import AppSidebar from "@/components/AppSidebar";
import Loader from "@/components/Loader";
import { SidebarProvider } from "@/components/ui/sidebar";

/**
 * Layout for all /team/* routes. Gates access to authenticated team
 * members only — redirects to /login if logged out, or to /admin if
 * logged in as an admin — and wraps children in the sidebar shell.
 */
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader label="Checking access" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </SidebarProvider>
  );
}
