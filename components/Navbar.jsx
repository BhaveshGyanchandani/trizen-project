"use client";

/**
 * NOTE: Not used anywhere in this codebase. AppSidebar.jsx (shadcn-based)
 * is what's actually rendered in the admin and team layouts; this appears
 * to be a superseded top-nav design kept only for reference.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import Badge from "./Badge";

/** Top navigation bar with role-based links, user badge, and logout. Superseded by AppSidebar — see note above. */
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
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href={user.role === "admin" ? "/admin" : "/team"} className="font-display text-lg leading-none">
            Trizen <span className="text-safelight">Photo Ops</span>
          </Link>
          <nav className="flex items-center gap-5">
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
        <div className="flex items-center gap-3">
          <Badge tone="role">{user.role === "admin" ? "Admin" : "Team"}</Badge>
          <span className="hidden text-sm text-ash sm:inline">{user.name}</span>
          <button onClick={handleLogout} className="text-sm text-ash transition-colors hover:text-safelight">
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
