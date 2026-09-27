import { AlertTriangle, CalendarClock, CheckCircle2, Circle, Flag, ListTodo, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BarList } from "@/components/os/charts";
import { DueDate, EMPTY, KeyValueList, formatDate } from "@/components/os/data-display";
import { EmptyState } from "@/components/os/empty-state";
import { ErrorState } from "@/components/os/error-state";
import { StatRow, StatTile } from "@/components/os/metrics";
import { Panel, PanelLink } from "@/components/os/panel";
import { GoalStatusBadge, StatusPill } from "@/components/os/status-badge";
import { UserAvatar } from "@/components/os/user-menu.client";
import { ACTIVITY_VERB, buildActivity } from "@/features/projects/activity";
import { HEALTH_META, daysLeft, projectHealth, statusCounts, taskTotals } from "@/features/projects/insights";
import { QuickAdd } from "@/features/projects/components/quick-add.client";
import { readinessItems } from "@/features/projects/readiness";
import { projectRoleLabel } from "@/features/projects/roles";
import { projectHref } from "@/features/projects/tabs";
import { loadMembers, loadPlanning, loadTasks, loadWorkspace } from "@/features/projects/workspace";
import { TaskLine, TaskLines } from "@/features/tasks/components/task-line";
import { TASK_STATUSES, TASK_STATUS_META } from "@/features/tasks/schemas";
import { describeQueryFailure } from "@/lib/actions/db-errors";

export const metadata: Metadata = { title: "Overview" };

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * The project's front page (docs/features/projects.md#project-overview): the
 * figures, what is due next, the plan in brief and who is on it. Every panel
 * links to the tab that holds the whole story, so this page stays a summary.
 */
export default async function ProjectOverviewPage({ params }: PageProps<"/os/projects/[key]">) {
  const { key } = await params;
  const workspace = await loadWorkspace(key);
  if (workspace.kind !== "ok") return null;
  const { project, perms, now } = workspace;

  const [tasks, planning, members] = await Promise.all([
    loadTasks(project.id),
    loadPlanning(project.id),
    loadMembers(project.id),
  ]);
  if (tasks.error) return <ErrorState {...describeQueryFailure(tasks.error)} />;

  const all = tasks.data ?? [];
  const totals = taskTotals(all, now);
  const health = projectHealth({ status: project.status, targetEndDate: project.target_end_date, totals, now });
  const counts = statusCounts(all);
  const nextMilestone = planning.milestones.find((milestone) => !milestone.completed_at) ?? null;
  const upcoming = all
    .filter((task) => task.status !== "done")
    .sort((a, b) => (a.due_at ?? "9999").localeCompare(b.due_at ?? "9999"))
    .slice(0, 7);
  const activity = buildActivity(
    {
      projectKey: project.key,
      tasks: all,
      goals: planning.goals,
      mvpItems: planning.mvpItems,
      milestones: planning.milestones,
      members: members.data ?? [],
    },
    6,
  );
  const readiness = readinessItems({
    goalCount: planning.goals.length,
    mvpCount: planning.mvpItems.length,
    managerId: project.manager?.id ?? null,
    milestoneCount: planning.milestones.length,
    startDate: project.start_date,
  });
  const blocking = readiness.filter((item) => !item.optional && !item.done).length;
  const mvpDone = planning.mvpItems.filter((item) => item.status === "done").length;
  const left = project.target_end_date ? daysLeft(project.target_end_date, now) : null;
  const base = projectHref(project.key);

  return (
    <>
      <StatRow>
        <StatTile
          label="Progress"
          value={`${totals.percent}%`}
          hint={`${totals.done} of ${totals.total} tasks done`}
          icon={TrendingUp}
          tone="brand"
          href={`${base}/progress`}
        />
        <StatTile
          label="Open tasks"
          value={totals.open}
          hint={totals.unassigned > 0 ? `${totals.unassigned} unassigned` : "All have an owner"}
          icon={ListTodo}
          href={`${base}/tasks`}
        />
        <StatTile
          label="Overdue"
          value={totals.overdue}
          hint={totals.overdue === 0 ? "Every deadline holds" : "Past their deadline"}
          icon={AlertTriangle}
          tone={totals.overdue > 0 ? "danger" : "neutral"}
          href={`${base}/tasks?due=overdue`}
        />
        <StatTile
          label="Due in 7 days"
          value={totals.dueSoon}
          hint={totals.dueSoon === 0 ? "Nothing this week" : "Coming up"}
          icon={CalendarClock}
          tone={totals.dueSoon > 0 ? "warning" : "neutral"}
          href={`${base}/calendar`}
        />
        <StatTile
          label="Next milestone"
          value={nextMilestone ? formatDate(nextMilestone.due_date) : EMPTY}
          hint={nextMilestone ? nextMilestone.title : "None scheduled"}
          icon={Flag}
          href={nextMilestone ? `${base}/milestones/${nextMilestone.id}` : `${base}/milestones`}
        />
      </StatRow>

      {project.status === "planning" ? (
        <Panel
          title={
            blocking === 0
              ? "Ready to start"
              : `${blocking} thing${blocking === 1 ? "" : "s"} left before this can start`
          }
          description="A project needs these before it can move from planning to active."
        >
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {readiness.map((item) => (
              <li
                key={item.key}
                className="flex items-center gap-2 rounded-md border border-border bg-bg-subtle px-3 py-2.5 text-sm"
              >
                {item.done ? (
                  <CheckCircle2 className="size-4 shrink-0 text-status-success-fg" aria-hidden="true" />
                ) : (
                  <Circle className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                )}
                <span className={item.done ? "text-fg-muted" : "font-medium"}>{item.label}</span>
                {item.optional ? <span className="ml-auto text-xs text-fg-subtle">optional</span> : null}
                <span className="sr-only">{item.done ? "done" : "not done"}</span>
              </li>
            ))}
          </ul>
          {perms.contribute && (planning.goals.length === 0 || planning.mvpItems.length === 0) ? (
            <div className="grid gap-4 md:grid-cols-2">
              {planning.goals.length === 0 ? <QuickAdd projectKey={project.key} kind="goal" /> : null}
              {planning.mvpItems.length === 0 ? <QuickAdd projectKey={project.key} kind="mvp" /> : null}
            </div>
          ) : null}
        </Panel>
      ) : null}

      <div className="grid items-start gap-5 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-5 xl:col-span-2">
          <Panel
            title="Up next"
            description="Open work, soonest deadline first"
            action={<PanelLink href={`${base}/tasks`}>All tasks</PanelLink>}
          >
            {upcoming.length === 0 ? (
              <EmptyState
                variant="well"
                icon={CheckCircle2}
                title={totals.total === 0 ? "No tasks yet" : "Nothing open"}
                description={
                  totals.total === 0 ? "Add the first task from the Tasks or Board tab." : "Every task here is done."
                }
              />
            ) : (
              <TaskLines>
                {upcoming.map((task) => (
                  <TaskLine key={task.id} task={task} projectKey={project.key} />
                ))}
              </TaskLines>
            )}
          </Panel>

          <div className="grid gap-5 md:grid-cols-2">
            <Panel title="Tasks by status" action={<PanelLink href={`${base}/board`}>Board</PanelLink>}>
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
            <Panel title="Recent activity" action={<PanelLink href={`${base}/activity`}>All activity</PanelLink>}>
              {activity.length === 0 ? (
                <p className="text-sm text-fg-muted">Nothing has happened here yet.</p>
              ) : (
                <ol className="flex flex-col gap-3">
                  {activity.map((event) => (
                    <li key={event.id} className="flex flex-col gap-0.5 text-sm">
                      <span className="line-clamp-1">
                        <span className="font-medium">{event.actor ?? "Someone"}</span>{" "}
                        <span className="text-fg-muted">{ACTIVITY_VERB[event.kind]}</span>{" "}
                        {event.href && event.subject ? (
                          <Link href={event.href} className="hover:underline">
                            {event.subject}
                          </Link>
                        ) : (
                          event.subject
                        )}
                      </span>
                      <time dateTime={event.at} className="text-xs text-fg-subtle">
                        {timeFormat.format(new Date(event.at))}
                      </time>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="About">
            {project.description ? (
              <p className="text-sm leading-relaxed whitespace-pre-line text-fg-muted">{project.description}</p>
            ) : (
              <p className="text-sm text-fg-subtle">No description yet.</p>
            )}
            <div className="border-t border-border pt-4">
              <KeyValueList
                items={[
                  {
                    label: "Health",
                    value: health ? (
                      <span title={health.reason}>
                        <StatusPill tone={HEALTH_META[health.health].tone}>
                          {HEALTH_META[health.health].label}
                        </StatusPill>
                      </span>
                    ) : (
                      <span className="text-fg-subtle">Not in delivery</span>
                    ),
                  },
                  { label: "Start", value: <DueDate value={project.start_date} open={false} /> },
                  {
                    label: "Target end",
                    value: (
                      <span>
                        <DueDate
                          value={project.target_end_date}
                          open={project.status !== "completed" && project.status !== "archived"}
                        />
                        {left !== null && project.status !== "completed" && project.status !== "archived" ? (
                          <span className="ml-1.5 text-xs text-fg-subtle">
                            {left < 0 ? `${Math.abs(left)}d over` : `${left}d left`}
                          </span>
                        ) : null}
                      </span>
                    ),
                  },
                  { label: "QA sign-off", value: project.qa_required ? "Required" : "Not required" },
                  { label: "MVP", value: `${mvpDone} of ${planning.mvpItems.length} done` },
                  { label: "Created", value: formatDate(project.created_at) },
                ]}
              />
            </div>
          </Panel>

          <Panel title="Milestones" action={<PanelLink href={`${base}/milestones`}>All</PanelLink>}>
            {planning.milestones.length === 0 ? (
              <p className="text-sm text-fg-muted">No milestones yet.</p>
            ) : (
              <ul className="-my-1 flex flex-col divide-y divide-border">
                {planning.milestones.slice(0, 5).map((milestone) => (
                  <li key={milestone.id} className="relative flex items-center gap-3 py-2 text-sm">
                    <Flag
                      className={milestone.completed_at ? "size-4 text-status-success-fg" : "size-4 text-fg-subtle"}
                      aria-hidden="true"
                    />
                    <Link
                      href={`${base}/milestones/${milestone.id}`}
                      className="min-w-0 flex-1 truncate after:absolute after:inset-0 hover:underline"
                    >
                      {milestone.title}
                    </Link>
                    <DueDate value={milestone.due_date} open={!milestone.completed_at} className="text-[13px]" />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Goals" action={<PanelLink href={`${base}/goals`}>All</PanelLink>}>
            {planning.goals.length === 0 ? (
              <p className="text-sm text-fg-muted">Goals say what success means.</p>
            ) : (
              <ul className="-my-1 flex flex-col divide-y divide-border">
                {planning.goals.slice(0, 5).map((goal) => (
                  <li key={goal.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 truncate" title={goal.title}>
                      {goal.title}
                    </span>
                    <GoalStatusBadge status={goal.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Team" action={<PanelLink href={`${base}/team`}>Manage</PanelLink>}>
            {members.error ? (
              <ErrorState {...describeQueryFailure(members.error)} />
            ) : (members.data ?? []).length === 0 ? (
              <p className="text-sm text-fg-muted">Nobody is on this project yet.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {(members.data ?? []).slice(0, 6).map((member) => (
                  <li key={member.user_id} className="flex items-center gap-2.5 text-sm">
                    <UserAvatar
                      name={member.profile?.full_name ?? "Unnamed"}
                      avatarUrl={member.profile?.avatar_url ?? null}
                      className="size-7"
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {member.profile?.full_name ?? "Unnamed"}
                    </span>
                    <span className="text-xs text-fg-subtle">{projectRoleLabel(member.role)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
