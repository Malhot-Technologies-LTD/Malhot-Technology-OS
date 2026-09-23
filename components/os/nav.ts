import {
  Activity,
  BarChart3,
  CalendarRange,
  CheckSquare,
  FileText,
  FlaskConical,
  FolderKanban,
  Home,
  Users,
  type LucideIcon,
} from "lucide-react";

import { canSeeSection, type NavAudience } from "@/components/os/nav-audience";
import type { OrgRole } from "@/types/domain";

/** Primary navigation (docs/product/malhot-os.md#navigation). Order matters. */
export type NavItem = {
  label: string;
  href: `/os${string}`;
  icon: LucideIcon;
  exact?: boolean;
  /** Sub-destinations, shown as a disclosure under the item in the sidebar. */
  children?: readonly NavChild[];
};

export type NavChild = { label: string; href: `/os${string}`; adminOnly?: boolean };

export const PRIMARY_NAV: readonly NavItem[] = [
  { label: "Home", href: "/os", icon: Home, exact: true },
  {
    label: "Projects",
    href: "/os/projects",
    icon: FolderKanban,
    children: [
      { label: "All projects", href: "/os/projects" },
      { label: "New project", href: "/os/projects/new" },
    ],
  },
  { label: "My Tasks", href: "/os/my-tasks", icon: CheckSquare },
  { label: "Timeline", href: "/os/timeline", icon: CalendarRange },
  { label: "Documents", href: "/os/documents", icon: FileText },
  { label: "Testing", href: "/os/testing", icon: FlaskConical },
  { label: "Team", href: "/os/team", icon: Users },
  { label: "Reports", href: "/os/reports", icon: BarChart3 },
  { label: "Activity", href: "/os/activity", icon: Activity },
];

/** Settings lives in the sidebar footer, but carries the same disclosure as the rest. */
export const SETTINGS_CHILDREN: readonly NavChild[] = [
  { label: "Profile", href: "/os/settings/profile" },
  { label: "Password", href: "/os/settings/password" },
  { label: "Appearance", href: "/os/settings/appearance" },
  { label: "Members", href: "/os/settings/members", adminOnly: true },
  { label: "Enquiries", href: "/os/settings/inquiries", adminOnly: true },
];

/**
 * The groups this person should actually see, with empty groups dropped.
 *
 * Filtering here rather than in the sidebar keeps one answer for the sidebar,
 * the command palette and anything else that offers a destination — an item
 * hidden from the nav but reachable from the palette is the same bug twice.
 */
export function visibleGroups(audience: NavAudience): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.filter((item) => canSeeSection(item.href, audience)),
  })).filter((group) => group.items.length > 0);
}

export function visibleNavItems(audience: NavAudience): NavItem[] {
  return PRIMARY_NAV.filter((item) => canSeeSection(item.href, audience));
}

export function visibleChildren(children: readonly NavChild[] | undefined, role: OrgRole): readonly NavChild[] {
  if (!children) return [];
  return role === "member" ? children.filter((child) => !child.adminOnly) : children;
}

const BY_HREF = new Map(PRIMARY_NAV.map((navItem) => [navItem.href, navItem]));

/**
 * The same nine destinations, grouped for the sidebar.
 *
 * A flat list of nine is a list you read top to bottom every time; four named
 * groups of two or three are four things to recognise. The groups answer
 * "what am I doing" — delivering work, checking it, running the company — so
 * someone who has never seen the OS can guess where a page lives. `PRIMARY_NAV`
 * stays flat and canonical: the palette and breadcrumbs read it, and every group
 * below is a list of references into it, so the two cannot drift apart.
 *
 * Resolution is total — an unknown href drops out rather than raising. This
 * module is imported by `/os/[section]`, and Next evaluates it inside a render
 * worker while enumerating that segment; a throw at module scope kills the
 * worker process outright and surfaces as "Jest worker encountered N child
 * process exceptions", which names neither this file nor the bad href. The
 * guarantee lives in `nav.test.ts` instead, where a mistake fails CI by name.
 */
export type NavGroup = { label: string; items: readonly NavItem[] };

export const GROUP_HREFS: readonly { label: string; hrefs: readonly NavItem["href"][] }[] = [
  { label: "Overview", hrefs: ["/os"] },
  { label: "Delivery", hrefs: ["/os/projects", "/os/my-tasks", "/os/timeline"] },
  { label: "Quality", hrefs: ["/os/documents", "/os/testing"] },
  { label: "Company", hrefs: ["/os/team", "/os/reports", "/os/activity"] },
];

export const NAV_GROUPS: readonly NavGroup[] = GROUP_HREFS.map((group) => ({
  label: group.label,
  // map-then-filter, not filter-on-PRIMARY_NAV: this keeps the order declared
  // above rather than silently inheriting PRIMARY_NAV's.
  items: group.hrefs.map((href) => BY_HREF.get(href)).filter((navItem) => navItem !== undefined),
}));

/** Sections whose pages are delivered in later phases; the placeholder route renders for these only. */
export const PLANNED_SECTIONS: Readonly<Record<string, { label: string; phase: number }>> = {
  "my-tasks": { label: "My Tasks", phase: 4 },
  timeline: { label: "Timeline", phase: 5 },
  documents: { label: "Documents", phase: 7 },
  testing: { label: "Testing", phase: 6 },
  reports: { label: "Reports", phase: 9 },
  activity: { label: "Activity", phase: 4 },
};

export function isActive(pathname: string, item: Pick<NavItem, "href" | "exact">): boolean {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
