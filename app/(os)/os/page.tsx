import { AlertTriangle, CalendarClock, CheckCircle2, FolderKanban, ListTodo, Plus, Rocket } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BarList, ColumnChart } from "@/components/os/charts";
import { DueDate, ProjectKey } from "@/components/os/data-display";
import { EmptyState } from "@/components/os/empty-state";
import { ErrorState } from "@/components/os/error-state";
import { StatRow, StatTile } from "@/components/os/metrics";
import { PageBody, PageHeader } from "@/components/os/page-header";
import { Panel, PanelLink } from "@/components/os/panel";
import { ProjectStatusBadge } from "@/components/os/status-badge";
import { UserAvatar } from "@/components/os/user-menu.client";
import { Button } from "@/components/ui/button";
import { getDashboardData } from "@/features/dashboard/queries";
import { computeDashboardStats, type DashboardStats } from "@/features/dashboard/stats";
import { Countdown } from "@/features/tasks/components/countdown.client";
import { taskHref, taskRef } from "@/features/tasks/links";
import { TASK_STATUS_META } from "@/features/tasks/schemas";
import { describeQueryFailure } from "@/lib/actions/db-errors";
import { requireViewer, type Viewer } from "@/lib/auth/context";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Home" };

const weekLabel = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const shortWeekLabel = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "numeric", timeZone: "UTC" });

/**
 * Home (docs/features/dashboard.md): the state of the work, at a glance.
 *
 * Figures first, because they are what someone opening the OS wants to know —
 * how much is open, what is late, what is moving. Then the two charts that say
 * whether the work is flowing, then the lists to act on. Everything is scoped
 * by RLS to what the viewer can see, so an admin reads the company and a
 * developer reads their projects, from the same page.
 */
export default async function DashboardPage({ searchParams }: PageProps<"/os">) {
  const [viewer, params] = await Promise.all([requireViewer(), searchParams]);
  // Set by invitation acceptance, so a newcomer is told where they landed.
  const justJoined = params.welcome === "1";
  const { tasks, projects, now } = await getDashboardData(viewer.organizationId);
  const { greeting, today } = localDate(viewer);
  const firstName = viewer.profile.fullName.split(" ")[0] || "there";
  const canCreate = can(viewer, "project.create");

  const header = (
    <PageHeader
      eyebrow={today}
      title={`${greeting}, ${firstName}`}
      description={
        justJoined
          ? `You are in ${viewer.organization.name}. Complete your profile so teammates recognise you.`
          : undefined
      }
      actions={
        <>
          <Button asChild variant="outline">
            <Link href="/os/my-tasks">My tasks</Link>
          </Button>
          {canCreate ? (
            <Button asChild>
              <Link href="/os/projects/new">
                <Plus aria-hidden="true" /> New project
              </Link>
            </Button>
          ) : null}
        </>
      }
    />
  );

  const failure = tasks.error ?? projects.error;
  if (failure || !tasks.data || !projects.data) {
    return (
      <PageBody>
        {header}
        {failure ? <ErrorState {...describeQueryFailure(failure)} /> : null}
      </PageBody>
    );
  }

  if (projects.data.length === 0) {
    return (
      <PageBody>
        {header}
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description={
            canCreate
              ? "Everything in the OS hangs off a project: goals, tasks, documents. Create one and this page fills in."
              : "Ask an owner or admin to add you to a project."
          }
          action={
            canCreate ? (
              <Button asChild>
                <Link href="/os/projects/new">Create a project</Link>
              </Button>
            ) : undefined
          }
        />
      </PageBody>
    );
  }

  const stats = computeDashboardStats(tasks.data, projects.data, viewer.userId, now);

  return (
    <PageBody>
      {header}

      <StatRow>
        <StatTile
          label="Open tasks"
          value={stats.openTasks}
          hint={`${stats.mine} assigned to you`}
          icon={ListTodo}
          href="/os/my-tasks"
        />
        <StatTile
          label="Overdue"
          value={stats.overdue}
          hint={stats.overdue === 0 ? "Every deadline still holds" : "Past their deadline"}
          icon={AlertTriangle}
          tone={stats.overdue > 0 ? "danger" : "neutral"}
        />
        <StatTile
          label="Due in 7 days"
          value={stats.dueSoon}
          hint={stats.dueSoon === 0 ? "Nothing due this week" : "Coming up"}
          icon={CalendarClock}
          tone={stats.dueSoon > 0 ? "warning" : "neutral"}
        />
        <StatTile
          label="Done this week"
          value={stats.completedThisWeek}
          delta={completedDelta(stats)}
          hint="vs the week before"
          icon={CheckCircle2}
          tone="success"
        />
        <StatTile
          label="Active projects"
          value={stats.activeProjects}
          hint={`${stats.planningProjects} in planning`}
          icon={Rocket}
          tone="brand"
          href="/os/projects"
        />
      </StatRow>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel
          title="Tasks completed per week"
          description="Last 8 weeks, weeks starting Monday"
          className="xl:col-span-2"
        >
          <ColumnChart
            caption="Tasks completed per week, last 8 weeks"
            valueHeading="Completed"
            data={stats.weeks.map((week) => {
              const label = weekLabel.format(new Date(week.start));
              return {
                key: week.start,
                label,
                shortLabel: shortWeekLabel.format(new Date(week.start)),
                value: week.completed,
                tooltip: `Week of ${label}: ${week.completed} completed, ${week.created} created`,
              };
            })}
          />
        </Panel>
        <Panel title="Open tasks by status" description={`${stats.openTasks} open in total`}>
          <BarList
            caption="Open tasks by status"
            labelHeading="Status"
            valueHeading="Tasks"
            data={stats.byStatus.map((row) => ({
              key: row.status,
              label: TASK_STATUS_META[row.status].label,
              value: row.count,
            }))}
          />
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        <Panel
          title="Your next deadlines"
          className="xl:col-span-2"
          action={<PanelLink href="/os/my-tasks">All my tasks</PanelLink>}
        >
          {stats.myNext.length === 0 ? (
            <EmptyState
              variant="well"
              icon={CheckCircle2}
              title="Nothing assigned to you"
              description="Open work assigned to you shows here, soonest first."
            />
          ) : (
            <ul className="-my-1 flex flex-col divide-y divide-border">
              {stats.myNext.map((task) => {
                const meta = TASK_STATUS_META[task.status];
                return (
                  <li key={task.id} className="relative flex items-center gap-3 py-2.5">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <Link
                        href={task.project ? taskHref(task.project.key, task.seq) : "/os/my-tasks"}
                        className="truncate text-sm font-medium after:absolute after:inset-0 hover:underline"
                        title={task.title}
                      >
                        {task.title}
                      </Link>
                      <span className="truncate text-xs text-fg-subtle">
                        {task.project ? <span className="font-mono">{taskRef(task.project.key, task.seq)}</span> : null}{" "}
                        · {meta.label}
                      </span>
                    </div>
                    <span className="shrink-0 text-right text-[13px]">
                      {task.due_at ? (
                        <Countdown dueAt={task.due_at} className="font-medium" />
                      ) : (
                        <span className="text-fg-subtle">No deadline</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          title="Projects"
          className="xl:col-span-3"
          action={<PanelLink href="/os/projects">All projects</PanelLink>}
        >
          <ProjectTable projects={stats.projects} />
        </Panel>
      </div>

      <Panel title="Team load" description="Open work per person across the projects you can see, most overdue first">
        {stats.people.length === 0 ? (
          <EmptyState
            variant="well"
            title="No assigned work"
            description="When tasks have owners, each person's load shows here."
          />
        ) : (
          <TeamLoad people={stats.people} />
        )}
      </Panel>
    </PageBody>
  );
}

function completedDelta(stats: DashboardStats): { text: string; direction: "good" | "bad" | "flat" } {
  const change = stats.completedThisWeek - stats.completedLastWeek;
  if (change === 0) return { text: "±0", direction: "flat" };
  return { text: change > 0 ? `+${change}` : `${change}`, direction: change > 0 ? "good" : "bad" };
}

function ProjectTable({ projects }: { projects: DashboardStats["projects"] }) {
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[34rem] text-sm">
        <thead>
          <tr className="text-left text-xs text-fg-subtle">
            <th scope="col" className="px-1 pb-2 font-medium">
              Project
            </th>
            <th scope="col" className="px-1 pb-2 font-medium">
              Status
            </th>
            <th scope="col" className="w-36 px-1 pb-2 font-medium">
              Progress
            </th>
            <th scope="col" className="px-1 pb-2 text-right font-medium">
              Open
            </th>
            <th scope="col" className="px-1 pb-2 text-right font-medium">
              Overdue
            </th>
            <th scope="col" className="px-1 pb-2 text-right font-medium">
              Target
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {projects.slice(0, 8).map((project) => {
            const percent = project.total === 0 ? 0 : Math.round((project.done / project.total) * 100);
            const open = project.status !== "completed" && project.status !== "archived";
            return (
              <tr key={project.id}>
                <td className="px-1 py-2.5">
                  <Link
                    href={`/os/projects/${project.key}`}
                    className="flex min-w-0 items-center gap-2.5 hover:underline"
                  >
                    <ProjectKey value={project.key} />
                    <span className="truncate font-medium">{project.name}</span>
                  </Link>
                </td>
                <td className="px-1 py-2.5">
                  <ProjectStatusBadge status={project.status} />
                </td>
                <td className="px-1 py-2.5">
                  {project.total === 0 ? (
                    <span className="text-xs text-fg-subtle">No tasks yet</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span
                        className="h-1.5 flex-1 rounded-full bg-bg-subtle"
                        role="img"
                        aria-label={`${project.done} of ${project.total} tasks done`}
                      >
                        <span className="block h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
                      </span>
                      <span className="w-9 text-right text-xs text-fg-muted tabular-nums">{percent}%</span>
                    </span>
                  )}
                </td>
                <td className="px-1 py-2.5 text-right tabular-nums">{project.open}</td>
                <td
                  className={
                    project.overdue > 0
                      ? "px-1 py-2.5 text-right font-medium text-status-danger-fg tabular-nums"
                      : "px-1 py-2.5 text-right text-fg-subtle tabular-nums"
                  }
                >
                  {project.overdue}
                </td>
                <td className="px-1 py-2.5 text-right whitespace-nowrap">
                  <DueDate value={project.target_end_date} open={open} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TeamLoad({ people }: { people: DashboardStats["people"] }) {
  const max = Math.max(1, ...people.map((person) => person.open));
  return (
    <ul className="grid gap-x-8 gap-y-3 md:grid-cols-2">
      {people.map((person) => (
        <li key={person.id} className="flex items-center gap-3 text-sm">
          <UserAvatar name={person.fullName} avatarUrl={person.avatarUrl} className="size-7" />
          <span className="w-32 shrink-0 truncate font-medium">{person.fullName}</span>
          <span
            className="flex h-2 flex-1 overflow-hidden rounded-full bg-bg-subtle"
            role="img"
            aria-label={`${person.open} open, ${person.overdue} overdue`}
          >
            <span className="h-full bg-status-danger-fg" style={{ width: `${(person.overdue / max) * 100}%` }} />
            <span className="h-full bg-brand" style={{ width: `${((person.open - person.overdue) / max) * 100}%` }} />
          </span>
          <span className="w-28 shrink-0 text-right text-[13px] text-fg-muted tabular-nums">
            {person.open} open
            {person.overdue > 0 ? <span className="text-status-danger-fg"> · {person.overdue} late</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Greeting and date in the viewer's own timezone, not the server's. An
 * unusable timezone falls back to UTC rather than throwing.
 */
function localDate(viewer: Viewer): { greeting: string; today: string } {
  const timeZone = viewer.profile.timezone || "UTC";
  const now = new Date();
  const format = (options: Intl.DateTimeFormatOptions) => {
    try {
      return new Intl.DateTimeFormat("en-GB", { ...options, timeZone }).format(now);
    } catch {
      return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(now);
    }
  };
  const hour = Number(format({ hour: "numeric", hour12: false }));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return { greeting, today: format({ weekday: "long", day: "numeric", month: "long", year: "numeric" }) };
}
