"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import Navbar from "@/components/Navbar";
import Loader from "@/components/Loader";

export default function AdminLayout({ children }) {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status !== "ready") return;
    if (!user) {
      router.replace("/login");
    } else if (user.role !== "admin") {
      router.replace("/team");
    }
  }, [status, user, router]);

  if (status !== "ready" || !user || user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <Loader label="Checking access" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
