"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

function initials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";
}

const icons = {
  events: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  team: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="8" r="2.6" />
      <path d="M15.5 14.2c2.5.4 4.5 2.6 4.5 5.8" />
    </svg>
  ),
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!user) return null;

  const isAdmin = user.role === "admin";
  const homeHref = isAdmin ? "/admin" : "/team";

  const links = isAdmin
    ? [
        { href: "/admin", label: "Events", icon: "events" },
        { href: "/admin/team", label: "Team", icon: "team" },
      ]
    : [{ href: "/team", label: "Your events", icon: "events" }];

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <aside className="sticky top-0 flex h-screen w-[232px] shrink-0 flex-col border-r border-line bg-ink-soft px-3.5 py-5">
      <Link
        href={homeHref}
        className="mb-4 flex items-center gap-2.5 border-b border-line px-2 pb-5"
      >
        <span className="relative inline-block h-[26px] w-[26px] shrink-0 rounded-full border-[1.5px] border-safelight">
          <span className="absolute inset-[5px] rounded-full bg-safelight/85" />
        </span>
        <span>
          <span className="block font-display text-[16.5px] leading-tight">
            Trizen <span className="text-safelight">Photo Ops</span>
          </span>
          <span className="mt-0.5 block font-mono text-[9.5px] tracking-wider text-ash-dim">
            {isAdmin ? "STUDIO CONSOLE" : "TEAM WORKSPACE"}
          </span>
        </span>
      </Link>

      <p className="px-2.5 pb-1.5 pt-1 font-mono text-[10px] tracking-wider text-ash-dim">
        {isAdmin ? "WORKSPACE" : "YOUR WORK"}
      </p>
      <nav>
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`mb-0.5 flex items-center gap-2.5 rounded-[var(--radius-proof)] px-2.5 py-2 text-[13.5px] transition-colors ${
                active
                  ? "bg-ink-raised text-bone shadow-[inset_2px_0_0_var(--color-safelight)]"
                  : "text-ash hover:bg-ink-raised hover:text-bone"
              }`}
            >
              <span className="h-4 w-4 shrink-0 opacity-90">{icons[link.icon]}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-line pt-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-[var(--radius-proof)] px-2.5 py-2 text-left transition-colors hover:bg-ink-raised"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-ink-raised font-mono text-[11px]">
            {initials(user.name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] text-bone">{user.name}</span>
            <span className="block font-mono text-[10px] text-ash-dim">
              {isAdmin ? "ADMIN" : "TEAM"} · Log out
            </span>
          </span>
        </button>
      </div>
    </aside>
  );
}
