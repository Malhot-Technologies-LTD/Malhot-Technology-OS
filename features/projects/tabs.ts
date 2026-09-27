import {
  Activity,
  CalendarDays,
  ChartGantt,
  Columns3,
  FileText,
  Flag,
  LayoutDashboard,
  ListChecks,
  ListTodo,
  Settings,
  Target,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * The pages inside a project, in tab order. One definition for the tab bar,
 * the command palette and the breadcrumbs, so a page cannot exist in one and be
 * missing from another.
 *
 * Ordered by how often people reach for them: the work itself first, then how
 * it is going, then the plan, then the people and paperwork, then settings.
 */
export type ProjectTab = { slug: string; label: string; icon: LucideIcon; keywords: string };

export const PROJECT_TABS: readonly ProjectTab[] = [
  { slug: "", label: "Overview", icon: LayoutDashboard, keywords: "summary details home" },
  { slug: "tasks", label: "Tasks", icon: ListTodo, keywords: "list work todo" },
  { slug: "board", label: "Board", icon: Columns3, keywords: "kanban columns drag" },
  { slug: "progress", label: "Progress", icon: TrendingUp, keywords: "burnup analytics charts stats" },
  { slug: "timeline", label: "Timeline", icon: ChartGantt, keywords: "gantt schedule roadmap" },
  { slug: "calendar", label: "Calendar", icon: CalendarDays, keywords: "month deadlines dates" },
  { slug: "milestones", label: "Milestones", icon: Flag, keywords: "deadlines checkpoints" },
  { slug: "goals", label: "Goals", icon: Target, keywords: "objectives success" },
  { slug: "mvp", label: "MVP", icon: ListChecks, keywords: "scope features minimum viable" },
  { slug: "documents", label: "Documents", icon: FileText, keywords: "files uploads docs" },
  { slug: "team", label: "Team", icon: Users, keywords: "people members roles workload" },
  { slug: "activity", label: "Activity", icon: Activity, keywords: "feed history log" },
  { slug: "settings", label: "Settings", icon: Settings, keywords: "edit details archive status" },
];

export function projectHref(key: string, slug = ""): string {
  return slug ? `/os/projects/${key}/${slug}` : `/os/projects/${key}`;
}

export const PROJECT_TAB_LABELS: Readonly<Record<string, string>> = Object.fromEntries(
  PROJECT_TABS.filter((tab) => tab.slug).map((tab) => [tab.slug, tab.label]),
);
