"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import Badge from "./Badge";

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!user) return null;

  const links =
    user.role === "admin"
      ? [
          { href: "/admin", label: "Events" },
          { href: "/admin/team", label: "Team" },
        ]
      : [{ href: "/team", label: "Events" }];

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <header className="border-b border-line bg-ink">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-4 sm:gap-8">
          <Link
            href={user.role === "admin" ? "/admin" : "/team"}
            className="shrink-0 font-display text-base leading-none sm:text-lg"
          >
            Trizen <span className="text-safelight">Photo Ops</span>
          </Link>
          <nav className="flex items-center gap-4 sm:gap-5">
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm transition-colors ${
                    active ? "text-bone" : "text-ash hover:text-bone"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Badge tone="role">{user.role === "admin" ? "Admin" : "Team"}</Badge>
          <span className="hidden text-sm text-ash md:inline">{user.name}</span>
          <button onClick={handleLogout} className="text-sm text-ash transition-colors hover:text-safelight">
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
