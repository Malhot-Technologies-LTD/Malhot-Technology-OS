import { CheckCircle2, Flag, Gauge, ListChecks, Timer, TrendingUp } from "lucide-react";
import type { Metadata } from "next";

import { BarList, LineChart } from "@/components/os/charts";
import { ProgressBar } from "@/components/os/data-display";
import { ErrorState } from "@/components/os/error-state";
import { ProgressRing, StatRow, StatTile } from "@/components/os/metrics";
import { MiniProgress, Panel, PanelLink } from "@/components/os/panel";
import { GoalStatusBadge, StatusPill } from "@/components/os/status-badge";
import { UserAvatar } from "@/components/os/user-menu.client";
import {
  HEALTH_META,
  burnup,
  flowStats,
  projectHealth,
  statusCounts,
  taskTotals,
  workload,
} from "@/features/projects/insights";
import { milestoneScopes } from "@/features/projects/milestones";
import { projectHref } from "@/features/projects/tabs";
import { loadPlanning, loadTasks, loadWorkspace } from "@/features/projects/workspace";
import { TASK_STATUSES, TASK_STATUS_META } from "@/features/tasks/schemas";
import { describeQueryFailure } from "@/lib/actions/db-errors";
import type { Priority } from "@/types/domain";

export const metadata: Metadata = { title: "Progress" };

const weekLabel = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const PRIORITIES: readonly Priority[] = ["urgent", "high", "medium", "low"];
const PRIORITY_LABEL: Record<Priority, string> = { urgent: "Urgent", high: "High", medium: "Medium", low: "Low" };

/**
 * How the project is going, in numbers: how much is done, whether the work is
 * outrunning the scope, how fast things finish, and where progress stands on
 * each goal, the MVP and the milestones.
 */
export default async function ProjectProgressPage({ params }: PageProps<"/os/projects/[key]/progress">) {
  const { key } = await params;
  const workspace = await loadWorkspace(key);
  if (workspace.kind !== "ok") return null;
  const { project, now } = workspace;

  const [tasks, planning] = await Promise.all([loadTasks(project.id), loadPlanning(project.id)]);
  if (tasks.error) return <ErrorState {...describeQueryFailure(tasks.error)} />;

  const all = tasks.data ?? [];
  const totals = taskTotals(all, now);
  const flow = flowStats(all, now);
  const health = projectHealth({ status: project.status, targetEndDate: project.target_end_date, totals, now });
  const series = burnup(all, now, 10);
  const counts = statusCounts(all);
  const people = workload(all, now);
  const open = all.filter((task) => task.status !== "done");
  const mvpLive = planning.mvpItems.filter((item) => item.status !== "dropped");
  const mvpDone = mvpLive.filter((item) => item.status === "done").length;
  const reached = planning.milestones.filter((milestone) => milestone.completed_at).length;
  const base = projectHref(project.key);
  const maxLoad = Math.max(1, ...people.map((person) => person.open));
  const scopes = milestoneScopes(planning.milestones, all);

  return (
    <>
      <StatRow>
        <StatTile
          label="Complete"
          value={`${totals.percent}%`}
          hint={`${totals.done} of ${totals.total} tasks`}
          icon={TrendingUp}
          tone="brand"
        />
        <StatTile
          label="Done this week"
          value={flow.doneThisWeek}
          hint={`${flow.weeklyThroughput} a week on average`}
          icon={CheckCircle2}
          tone="success"
        />
        <StatTile
          label="Time to done"
          value={flow.medianDaysToDone === null ? "—" : `${flow.medianDaysToDone}d`}
          hint="Median, last 60 days"
          icon={Timer}
        />
        <StatTile label="New scope" value={flow.createdLastTwoWeeks} hint="Tasks added in 14 days" icon={ListChecks} />
        <StatTile
          label="Health"
          value={health ? HEALTH_META[health.health].label : "—"}
          hint={health ? health.reason : "Only running projects have a health"}
          icon={Gauge}
          tone={
            health
              ? health.health === "on_track"
                ? "success"
                : health.health === "at_risk"
                  ? "warning"
                  : "danger"
              : "neutral"
          }
        />
      </StatRow>

      <div className="grid items-start gap-5 xl:grid-cols-3">
        <Panel
          title="Burn-up"
          description="All tasks vs finished tasks at the end of each week. A widening gap means scope is growing faster than work is finishing."
          className="xl:col-span-2"
        >
          <LineChart
            caption="Cumulative tasks created and completed per week"
            labels={series.map((point) => {
              const label = weekLabel.format(new Date(point.start));
              return {
                key: String(point.start),
                label,
                tooltip: `Week of ${label}: ${point.done} done of ${point.created}`,
              };
            })}
            series={[
              {
                key: "done",
                label: "Done",
                values: series.map((point) => point.done),
                strokeClass: "stroke-brand",
                swatchClass: "bg-brand",
              },
              {
                key: "scope",
                label: "All tasks",
                values: series.map((point) => point.created),
                strokeClass: "stroke-fg-subtle",
                swatchClass: "bg-fg-subtle",
                dashed: true,
              },
            ]}
          />
        </Panel>
        <Panel title="Overall" description="Tasks finished out of all tasks">
          <ProgressRing done={totals.done} total={totals.total} label="Tasks done" className="py-2" />
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <ProgressBar done={mvpDone} total={mvpLive.length} label="MVP items done" />
            <ProgressBar done={reached} total={planning.milestones.length} label="Milestones reached" />
            <ProgressBar
              done={planning.goals.filter((goal) => goal.status === "achieved").length}
              total={planning.goals.filter((goal) => goal.status !== "dropped").length}
              label="Goals achieved"
            />
          </div>
        </Panel>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="By status" description={`${totals.total} tasks`}>
          <BarList
            caption="Tasks by status"
            labelHeading="Status"
            valueHeading="Tasks"
            data={TASK_STATUSES.map((status) => ({
              key: status,
              label: TASK_STATUS_META[status].label,
              value: counts[status],
            }))}
          />
        </Panel>
        <Panel title="Open work by priority" description={`${open.length} open`}>
          <BarList
            caption="Open tasks by priority"
            labelHeading="Priority"
            valueHeading="Tasks"
            data={PRIORITIES.map((priority) => ({
              key: priority,
              label: PRIORITY_LABEL[priority],
              value: open.filter((task) => task.priority === priority).length,
            }))}
          />
        </Panel>
        <Panel
          title="Load by person"
          description="Open work; red is overdue"
          action={<PanelLink href={`${base}/team`}>Team</PanelLink>}
        >
          {people.length === 0 ? (
            <p className="text-sm text-fg-muted">No tasks yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {people.map((person) => (
                <li key={person.userId ?? "none"} className="flex items-center gap-3 text-sm">
                  <UserAvatar name={person.fullName} avatarUrl={person.avatarUrl} className="size-6" />
                  <span className="w-24 shrink-0 truncate">{person.fullName}</span>
                  <span
                    className="flex h-2 flex-1 overflow-hidden rounded-full bg-bg-subtle"
                    role="img"
                    aria-label={`${person.open} open, ${person.overdue} overdue, ${person.done} done`}
                  >
                    <span
                      className="h-full bg-status-danger-fg"
                      style={{ width: `${(person.overdue / maxLoad) * 100}%` }}
                    />
                    <span
                      className="h-full bg-brand"
                      style={{ width: `${((person.open - person.overdue) / maxLoad) * 100}%` }}
                    />
                  </span>
                  <span className="w-14 shrink-0 text-right text-xs text-fg-muted tabular-nums">
                    {person.open} open
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Panel
          title="Goals"
          description="Each goal's MVP items, done of planned"
          action={<PanelLink href={`${base}/goals`}>Goals</PanelLink>}
        >
          {planning.goals.length === 0 ? (
            <p className="text-sm text-fg-muted">No goals yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {planning.goals.map((goal) => {
                const items = planning.mvpItems.filter((item) => item.goal_id === goal.id && item.status !== "dropped");
                const done = items.filter((item) => item.status === "done").length;
                return (
                  <li
                    key={goal.id}
                    className="grid grid-cols-[minmax(0,1fr)_8rem_auto] items-center gap-3 py-2.5 text-sm first:pt-0"
                  >
                    <span className="truncate font-medium" title={goal.title}>
                      {goal.title}
                    </span>
                    {items.length === 0 ? (
                      <span className="text-xs text-fg-subtle">No MVP items</span>
                    ) : (
                      <MiniProgress done={done} total={items.length} label={`${goal.title} MVP items`} />
                    )}
                    <GoalStatusBadge status={goal.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        <Panel title="Milestones" action={<PanelLink href={`${base}/milestones`}>Milestones</PanelLink>}>
          {planning.milestones.length === 0 ? (
            <p className="text-sm text-fg-muted">No milestones yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {planning.milestones.map((milestone) => {
                const due = scopes.get(milestone.id) ?? [];
                const done = due.filter((task) => task.status === "done").length;
                return (
                  <li
                    key={milestone.id}
                    className="grid grid-cols-[auto_minmax(0,1fr)_8rem_auto] items-center gap-3 py-2.5 text-sm first:pt-0"
                  >
                    <Flag
                      className={milestone.completed_at ? "size-4 text-status-success-fg" : "size-4 text-fg-subtle"}
                      aria-hidden="true"
                    />
                    <span className="truncate font-medium">{milestone.title}</span>
                    {due.length === 0 ? (
                      <span className="text-xs text-fg-subtle">No tasks in its window</span>
                    ) : (
                      <MiniProgress done={done} total={due.length} label={`Tasks due by ${milestone.title}`} />
                    )}
                    {milestone.completed_at ? (
                      <StatusPill tone="success">Reached</StatusPill>
                    ) : (
                      <StatusPill tone="neutral">Open</StatusPill>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
