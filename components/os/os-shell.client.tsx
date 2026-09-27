"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { AppSidebar, type SidebarUser } from "@/components/os/app-sidebar.client";
import type { NavAudience } from "@/components/os/nav-audience";
import { Breadcrumbs } from "@/components/os/breadcrumbs.client";
import { CommandPalette } from "@/components/os/command-palette.client";
import { ThemeSwitch } from "@/components/os/theme-toggle.client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";

export const SIDEBAR_COOKIE = "os_sidebar";

type Props = {
  user: SidebarUser;
  defaultCollapsed: boolean;
  audience: NavAudience;
  /*
   * Rendered on the server so it can count people waiting without shipping an
   * admin call to the browser. Passed in rather than imported, because this
   * component is a client boundary and cannot await anything itself.
   */
  bell: ReactNode;
  /** Count for the sidebar's Notifications row; server-rendered, see notification-count.tsx. */
  notificationBadge: ReactNode;
  children: ReactNode;
};

/**
 * OS chrome: sidebar + topbar around the routed page. Sidebar state persists in
 * a cookie so the server renders the right width on the next request (no flash).
 *
 * The topbar is three tracks, not a row: trail on the left, search centred in
 * the viewport, utilities on the right. Centring search costs a grid but means
 * it lands in the same place on every page and at every sidebar width — the
 * thing people reach for most stops moving.
 *
 * Below `md` there is no room for a sidebar beside the page, so it moves into a
 * drawer behind a menu button. The drawer is tied to the path it opened on, so
 * following a link closes it without an effect.
 */
export function OsShell({ user, defaultCollapsed, audience, bell, notificationBadge, children }: Props) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const pathname = usePathname();
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const drawerOpen = drawerPath === pathname;

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
      <div className="flex h-dvh overflow-hidden bg-bg">
        <div className="hidden md:flex">
          <AppSidebar
            collapsed={collapsed}
            onToggle={toggle}
            user={user}
            audience={audience}
            notificationBadge={notificationBadge}
          />
        </div>
        <Sheet open={drawerOpen} onOpenChange={(open) => setDrawerPath(open ? pathname : null)}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="flex w-72 max-w-[85vw] flex-row gap-0 p-0 md:hidden"
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <AppSidebar
              collapsed={false}
              onToggle={() => setDrawerPath(null)}
              user={user}
              audience={audience}
              notificationBadge={notificationBadge}
            />
          </SheetContent>
        </Sheet>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="grid h-16 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-bg/85 px-4 backdrop-blur-sm sm:px-7 md:grid-cols-[1fr_auto_1fr] md:gap-4">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 md:hidden"
                aria-label="Open navigation"
                onClick={() => setDrawerPath(pathname)}
              >
                <Menu aria-hidden="true" />
              </Button>
              <div className="hidden min-w-0 md:block">
                <Breadcrumbs />
              </div>
            </div>
            <CommandPalette audience={audience} />
            <div className="flex items-center justify-end gap-1.5">
              <ThemeSwitch />
              {bell}
            </div>
          </header>
          <main id="os-main" className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
