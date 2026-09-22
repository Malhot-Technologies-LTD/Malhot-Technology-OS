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

/** Primary navigation (docs/product/malhot-os.md#navigation). Order matters. */
export type NavItem = { label: string; href: `/os${string}`; icon: LucideIcon; exact?: boolean };

export const PRIMARY_NAV: readonly NavItem[] = [
  { label: "Home", href: "/os", icon: Home, exact: true },
  { label: "Projects", href: "/os/projects", icon: FolderKanban },
  { label: "My Tasks", href: "/os/my-tasks", icon: CheckSquare },
  { label: "Timeline", href: "/os/timeline", icon: CalendarRange },
  { label: "Documents", href: "/os/documents", icon: FileText },
  { label: "Testing", href: "/os/testing", icon: FlaskConical },
  { label: "Team", href: "/os/team", icon: Users },
  { label: "Reports", href: "/os/reports", icon: BarChart3 },
  { label: "Activity", href: "/os/activity", icon: Activity },
];

/** Sections whose pages are delivered in later phases; the placeholder route renders for these only. */
export const PLANNED_SECTIONS: Readonly<Record<string, { label: string; phase: number }>> = {
  "my-tasks": { label: "My Tasks", phase: 4 },
  timeline: { label: "Timeline", phase: 5 },
  documents: { label: "Documents", phase: 7 },
  testing: { label: "Testing", phase: 6 },
  team: { label: "Team", phase: 3 },
  reports: { label: "Reports", phase: 9 },
  activity: { label: "Activity", phase: 4 },
  notifications: { label: "Notifications", phase: 4 },
};

export function isActive(pathname: string, item: NavItem): boolean {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
