"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import Loader from "@/components/Loader";

export default function Home() {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status !== "ready") return;
    if (!user) {
      router.replace("/login");
    } else if (user.role === "admin") {
      router.replace("/admin");
    } else {
      router.replace("/team");
    }
  }, [status, user, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink">
      <Loader label="Loading Trizen Photo Ops" />
    </main>
  );
}
