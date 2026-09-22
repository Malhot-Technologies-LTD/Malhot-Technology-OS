"use client";

import { Bell, PanelLeftClose, PanelLeftOpen, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { PRIMARY_NAV, isActive } from "@/components/os/nav";
import { RoleBadge } from "@/components/os/role-badge";
import { UserMenu } from "@/components/os/user-menu.client";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { OrgRole } from "@/types/domain";

export type SidebarUser = {
  fullName: string;
  email: string | null;
  avatarUrl: string | null;
  organizationName: string;
  orgRole: OrgRole;
};

type Props = { collapsed: boolean; onToggle: () => void; user: SidebarUser };

/** Left navigation: 240px expanded, 56px icon rail collapsed (docs/design/design-system.md#os). */
export function AppSidebar({ collapsed, onToggle, user }: Props) {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Primary"
      data-collapsed={collapsed}
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-border bg-bg-subtle transition-[width] duration-[180ms] ease-standard",
        collapsed ? "w-14" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center border-b border-border",
          collapsed ? "justify-center" : "justify-between px-4",
        )}
      >
        {!collapsed ? (
          <div className="flex min-w-0 items-center gap-2">
            <Link href="/os" className="truncate text-sm font-semibold tracking-tight" title={user.organizationName}>
              {user.organizationName}
            </Link>
            <RoleBadge role={user.orgRole} />
          </div>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
        >
          {collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
        </Button>
      </div>

      <nav aria-label="Sections" className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
        {PRIMARY_NAV.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(pathname, item)}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <div className="flex flex-col gap-1 border-t border-border p-4">
        <NavLink
          href="/os/notifications"
          label="Notifications"
          icon={Bell}
          active={pathname.startsWith("/os/notifications")}
          collapsed={collapsed}
        />
        <NavLink
          href="/os/settings"
          label="Settings"
          icon={Settings}
          active={pathname.startsWith("/os/settings")}
          collapsed={collapsed}
        />
        <UserMenu user={user} collapsed={collapsed} />
      </div>
    </aside>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>;
  active: boolean;
  collapsed: boolean;
}) {
  const link = (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-10 items-center gap-3 rounded-md px-3 text-sm text-fg-muted transition-colors duration-[120ms] hover:bg-surface hover:text-fg",
        // Selected section carries the brand accent: colour here means "you are
        // here", which is the one thing navigation has to communicate.
        active &&
          "bg-brand-subtle font-medium text-brand before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-brand before:content-['']",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      {collapsed ? <span className="sr-only">{label}</span> : <span className="truncate">{label}</span>}
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
