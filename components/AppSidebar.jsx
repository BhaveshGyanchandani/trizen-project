"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Camera, Images, Users, LogOut } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar";

/** Derives up to two initials from a display name for the avatar fallback. */
function initials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

/**
 * Primary app navigation sidebar (shadcn-based), rendered in both the
 * admin and team layouts. Shows role-appropriate links (Events/Team for
 * admins, just Events for team members), the current user's identity
 * with avatar, and a logout action. Renders nothing while logged out.
 */
export default function AppSidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!user) return null;

  const isAdmin = user.role === "admin";
  const homeHref = isAdmin ? "/admin" : "/team";

  const links = isAdmin
    ? [
        { href: "/admin", label: "Events", icon: Images },
        { href: "/admin/team", label: "Team", icon: Users },
      ]
    : [{ href: "/team", label: "Your events", icon: Images }];

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href={homeHref} className="flex items-center gap-2.5 px-1 py-1">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Camera className="size-4" />
          </span>
          <span>
            <span className="block text-[15px] font-semibold leading-tight">Trizen Photo Ops</span>
            <span className="block text-[11px] text-muted-foreground">
              {isAdmin ? "Studio console" : "Team workspace"}
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroupLabel>{isAdmin ? "Workspace" : "Your work"}</SidebarGroupLabel>
        <SidebarMenu>
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            const Icon = link.icon;
            return (
              <SidebarMenuItem key={link.href}>
                <SidebarMenuButton asChild isActive={active}>
                  <Link href={link.href}>
                    <Icon className="size-4" />
                    {link.label}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator className="mb-2" />
        <Link
          href="/profile"
          className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-sidebar-accent"
        >
          <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background text-xs font-medium">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- authenticated route, not a static asset
              <img src={user.avatarUrl} alt="" className="size-full object-cover" />
            ) : (
              initials(user.name)
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm">{user.name}</span>
            <span className="block text-[11px] text-muted-foreground">
              {isAdmin ? "Admin" : "Team member"}
            </span>
          </span>
        </Link>
        <button
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent"
        >
          <LogOut className="size-3.5 shrink-0" />
          Log out
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
