import { Plus } from "lucide-react";
import type { Metadata } from "next";

import { ErrorState } from "@/components/os/error-state";
import { MonthCalendar, type CalendarItem } from "@/components/os/month-calendar";
import { Button } from "@/components/ui/button";
import { projectHref } from "@/features/projects/tabs";
import { loadMembers, loadPlanning, loadTasks, loadWorkspace, toAssignable } from "@/features/projects/workspace";
import { NewTaskDialog } from "@/features/tasks/components/new-task-dialog.client";
import { taskHref, taskRef } from "@/features/tasks/links";
import type { TaskStatus } from "@/features/tasks/schemas";
import { dayKey, monthGrid, monthParam, parseMonth } from "@/features/timeline/calendar";
import { describeQueryFailure } from "@/lib/actions/db-errors";

export const metadata: Metadata = { title: "Calendar" };

const MONTH_TITLE = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

const TONE: Record<TaskStatus, CalendarItem["tone"]> = {
  backlog: "neutral",
  todo: "neutral",
  in_progress: "brand",
  review: "review",
  testing: "review",
  done: "success",
};

/** Deadlines and milestones on a month grid, in the viewer's own timezone. */
export default async function ProjectCalendarPage({ params, searchParams }: PageProps<"/os/projects/[key]/calendar">) {
  const [{ key }, query] = await Promise.all([params, searchParams]);
  const workspace = await loadWorkspace(key);
  if (workspace.kind !== "ok") return null;
  const { project, perms, viewer, now } = workspace;
  const timeZone = viewer.profile.timezone || "UTC";

  const [tasks, planning, members] = await Promise.all([
    loadTasks(project.id),
    loadPlanning(project.id),
    perms.createTask ? loadMembers(project.id) : Promise.resolve(null),
  ]);
  if (tasks.error) return <ErrorState {...describeQueryFailure(tasks.error)} />;

  const today = dayKey(now, timeZone);
  const current = parseMonth(typeof query.month === "string" ? query.month : null) ?? {
    year: Number(today.slice(0, 4)),
    month: Number(today.slice(5, 7)) - 1,
  };
  const days = monthGrid(current.year, current.month);
  const base = `${projectHref(project.key)}/calendar`;

  const items = new Map<string, CalendarItem[]>();
  const push = (day: string, item: CalendarItem) => items.set(day, [...(items.get(day) ?? []), item]);

  for (const milestone of planning.milestones)
    push(milestone.due_date, {
      id: `m-${milestone.id}`,
      label: milestone.title,
      href: `${projectHref(project.key)}/milestones/${milestone.id}`,
      kind: "milestone",
      tone: milestone.completed_at ? "success" : "brand",
    });
  if (project.start_date)
    push(project.start_date, {
      id: "start",
      label: "Project starts",
      href: projectHref(project.key),
      kind: "marker",
      tone: "brand",
    });
  if (project.target_end_date)
    push(project.target_end_date, {
      id: "end",
      label: "Target end",
      href: projectHref(project.key),
      kind: "marker",
      tone: "brand",
    });
  for (const task of tasks.data ?? []) {
    if (!task.due_at) continue;
    const late = task.status !== "done" && Date.parse(task.due_at) < now;
    push(dayKey(task.due_at, timeZone), {
      id: task.id,
      label: task.title,
      prefix: taskRef(project.key, task.seq),
      href: taskHref(project.key, task.seq),
      kind: "task",
      tone: late ? "danger" : TONE[task.status],
    });
  }

  const team = members ? toAssignable(members.data) : [];

  return (
    <MonthCalendar
      title={MONTH_TITLE.format(new Date(Date.UTC(current.year, current.month, 1)))}
      days={days}
      items={items}
      today={today}
      prevHref={`${base}?month=${monthParam(current.year, current.month - 1)}`}
      nextHref={`${base}?month=${monthParam(current.year, current.month + 1)}`}
      todayHref={base}
      addFor={
        perms.createTask
          ? (day) => (
              <NewTaskDialog
                projectKey={project.key}
                team={team}
                viewerUserId={viewer.userId}
                canAssignOthers={perms.manageTeam}
                defaultDue={day}
                trigger={
                  <Button variant="ghost" size="icon-sm" className="size-6" aria-label={`Add a task due ${day}`}>
                    <Plus aria-hidden="true" />
                  </Button>
                }
              />
            )
          : undefined
      }
    />
  );
}
