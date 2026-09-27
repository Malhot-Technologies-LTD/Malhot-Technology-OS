import { ChartGantt } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { formatDate } from "@/components/os/data-display";
import { EmptyState } from "@/components/os/empty-state";
import { ErrorState } from "@/components/os/error-state";
import { Gantt, type GanttRow, type GanttTone } from "@/components/os/gantt";
import { Button } from "@/components/ui/button";
import { projectHref } from "@/features/projects/tabs";
import { loadPlanning, loadTasks, loadWorkspace } from "@/features/projects/workspace";
import { taskHref, taskRef } from "@/features/tasks/links";
import { TASK_STATUS_META, type TaskStatus } from "@/features/tasks/schemas";
import { timelineRange, toTime } from "@/features/timeline/scale";
import { describeQueryFailure } from "@/lib/actions/db-errors";

export const metadata: Metadata = { title: "Timeline" };

const STATUS_TONE: Record<TaskStatus, GanttTone> = {
  backlog: "neutral",
  todo: "neutral",
  in_progress: "brand",
  review: "review",
  testing: "review",
  done: "success",
};

/**
 * The project laid out in time: its whole span with milestones on it, then
 * each milestone, then every task from when it started (or was created) to its
 * deadline. Undated work has no place on a timeline and is counted, not drawn.
 */
export default async function ProjectTimelinePage({ params, searchParams }: PageProps<"/os/projects/[key]/timeline">) {
  const [{ key }, query] = await Promise.all([params, searchParams]);
  const workspace = await loadWorkspace(key);
  if (workspace.kind !== "ok") return null;
  const { project, now } = workspace;
  const hideDone = query.done === "hide";

  const [tasks, planning] = await Promise.all([loadTasks(project.id), loadPlanning(project.id)]);
  if (tasks.error) return <ErrorState {...describeQueryFailure(tasks.error)} />;

  const start = toTime(project.start_date);
  const end = toTime(project.target_end_date);
  const dated = (tasks.data ?? []).filter((task) => task.due_at && !(hideDone && task.status === "done"));
  const undated = (tasks.data ?? []).filter((task) => !task.due_at && task.status !== "done").length;

  const moments = [
    start,
    end,
    ...planning.milestones.map((milestone) => toTime(milestone.due_date)),
    ...dated.flatMap((task) => [toTime(task.started_at ?? task.created_at), toTime(task.due_at)]),
  ];
  const range = timelineRange(moments, now);
  const base = projectHref(project.key);

  if (!start && !end && planning.milestones.length === 0 && dated.length === 0) {
    return (
      <EmptyState
        icon={ChartGantt}
        title="Nothing to put on a timeline yet"
        description="Set the project's dates in Settings, add milestones, or give tasks deadlines, and they appear here."
        action={
          <Button asChild variant="outline">
            <Link href={`${base}/settings`}>Set project dates</Link>
          </Button>
        }
      />
    );
  }

  const projectRow: GanttRow[] =
    start || end
      ? [
          {
            kind: "bar",
            id: "project",
            label: project.name,
            sublabel: `${formatDate(project.start_date)} → ${formatDate(project.target_end_date)}`,
            from: start ?? now,
            to: end ?? Math.max(now, start ?? now) + 14 * 86_400_000,
            openEnded: !end,
            tone: "neutral",
            progress:
              (tasks.data ?? []).length === 0
                ? 0
                : (tasks.data ?? []).filter((task) => task.status === "done").length / (tasks.data ?? []).length,
            description: `${project.name}: ${formatDate(project.start_date)} to ${formatDate(project.target_end_date)}`,
            markers: planning.milestones.map((milestone) => ({
              at: toTime(milestone.due_date) ?? now,
              label: milestone.title,
              done: Boolean(milestone.completed_at),
            })),
          },
        ]
      : [];

  const milestoneRows: GanttRow[] = planning.milestones.map((milestone) => ({
    kind: "milestone",
    id: milestone.id,
    label: milestone.title,
    sublabel: milestone.completed_at ? "Reached" : `Due ${formatDate(milestone.due_date)}`,
    href: `${base}/milestones/${milestone.id}`,
    at: toTime(milestone.due_date) ?? now,
    done: Boolean(milestone.completed_at),
    description: `${milestone.title}, due ${formatDate(milestone.due_date)}${milestone.completed_at ? ", reached" : ""}`,
  }));

  const taskRows: GanttRow[] = [...dated]
    .sort((a, b) => (a.started_at ?? a.created_at).localeCompare(b.started_at ?? b.created_at))
    .map((task) => {
      const from = toTime(task.started_at ?? task.created_at) ?? now;
      const due = toTime(task.due_at) ?? now;
      const late = task.status !== "done" && due < now;
      return {
        kind: "bar",
        id: task.id,
        label: task.title,
        sublabel: `${taskRef(project.key, task.seq)} · ${TASK_STATUS_META[task.status].label}${task.assignee ? ` · ${task.assignee.full_name}` : ""}`,
        href: taskHref(project.key, task.seq),
        from,
        to: due,
        tone: late ? "danger" : STATUS_TONE[task.status],
        description: `${taskRef(project.key, task.seq)} ${task.title}: ${formatDate(task.started_at ?? task.created_at)} to ${formatDate(task.due_at)}, ${late ? "overdue" : TASK_STATUS_META[task.status].label.toLowerCase()}`,
      };
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted" aria-label="Legend">
          <Legend className="border-border-strong bg-bg-subtle" label="To do" />
          <Legend className="border-brand bg-brand/85" label="In progress" />
          <Legend className="border-status-review-border bg-status-review-bg" label="Review / testing" />
          <Legend className="border-status-success-border bg-status-success-bg" label="Done" />
          <Legend className="border-status-danger-fg bg-status-danger-bg" label="Overdue" />
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rotate-45 rounded-[1px] border-2 border-brand" aria-hidden="true" /> Milestone
          </li>
        </ul>
        <div className="flex items-center gap-3 text-[13px] text-fg-subtle">
          {undated > 0 ? (
            <span>
              {undated} open task{undated === 1 ? " has" : "s have"} no deadline and {undated === 1 ? "is" : "are"} not
              shown
            </span>
          ) : null}
          <Button asChild variant="outline" size="sm">
            <Link href={hideDone ? `${base}/timeline` : `${base}/timeline?done=hide`}>
              {hideDone ? "Show finished tasks" : "Hide finished tasks"}
            </Link>
          </Button>
        </div>
      </div>
      <Gantt
        range={range}
        now={now}
        caption={`${project.name} timeline`}
        sections={[
          { id: "project", label: "Project", rows: projectRow },
          { id: "milestones", label: `Milestones (${milestoneRows.length})`, rows: milestoneRows },
          { id: "tasks", label: `Tasks (${taskRows.length})`, rows: taskRows },
        ].filter((section) => section.rows.length > 0)}
      />
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={`h-2.5 w-5 rounded-sm border ${className}`} aria-hidden="true" />
      {label}
    </li>
  );
}
