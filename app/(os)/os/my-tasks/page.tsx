import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Columns3,
  Hourglass,
  List,
  ListTodo,
  Table2,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BarList } from "@/components/os/charts";
import { EmptyState } from "@/components/os/empty-state";
import { ErrorState } from "@/components/os/error-state";
import { StatRow, StatTile } from "@/components/os/metrics";
import { MonthCalendar, type CalendarItem } from "@/components/os/month-calendar";
import { oversees } from "@/components/os/nav-audience";
import { PageBody, PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { listProjectOptions, listTeamsByProject } from "@/features/projects/queries";
import { AssignTaskDialog } from "@/features/tasks/components/assign-task-dialog.client";
import { KanbanBoard } from "@/features/tasks/components/kanban-board.client";
import { MyTaskList } from "@/features/tasks/components/my-task-list.client";
import { StatusGlyph } from "@/features/tasks/components/task-line";
import { TaskTable } from "@/features/tasks/components/task-table.client";
import { taskHref, taskRef } from "@/features/tasks/links";
import { listMyCompletedTasks, listMyTasks } from "@/features/tasks/queries";
import { TASK_STATUSES, TASK_STATUS_META, type TaskStatus } from "@/features/tasks/schemas";
import { dayKey, monthGrid, monthParam, parseMonth } from "@/features/timeline/calendar";
import { describeQueryFailure } from "@/lib/actions/db-errors";
import { requireViewer } from "@/lib/auth/context";
import { requestTime } from "@/lib/request-time";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My Tasks" };

const VIEWS = [
  { key: "list", label: "List", icon: List },
  { key: "table", label: "Table", icon: Table2 },
  { key: "board", label: "Board", icon: Columns3 },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
] as const;
type View = (typeof VIEWS)[number]["key"];

const DAY = 86_400_000;
const MONTH_TITLE = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const DONE_AT = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });

const CALENDAR_TONE: Record<TaskStatus, CalendarItem["tone"]> = {
  backlog: "neutral",
  todo: "neutral",
  in_progress: "brand",
  review: "review",
  testing: "review",
  done: "success",
};

/**
 * My Tasks (docs/features/tasks.md): everything this person owes, across every
 * project, four ways — a list grouped by when it is due, a table to sort and
 * filter, a board to move work along, and a calendar. Every task opens its
 * own page. Managers and org admins can also hand out work from here.
 */
export default async function MyTasksPage({ searchParams }: PageProps<"/os/my-tasks">) {
  const [viewer, query] = await Promise.all([requireViewer(), searchParams]);
  const view: View = VIEWS.some((candidate) => candidate.key === query.view) ? (query.view as View) : "list";
  const canAssign = oversees({ orgRole: viewer.orgRole, projectRoles: viewer.projectRoles });
  const timeZone = viewer.profile.timezone || "UTC";

  const [tasks, completed, projects, teams] = await Promise.all([
    listMyTasks(viewer.userId),
    listMyCompletedTasks(viewer.userId, 30),
    canAssign ? listProjectOptions(viewer.organizationId) : Promise.resolve({ data: [], error: null }),
    canAssign ? listTeamsByProject(viewer.organizationId) : Promise.resolve(new Map()),
  ]);

  if (tasks.error) {
    logger.error("my_tasks.failed", { code: tasks.error.code, message: tasks.error.message });
    return (
      <PageBody>
        <PageHeader title="My Tasks" />
        <ErrorState {...describeQueryFailure(tasks.error)} />
      </PageBody>
    );
  }

  const assignDialog = canAssign ? (
    <AssignTaskDialog
      projects={(projects.data ?? []).map((project) => ({ id: project.id, key: project.key, name: project.name }))}
      teams={Object.fromEntries(
        [...(teams as Map<string, { userId: string; fullName: string }[]>).entries()].map(([projectId, people]) => [
          projectId,
          people.map((person) => ({ userId: person.userId, fullName: person.fullName })),
        ]),
      )}
    />
  ) : undefined;

  const open = tasks.data.filter((task) => task.project);
  const done = (completed.data ?? []).filter((task) => task.project);
  const now = requestTime();
  const today = dayKey(now, timeZone);
  const overdue = open.filter((task) => task.due_at && Date.parse(task.due_at) < now).length;
  const dueToday = open.filter(
    (task) => task.due_at && Date.parse(task.due_at) >= now && dayKey(task.due_at, timeZone) === today,
  ).length;
  const dueWeek = open.filter(
    (task) => task.due_at && Date.parse(task.due_at) >= now && Date.parse(task.due_at) < now + 7 * DAY,
  ).length;
  const notAccepted = open.filter((task) => !task.accepted_at).length;
  const doneThisWeek = done.filter(
    (task) => task.completed_at && Date.parse(task.completed_at) >= now - 7 * DAY,
  ).length;
  const inProgress = open.filter((task) => task.status === "in_progress").length;

  const header = (
    <PageHeader
      title="My Tasks"
      description={
        open.length === 0
          ? "Nothing open. Work assigned to you shows up here."
          : `${open.length} open across ${new Set(open.map((task) => task.project!.key)).size} project${new Set(open.map((task) => task.project!.key)).size === 1 ? "" : "s"}${overdue > 0 ? ` · ${overdue} overdue` : ""}`
      }
      actions={assignDialog}
    />
  );

  if (open.length === 0 && done.length === 0) {
    return (
      <PageBody>
        {header}
        <EmptyState
          icon={CheckCircle2}
          title="Nothing on your plate"
          description="Work assigned to you appears here, grouped by when it is due."
          action={assignDialog}
        />
      </PageBody>
    );
  }

  const byProject = [...new Map(open.map((task) => [task.project!.key, task.project!.name])).entries()].map(
    ([key, name]) => ({
      key,
      label: key,
      title: name,
      value: open.filter((task) => task.project!.key === key).length,
    }),
  );
  const next = [...open]
    .filter((task) => task.due_at)
    .sort((a, b) => a.due_at!.localeCompare(b.due_at!))
    .slice(0, 3);

  return (
    <PageBody>
      {header}

      <StatRow>
        <StatTile
          label="Open"
          value={open.length}
          hint={`${inProgress} in progress`}
          icon={ListTodo}
          tone="brand"
          href="/os/my-tasks?view=table"
        />
        <StatTile
          label="Overdue"
          value={overdue}
          hint={overdue === 0 ? "Nothing late" : "Past the deadline"}
          icon={AlertTriangle}
          tone={overdue > 0 ? "danger" : "neutral"}
        />
        <StatTile
          label="Due today"
          value={dueToday}
          hint={`${dueWeek} in the next 7 days`}
          icon={CalendarClock}
          tone={dueToday > 0 ? "warning" : "neutral"}
          href="/os/my-tasks?view=calendar"
        />
        <StatTile
          label="Not accepted"
          value={notAccepted}
          hint={notAccepted === 0 ? "All picked up" : "Accept so your manager knows"}
          icon={Hourglass}
          tone={notAccepted > 0 ? "warning" : "neutral"}
        />
        <StatTile
          label="Done this week"
          value={doneThisWeek}
          hint={`${done.length} in the last 30 days`}
          icon={CheckCircle2}
          tone="success"
        />
      </StatRow>

      <nav aria-label="Views" className="flex w-fit gap-1 rounded-lg border border-border bg-surface p-1">
        {VIEWS.map((candidate) => (
          <Link
            key={candidate.key}
            href={candidate.key === "list" ? "/os/my-tasks" : `/os/my-tasks?view=${candidate.key}`}
            aria-current={view === candidate.key ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
              view === candidate.key ? "bg-bg-subtle font-medium text-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            <candidate.icon className="size-4" aria-hidden="true" />
            {candidate.label}
          </Link>
        ))}
      </nav>

      {view === "list" ? (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
            {open.length === 0 ? (
              <EmptyState
                variant="well"
                icon={CheckCircle2}
                title="Nothing open"
                description="Everything assigned to you is done."
              />
            ) : (
              <MyTaskList
                tasks={open.map((task) => ({
                  id: task.id,
                  seq: task.seq,
                  title: task.title,
                  status: task.status,
                  priority: task.priority,
                  dueAt: task.due_at,
                  acceptedAt: task.accepted_at,
                  project: task.project!,
                }))}
              />
            )}
          </div>
          <aside className="flex flex-col gap-5">
            <Panel title="Up next" description="Your three nearest deadlines">
              {next.length === 0 ? (
                <p className="text-sm text-fg-muted">No deadlines set.</p>
              ) : (
                <ol className="flex flex-col gap-2.5">
                  {next.map((task, index) => (
                    <li
                      key={task.id}
                      className="relative flex items-start gap-3 rounded-md border border-border p-3 hover:bg-bg-subtle"
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-xs font-semibold text-brand">
                        {index + 1}
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <Link
                          href={taskHref(task.project!.key, task.seq)}
                          className="truncate text-sm font-medium after:absolute after:inset-0 hover:underline"
                        >
                          {task.title}
                        </Link>
                        <span className="text-xs text-fg-subtle">
                          <span className="font-mono">{taskRef(task.project!.key, task.seq)}</span> ·{" "}
                          {DONE_AT.format(new Date(task.due_at!))}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
            {byProject.length > 1 ? (
              <Panel title="Open work by project">
                <BarList caption="Open tasks by project" labelHeading="Project" valueHeading="Tasks" data={byProject} />
              </Panel>
            ) : null}
            <Panel title="By status">
              <BarList
                caption="Open tasks by status"
                labelHeading="Status"
                valueHeading="Tasks"
                data={TASK_STATUSES.filter((status) => status !== "done").map((status) => ({
                  key: status,
                  label: TASK_STATUS_META[status].label,
                  value: open.filter((task) => task.status === status).length,
                }))}
              />
            </Panel>
            <Panel title="Recently completed" description="Last 30 days">
              {done.length === 0 ? (
                <p className="text-sm text-fg-muted">Nothing finished yet this month.</p>
              ) : (
                <ul className="-my-1 flex flex-col divide-y divide-border">
                  {done.slice(0, 8).map((task) => (
                    <li key={task.id} className="relative flex items-center gap-2.5 py-2 text-sm">
                      <StatusGlyph status="done" />
                      <Link
                        href={taskHref(task.project!.key, task.seq)}
                        className="min-w-0 flex-1 truncate text-fg-muted after:absolute after:inset-0 hover:underline"
                      >
                        {task.title}
                      </Link>
                      <span className="shrink-0 text-xs text-fg-subtle">
                        {DONE_AT.format(new Date(task.completed_at!))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </aside>
        </div>
      ) : null}

      {view === "table" ? (
        <TaskTable
          tasks={[...open, ...done].map((task) => ({ ...task, project: task.project! }))}
          viewerUserId={viewer.userId}
          canManage={false}
          initialFilter={{ status: "open" }}
          initialGroup="project"
          groupOptions={["none", "project", "status", "priority"]}
        />
      ) : null}

      {view === "board" ? (
        <KanbanBoard
          tasks={[
            ...open,
            ...done.filter((task) => task.completed_at && Date.parse(task.completed_at) >= now - 7 * DAY),
          ].map((task) => ({
            ...task,
            project: task.project!,
          }))}
          team={[]}
          viewerUserId={viewer.userId}
          canManage={false}
          canCreate={false}
        />
      ) : null}

      {view === "calendar" ? (
        <MyCalendar tasks={[...open, ...done]} query={query} timeZone={timeZone} now={now} />
      ) : null}
    </PageBody>
  );
}

function MyCalendar({
  tasks,
  query,
  timeZone,
  now,
}: {
  tasks: readonly {
    id: string;
    seq: number;
    title: string;
    status: TaskStatus;
    due_at: string | null;
    project: { key: string; name: string } | null;
  }[];
  query: Record<string, string | string[] | undefined>;
  timeZone: string;
  now: number;
}) {
  const today = dayKey(now, timeZone);
  const current = parseMonth(typeof query.month === "string" ? query.month : null) ?? {
    year: Number(today.slice(0, 4)),
    month: Number(today.slice(5, 7)) - 1,
  };
  const items = new Map<string, CalendarItem[]>();
  for (const task of tasks) {
    if (!task.due_at || !task.project) continue;
    const day = dayKey(task.due_at, timeZone);
    const late = task.status !== "done" && Date.parse(task.due_at) < now;
    items.set(day, [
      ...(items.get(day) ?? []),
      {
        id: task.id,
        label: task.title,
        prefix: taskRef(task.project.key, task.seq),
        href: taskHref(task.project.key, task.seq),
        kind: "task",
        tone: late ? "danger" : CALENDAR_TONE[task.status],
      },
    ]);
  }
  const base = "/os/my-tasks?view=calendar";
  return (
    <MonthCalendar
      title={MONTH_TITLE.format(new Date(Date.UTC(current.year, current.month, 1)))}
      days={monthGrid(current.year, current.month)}
      items={items}
      today={today}
      prevHref={`${base}&month=${monthParam(current.year, current.month - 1)}`}
      nextHref={`${base}&month=${monthParam(current.year, current.month + 1)}`}
      todayHref={base}
    />
  );
}
