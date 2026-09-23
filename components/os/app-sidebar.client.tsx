"use client";

import { Bell, ChevronRight, PanelLeftClose, PanelLeftOpen, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import type { NavAudience } from "@/components/os/nav-audience";
import {
  SETTINGS_CHILDREN,
  isActive,
  visibleChildren,
  visibleGroups,
  type NavChild,
  type NavItem,
} from "@/components/os/nav";
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

type Props = { collapsed: boolean; onToggle: () => void; user: SidebarUser; audience: NavAudience };

const RAIL = "w-16";
const PANEL = "w-72";

/**
 * Left navigation (docs/design/design-system.md#sidebar).
 *
 * Two modes. **Pinned** is a 240px column that takes its own space. **Rail** is
 * a 56px strip that widens to 240px over the page on hover or keyboard focus —
 * the layout underneath never reflows, so hovering to read a label cannot
 * reshuffle the table you were reading. The pin state persists in a cookie;
 * hover state deliberately does not, because a pointer crossing the rail is not
 * a decision about how you want the OS laid out.
 */
export function AppSidebar({ collapsed, onToggle, user, audience }: Props) {
  const pathname = usePathname();
  // Sections this person has something to read; see nav-audience.ts.
  const groups = visibleGroups(audience);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  // Hover and focus both open the rail; neither is reset on navigation, because a
  // pointer still resting on the sidebar has not asked for it to close.
  const pinned = !collapsed;
  const open = pinned || hovered || focused;

  return (
    <aside
      aria-label="Primary"
      data-state={open ? "expanded" : "rail"}
      className={cn(
        // self-stretch, not h-full: h-full needs a parent with a resolved height, and
        // the component gallery only sets min-height, which would collapse it to zero.
        "relative z-40 shrink-0 self-stretch transition-[width] duration-[240ms] ease-standard",
        pinned ? PANEL : RAIL,
      )}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={(event) => {
          // :focus-visible, not plain focus. Clicking the pin button leaves it
          // focused; without this check the rail would stay open after the
          // click that asked it to close, and look broken.
          if (event.target instanceof Element && event.target.matches(":focus-visible")) setFocused(true);
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
        }}
        className={cn(
          "absolute inset-y-0 left-0 flex flex-col overflow-x-hidden border-r border-border bg-rail transition-[width,box-shadow] duration-[200ms] ease-standard",
          open ? PANEL : RAIL,
          // Only the floating state casts a shadow; pinned, it is part of the page.
          !pinned && open && "shadow-l",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 pr-2.5 pl-3.5">
          <Link href="/os" className="flex min-w-0 items-center gap-2.5" title={user.organizationName}>
            <OrgMark name={user.organizationName} />
            <span
              className={cn(
                "truncate text-base font-semibold tracking-tight whitespace-nowrap transition-opacity duration-[160ms]",
                open ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              {user.organizationName}
            </span>
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            aria-label={pinned ? "Unpin sidebar" : "Pin sidebar open"}
            aria-pressed={pinned}
            className={cn(
              "shrink-0 transition-opacity duration-[160ms]",
              open ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            {pinned ? <PanelLeftClose aria-hidden="true" /> : <PanelLeftOpen aria-hidden="true" />}
          </Button>
        </div>

        {/*
         * The one action worth a coloured button in the chrome. Everything in
         * the OS hangs off a project, so starting one is the only true entry
         * point; a second accent would cancel this one out.
         */}
        <div className="shrink-0 px-2.5 pb-3">
          <Link
            href="/os/projects/new"
            aria-label="New project"
            className={cn(
              "flex h-11 items-center rounded-full bg-brand-solid text-[15px] font-medium text-brand-solid-fg transition-[background-color,padding] duration-[200ms] ease-standard hover:bg-brand-solid-hover",
              open ? "justify-start gap-2.5 px-4" : "justify-center px-0",
            )}
          >
            <Plus className="size-5 shrink-0" aria-hidden="true" />
            <span
              className={cn(
                "truncate whitespace-nowrap transition-opacity duration-[160ms]",
                open ? "opacity-100" : "sr-only opacity-0",
              )}
            >
              New project
            </span>
          </Link>
        </div>

        <nav aria-label="Sections" className="flex flex-1 flex-col gap-5 overflow-x-hidden overflow-y-auto px-3 pb-5">
          {groups.map((group, index) => (
            <div key={group.label} className="flex flex-col gap-0.5">
              {open ? (
                <h2 className="truncate px-3 pb-1 text-[11px] font-medium tracking-[0.08em] whitespace-nowrap text-fg-subtle uppercase">
                  {group.label}
                </h2>
              ) : index > 0 ? (
                // The label cannot show at 56px, so the grouping survives as a rule.
                <div aria-hidden="true" className="mx-auto mb-1.5 h-px w-6 bg-border" />
              ) : null}
              {group.items.map((navItem) => (
                <NavRow key={navItem.href} item={navItem} pathname={pathname} open={open} role={user.orgRole} />
              ))}
            </div>
          ))}
        </nav>

        <div className="flex shrink-0 flex-col gap-0.5 border-t border-border px-3 py-3.5">
          <NavRow
            item={{ label: "Notifications", href: "/os/notifications", icon: Bell }}
            pathname={pathname}
            open={open}
            role={user.orgRole}
          />
          <NavRow
            item={{ label: "Settings", href: "/os/settings", icon: Settings, children: SETTINGS_CHILDREN }}
            pathname={pathname}
            open={open}
            role={user.orgRole}
          />
          <div className="mt-2 border-t border-border pt-2">
            <UserMenu user={user} collapsed={!open} />
          </div>
        </div>
      </div>
    </aside>
  );
}

/** Two-letter monogram in brand colour — a logo stand-in that never 404s. */
function OrgMark({ name }: { name: string }) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <span
      aria-hidden="true"
      className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-solid text-xs font-semibold text-brand-solid-fg"
    >
      {letters || "M"}
    </span>
  );
}

function NavRow({ item, pathname, open, role }: { item: NavItem; pathname: string; open: boolean; role: OrgRole }) {
  const children = visibleChildren(item.children, role);
  const active = isActive(pathname, item);
  const childActive = children.some((child) => pathname === child.href);

  // Open whenever you are somewhere inside the section: you should be able to
  // see the siblings of the page you are on without hunting for a chevron.
  const [manual, setManual] = useState<boolean | null>(null);
  const expanded = manual ?? active;

  const Icon = item.icon;
  const row = (
    <div
      className={cn(
        "relative flex items-center rounded-lg transition-colors duration-[120ms]",
        active && !childActive && "bg-brand-subtle",
        !active && "hover:bg-surface",
      )}
    >
      <Link
        href={item.href}
        aria-current={active && !childActive ? "page" : undefined}
        className={cn(
          "flex h-11 min-w-0 flex-1 items-center gap-3 rounded-lg px-3 text-[15px] text-fg-muted transition-colors duration-[120ms] hover:text-fg",
          active && "font-medium text-brand",
          !open && "justify-center px-0",
        )}
      >
        <Icon className="size-5 shrink-0" aria-hidden="true" />
        <span
          className={cn(
            "truncate whitespace-nowrap transition-opacity duration-[160ms]",
            open ? "opacity-100" : "sr-only opacity-0",
          )}
        >
          {item.label}
        </span>
      </Link>
      {open && children.length > 0 ? (
        <button
          type="button"
          onClick={() => setManual(!expanded)}
          aria-expanded={expanded}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${item.label}`}
          className="mr-1.5 flex size-7 shrink-0 items-center justify-center rounded-md text-fg-subtle transition-colors duration-[120ms] hover:bg-bg-subtle hover:text-fg"
        >
          <ChevronRight
            className={cn("size-4 transition-transform duration-[180ms] ease-standard", expanded && "rotate-90")}
            aria-hidden="true"
          />
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-col">
      {open ? (
        row
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>{row}</TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      )}
      {children.length > 0 ? (
        <div className="collapse-grid" data-open={open && expanded}>
          <div>
            <ul className="mt-0.5 flex flex-col gap-0.5 pb-0.5 pl-8">
              {children.map((child) => (
                <SubNavLink key={child.href} child={child} active={pathname === child.href} />
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SubNavLink({ child, active }: { child: NavChild; active: boolean }) {
  return (
    <li>
      <Link
        href={child.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-9 items-center rounded-lg px-3 text-sm whitespace-nowrap text-fg-muted transition-colors duration-[120ms] hover:bg-surface hover:text-fg",
          active && "bg-brand-subtle font-medium text-brand",
        )}
      >
        {child.label}
      </Link>
    </li>
  );
}
