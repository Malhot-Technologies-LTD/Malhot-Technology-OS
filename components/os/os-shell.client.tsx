"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { AppSidebar, type SidebarUser } from "@/components/os/app-sidebar.client";
import { CommandPalette } from "@/components/os/command-palette.client";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";

export const SIDEBAR_COOKIE = "os_sidebar";

type Props = { user: SidebarUser; defaultCollapsed: boolean; children: ReactNode };

/**
 * OS chrome: sidebar + topbar around the routed page. Sidebar state persists in
 * a cookie so the server renders the right width on the next request (no flash).
 */
export function OsShell({ user, defaultCollapsed, children }: Props) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <a
        href="#os-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <div className="flex h-dvh overflow-hidden">
        <AppSidebar collapsed={collapsed} onToggle={toggle} user={user} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-4">
            <CommandPalette />
            <Button asChild variant="ghost" size="icon-sm" aria-label="Notifications">
              <Link href="/os/notifications">
                <Bell aria-hidden="true" />
              </Link>
            </Button>
          </header>
          <main id="os-main" className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
