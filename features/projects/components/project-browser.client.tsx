"use client";

import { Building2, CalendarRange, Flag, FolderKanban, LayoutGrid, List, Search } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { AvatarGroup, type AvatarPerson } from "@/components/os/avatar-group";
import { formatDate } from "@/components/os/data-display";
import { EmptyState } from "@/components/os/empty-state";
import { MiniProgress } from "@/components/os/panel";
import { PROJECT_STATUS, PriorityBadge, ProjectStatusBadge, StatusPill } from "@/components/os/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HEALTH_META, type Health } from "@/features/projects/insights";
import { cn } from "@/lib/utils";
import type { Priority, ProjectKind, ProjectStatus } from "@/types/domain";

export type BrowserProject = {
  id: string;
  key: string;
  name: string;
  kind: ProjectKind;
  status: ProjectStatus;
  priority: Priority;
  clientName: string | null;
  managerName: string | null;
  targetEndDate: string | null;
  updatedAt: string;
  total: number;
  done: number;
  open: number;
  overdue: number;
  percent: number;
  health: { health: Health; reason: string } | null;
  daysLeft: number | null;
  nextMilestone: { title: string; dueDate: string } | null;
  team: AvatarPerson[];
};

type StatusFilter = "all" | "live" | ProjectStatus;
type Sort = "updated" | "target" | "name" | "progress" | "overdue";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "live", label: "In flight" },
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "planning", label: "Planning" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

const VIEW_STORAGE = "malhot.projects.view";

const noSubscription = () => () => {};

function readStoredView(): "grid" | "table" | null {
  try {
    return window.localStorage.getItem(VIEW_STORAGE) === "table" ? "table" : null;
  } catch {
    return null;
  }
}

function matches(project: BrowserProject, status: StatusFilter): boolean {
  if (status === "all") return true;
  if (status === "live") return project.status !== "completed" && project.status !== "archived";
  return project.status === status;
}

/**
 * The project list: what is in flight first, each project with the figures a
 * manager would otherwise have to open it to find — progress, what is late,
 * the next milestone and time left. Cards by default; a dense table for people
 * scanning many projects. The chosen view is remembered in this browser.
 */
export function ProjectBrowser({ projects, canCreate }: { projects: readonly BrowserProject[]; canCreate: boolean }) {
  const [status, setStatus] = useState<StatusFilter>("live");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("updated");
  // The remembered view arrives after hydration; the server always draws cards.
  const stored = useSyncExternalStore(noSubscription, readStoredView, () => null);
  const [chosen, setChosen] = useState<"grid" | "table" | null>(null);
  const view = chosen ?? stored ?? "grid";

  function chooseView(next: "grid" | "table") {
    setChosen(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE, next);
    } catch {
      // A refused write only means the choice is not remembered.
    }
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="No projects yet"
        description="A project holds the goals, MVP, tasks, timeline and documents for one piece of work."
        action={
          canCreate ? (
            <Button asChild>
              <Link href="/os/projects/new">Create your first project</Link>
            </Button>
          ) : undefined
        }
      />
    );
  }

  const needle = query.trim().toLowerCase();
  const visible = projects
    .filter((project) => matches(project, status))
    .filter(
      (project) =>
        !needle ||
        `${project.key} ${project.name} ${project.clientName ?? ""} ${project.managerName ?? ""}`
          .toLowerCase()
          .includes(needle),
    )
    .sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "progress":
          return b.percent - a.percent;
        case "overdue":
          return b.overdue - a.overdue || a.name.localeCompare(b.name);
        case "target":
          return (a.targetEndDate ?? "9999").localeCompare(b.targetEndDate ?? "9999");
        default:
          return b.updatedAt.localeCompare(a.updatedAt);
      }
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <nav aria-label="Filter by status" className="-mx-1 flex max-w-full gap-1 overflow-x-auto px-1">
          {STATUS_TABS.map((tab) => {
            const count = projects.filter((project) => matches(project, tab.value)).length;
            const active = status === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                aria-pressed={active}
                onClick={() => setStatus(tab.value)}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm transition-colors",
                  active
                    ? "border-border-strong bg-surface font-medium text-fg shadow-xs"
                    : "border-transparent text-fg-muted hover:bg-surface hover:text-fg",
                )}
              >
                {tab.label}
                <span className="rounded-full bg-bg-subtle px-1.5 text-[11px] tabular-nums">{count}</span>
              </button>
            );
          })}
        </nav>
        <div className="ml-auto flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative flex-1 sm:w-64 sm:flex-none">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
              aria-hidden="true"
            />
            <Input
              type="search"
              aria-label="Search projects"
              placeholder="Search name, key, client"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sort} onValueChange={(value) => setSort(value as Sort)}>
            <SelectTrigger className="w-44" aria-label="Sort projects">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Recently updated</SelectItem>
              <SelectItem value="target">Target date</SelectItem>
              <SelectItem value="overdue">Most overdue</SelectItem>
              <SelectItem value="progress">Most complete</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border border-border bg-surface p-0.5" role="group" aria-label="View">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-pressed={view === "grid"}
              aria-label="Card view"
              className={cn(view === "grid" && "bg-bg-subtle text-fg")}
              onClick={() => chooseView("grid")}
            >
              <LayoutGrid aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-pressed={view === "table"}
              aria-label="Table view"
              className={cn(view === "table" && "bg-bg-subtle text-fg")}
              onClick={() => chooseView("table")}
            >
              <List aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          variant="well"
          icon={Search}
          title="No projects match"
          description="Try another search or status."
        />
      ) : view === "grid" ? (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {visible.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      ) : (
        <ProjectTable projects={visible} />
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: BrowserProject }) {
  const running = project.status !== "completed" && project.status !== "archived";
  return (
    <article className="group relative flex h-full flex-col rounded-lg border border-border bg-surface transition-[border-color,box-shadow,transform] duration-[160ms] ease-standard hover:-translate-y-0.5 hover:border-border-strong hover:shadow-m">
      <div className="flex items-start gap-3.5 p-5 pb-4">
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-brand/20 bg-brand-subtle font-mono text-[13px] font-semibold text-brand"
        >
          {project.key}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="truncate text-base font-semibold" title={project.name}>
            <Link
              href={`/os/projects/${project.key}`}
              className="after:focus-visible:outline-focus group-hover:underline after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none after:focus-visible:outline-2 after:focus-visible:outline-offset-2"
            >
              {project.name}
            </Link>
          </h3>
          <p className="flex min-w-0 items-center gap-1.5 text-[13px] text-fg-muted">
            <Building2 className="size-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />
            <span className="truncate">
              {project.kind === "job" ? (project.clientName ?? "Client not set") : "Internal"}
              {project.managerName ? ` · ${project.managerName}` : ""}
            </span>
          </p>
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-5 py-4">
        <div className="flex items-center justify-between gap-3 text-[13px]">
          <span className="text-fg-muted">
            {project.total === 0 ? "No tasks yet" : `${project.done} of ${project.total} tasks done`}
          </span>
          {project.health ? (
            <span title={project.health.reason}>
              <StatusPill tone={HEALTH_META[project.health.health].tone} className="h-6 px-2 text-xs">
                {HEALTH_META[project.health.health].label}
              </StatusPill>
            </span>
          ) : null}
        </div>
        <MiniProgress done={project.done} total={project.total} label={`${project.name} tasks done`} />
        <dl className="grid grid-cols-3 gap-2 text-center">
          <Figure label="Open" value={project.open} />
          <Figure label="Overdue" value={project.overdue} tone={project.overdue > 0 ? "danger" : undefined} />
          <Figure
            label={running ? "Days left" : "Target"}
            value={
              running && project.daysLeft !== null
                ? project.daysLeft < 0
                  ? `${Math.abs(project.daysLeft)} over`
                  : project.daysLeft
                : formatDate(project.targetEndDate)
            }
            tone={running && project.daysLeft !== null && project.daysLeft < 0 ? "danger" : undefined}
          />
        </dl>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border px-5 py-3.5 text-[13px]">
        <AvatarGroup people={project.team} max={4} />
        {project.nextMilestone ? (
          <span
            className="flex min-w-0 items-center gap-1.5 text-fg-muted"
            title={`Next milestone: ${project.nextMilestone.title}`}
          >
            <Flag className="size-3.5 shrink-0 text-brand" aria-hidden="true" />
            <span className="truncate">{project.nextMilestone.title}</span>
            <span className="shrink-0 text-fg-subtle">{formatDate(project.nextMilestone.dueDate)}</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-fg-subtle">
            <CalendarRange className="size-3.5" aria-hidden="true" />
            {project.targetEndDate ? `Target ${formatDate(project.targetEndDate)}` : "No target date"}
          </span>
        )}
      </div>
    </article>
  );
}

function Figure({ label, value, tone }: { label: string; value: number | string; tone?: "danger" }) {
  return (
    <div className="rounded-md bg-bg-subtle px-2 py-2">
      <dt className="text-[11px] text-fg-subtle">{label}</dt>
      <dd className={cn("text-base font-semibold tabular-nums", tone === "danger" && "text-status-danger-fg")}>
        {value}
      </dd>
    </div>
  );
}

function ProjectTable({ projects }: { projects: readonly BrowserProject[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[64rem] text-sm">
        <thead className="border-b border-border bg-bg-subtle text-left text-xs text-fg-subtle">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Project
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              Status
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              Health
            </th>
            <th scope="col" className="w-40 px-3 py-2.5 font-medium">
              Progress
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">
              Open
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">
              Overdue
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              Next milestone
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              Team
            </th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">
              Target
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {projects.map((project) => (
            <tr key={project.id} className="group relative hover:bg-bg-subtle">
              <td className="px-4 py-3">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-subtle font-mono text-[11px] font-semibold text-brand">
                    {project.key}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <Link
                      href={`/os/projects/${project.key}`}
                      className="truncate font-medium group-hover:underline after:absolute after:inset-0"
                    >
                      {project.name}
                    </Link>
                    <span className="truncate text-xs text-fg-subtle">
                      {project.kind === "job" ? (project.clientName ?? "Client not set") : "Internal"}
                    </span>
                  </span>
                </span>
              </td>
              <td className="px-3 py-3">
                <ProjectStatusBadge status={project.status} />
              </td>
              <td className="px-3 py-3">
                {project.health ? (
                  <span title={project.health.reason}>
                    <StatusPill tone={HEALTH_META[project.health.health].tone}>
                      {HEALTH_META[project.health.health].label}
                    </StatusPill>
                  </span>
                ) : (
                  <span className="text-fg-subtle">—</span>
                )}
              </td>
              <td className="px-3 py-3">
                {project.total === 0 ? (
                  <span className="text-xs text-fg-subtle">No tasks</span>
                ) : (
                  <MiniProgress done={project.done} total={project.total} label={`${project.name} tasks done`} />
                )}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">{project.open}</td>
              <td
                className={cn(
                  "px-3 py-3 text-right tabular-nums",
                  project.overdue > 0 ? "font-medium text-status-danger-fg" : "text-fg-subtle",
                )}
              >
                {project.overdue}
              </td>
              <td className="max-w-48 px-3 py-3">
                {project.nextMilestone ? (
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{project.nextMilestone.title}</span>
                    <span className="text-xs text-fg-subtle">{formatDate(project.nextMilestone.dueDate)}</span>
                  </span>
                ) : (
                  <span className="text-fg-subtle">—</span>
                )}
              </td>
              <td className="px-3 py-3">
                <AvatarGroup people={project.team} max={3} />
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <span className="flex flex-col items-end">
                  <span>{formatDate(project.targetEndDate)}</span>
                  <PriorityBadgeSmall priority={project.priority} status={project.status} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Priority only matters while work is open; finished projects show their status's colour instead. */
function PriorityBadgeSmall({ priority, status }: { priority: Priority; status: ProjectStatus }) {
  if (status === "completed" || status === "archived")
    return <span className="text-xs text-fg-subtle">{PROJECT_STATUS[status].label}</span>;
  return (
    <span className="mt-1 scale-90">
      <PriorityBadge priority={priority} />
    </span>
  );
}
