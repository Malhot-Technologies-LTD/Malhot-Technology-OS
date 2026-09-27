import { ChevronLeft, ChevronRight, Clock, Flag, Hourglass, PlayCircle, Timer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProgressBar, formatDate } from "@/components/os/data-display";
import { ErrorState } from "@/components/os/error-state";
import { PageBody } from "@/components/os/page-header";
import { Panel, PanelLink } from "@/components/os/panel";
import { PriorityBadge, ProjectStatusBadge, StatusPill } from "@/components/os/status-badge";
import { UserAvatar } from "@/components/os/user-menu.client";
import { milestoneScopes } from "@/features/projects/milestones";
import { getProjectContext, getProjectPlanning, listProjectMembers } from "@/features/projects/queries";
import { projectHref } from "@/features/projects/tabs";
import { Countdown } from "@/features/tasks/components/countdown.client";
import { CopyLinkButton, StatusStepper } from "@/features/tasks/components/status-stepper.client";
import { TaskContent, TaskProperties } from "@/features/tasks/components/task-editor.client";
import { TaskLine, TaskLines } from "@/features/tasks/components/task-line";
import { formatSpan, spanBetween } from "@/features/tasks/durations";
import { parseTaskRef, taskHref, taskRef } from "@/features/tasks/links";
import { getTaskByRef, listProjectTasks } from "@/features/tasks/queries";
import { TASK_STATUS_META } from "@/features/tasks/schemas";
import { describeQueryFailure } from "@/lib/actions/db-errors";
import { requireViewer } from "@/lib/auth/context";
import { requestTime } from "@/lib/request-time";
import { can } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/types/domain";

export async function generateMetadata({ params }: PageProps<"/os/tasks/[ref]">): Promise<Metadata> {
  const { ref } = await params;
  return { title: ref.toUpperCase() };
}

const STAMP = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * One task, on its own page (`/os/tasks/MAL-42`): what it is, where it stands
 * in the workflow, how long it has taken at each stage, what it belongs to and
 * what else sits around it — with every control the reader is allowed.
 *
 * A task that does not exist and one the viewer cannot see render the same
 * 404, so a reference cannot be used to probe other projects.
 */
export default async function TaskPage({ params }: PageProps<"/os/tasks/[ref]">) {
  const [{ ref }, viewer] = await Promise.all([params, requireViewer()]);
  const parsed = parseTaskRef(ref);
  if (!parsed) notFound();

  const { data: task, error } = await getTaskByRef(viewer.organizationId, parsed.key, parsed.seq);
  if (error) {
    return (
      <PageBody>
        <ErrorState {...describeQueryFailure(error)} />
      </PageBody>
    );
  }
  if (!task) notFound();

  const project = task.project;
  const [ctx, team, siblings, planning] = await Promise.all([
    getProjectContext(
      { id: project.id, key: project.key, status: project.status as ProjectStatus, qa_required: project.qa_required },
      viewer,
    ),
    listProjectMembers(project.id),
    listProjectTasks(project.id),
    getProjectPlanning(project.id),
  ]);

  // Mirrors the tasks_update policy: the manager, or the person it is assigned to.
  const canManage = can(viewer, "project.manage_members", ctx);
  const isAssignee = task.assignee?.id === viewer.userId;
  const canEdit = can(viewer, "task.edit", ctx) && (canManage || isAssignee);
  const finished = task.status === "done";
  const now = requestTime();

  const all = siblings.data ?? [];
  const bySeq = [...all].sort((a, b) => a.seq - b.seq);
  const position = bySeq.findIndex((candidate) => candidate.id === task.id);
  const previous = position > 0 ? bySeq[position - 1] : null;
  const following = position >= 0 ? (bySeq[position + 1] ?? null) : null;
  const projectDone = all.filter((candidate) => candidate.status === "done").length;
  const scopes = milestoneScopes(planning.milestones, all);
  const milestone =
    planning.milestones.find((candidate) => scopes.get(candidate.id)?.some((scoped) => scoped.id === task.id)) ?? null;
  const theirOtherWork = task.assignee
    ? all
        .filter(
          (candidate) =>
            candidate.id !== task.id && candidate.assignee?.id === task.assignee!.id && candidate.status !== "done",
        )
        .slice(0, 6)
    : [];

  const toAccept = spanBetween(task.created_at, task.accepted_at);
  const inProgress = task.started_at
    ? spanBetween(task.started_at, task.completed_at ?? new Date(now).toISOString())
    : null;
  const endToEnd = spanBetween(task.created_at, task.completed_at ?? new Date(now).toISOString());

  const history = [
    { label: "Created", at: task.created_at, by: task.created_by_profile?.full_name },
    { label: "Accepted", at: task.accepted_at, by: task.accepted_at ? task.assignee?.full_name : undefined },
    { label: "Started", at: task.started_at },
    { label: "Completed", at: task.completed_at },
  ].filter((event): event is { label: string; at: string; by?: string } => Boolean(event.at));

  return (
    <PageBody>
      <div className="-mb-2 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
          <Link
            href={projectHref(project.key)}
            className="inline-flex items-center gap-1 hover:text-fg hover:underline"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            {project.name}
          </Link>
          <span aria-hidden="true">/</span>
          <Link href={projectHref(project.key, "tasks")} className="hover:text-fg hover:underline">
            Tasks
          </Link>
          <span aria-hidden="true">/</span>
          <span className="font-mono text-fg-subtle">{taskRef(project.key, task.seq)}</span>
        </nav>
        <div className="flex items-center gap-2">
          <CopyLinkButton path={taskHref(project.key, task.seq)} />
          <div className="flex rounded-lg border border-border bg-surface">
            {previous ? (
              <Link
                href={taskHref(project.key, previous.seq)}
                aria-label={`Previous task, ${taskRef(project.key, previous.seq)}`}
                className="flex size-8 items-center justify-center text-fg-muted hover:bg-bg-subtle hover:text-fg"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Link>
            ) : (
              <span className="flex size-8 items-center justify-center text-fg-subtle/50" aria-hidden="true">
                <ChevronLeft className="size-4" />
              </span>
            )}
            {following ? (
              <Link
                href={taskHref(project.key, following.seq)}
                aria-label={`Next task, ${taskRef(project.key, following.seq)}`}
                className="flex size-8 items-center justify-center border-l border-border text-fg-muted hover:bg-bg-subtle hover:text-fg"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            ) : (
              <span
                className="flex size-8 items-center justify-center border-l border-border text-fg-subtle/50"
                aria-hidden="true"
              >
                <ChevronRight className="size-4" />
              </span>
            )}
          </div>
        </div>
      </div>

      <StatusStepper taskId={task.id} projectKey={project.key} status={task.status} canEdit={canEdit} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={TASK_STATUS_META[task.status].tone}>{TASK_STATUS_META[task.status].label}</StatusPill>
            <PriorityBadge priority={task.priority} />
            {!finished && task.assignee && !task.accepted_at ? (
              <StatusPill tone="warning">Not accepted yet</StatusPill>
            ) : null}
            {task.due_at && !finished ? (
              <span className="text-sm">
                <span className="text-fg-muted">Due {formatDate(task.due_at)} · </span>
                <Countdown dueAt={task.due_at} className="font-medium" />
              </span>
            ) : null}
          </div>

          <section className="rounded-lg border border-border bg-surface p-6">
            <TaskContent
              taskId={task.id}
              projectKey={project.key}
              title={task.title}
              description={task.description}
              canEdit={canEdit}
            />
          </section>

          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Fact
              icon={Clock}
              label="Age"
              value={formatSpan(now - Date.parse(task.created_at))}
              hint={`Created ${formatDate(task.created_at)}`}
            />
            <Fact
              icon={Hourglass}
              label="Time to accept"
              value={toAccept === null ? "—" : formatSpan(toAccept)}
              hint={task.accepted_at ? "From assignment to acceptance" : task.assignee ? "Waiting" : "Nobody assigned"}
              tone={!task.accepted_at && task.assignee && !finished ? "warning" : undefined}
            />
            <Fact
              icon={PlayCircle}
              label={finished ? "Time in progress" : "In progress for"}
              value={inProgress === null ? "—" : formatSpan(inProgress)}
              hint={task.started_at ? `Started ${formatDate(task.started_at)}` : "Not started"}
            />
            <Fact
              icon={Timer}
              label={finished ? "Took" : "Open for"}
              value={endToEnd === null ? "—" : formatSpan(endToEnd)}
              hint={finished ? `Done ${formatDate(task.completed_at)}` : "Since it was created"}
            />
          </dl>

          <Panel title="History" description="The moments this task records">
            <ol className="flex flex-col gap-4 border-l border-border pl-5">
              {history.map((event, index) => {
                const previousAt = index > 0 ? history[index - 1]!.at : null;
                const gap = spanBetween(previousAt, event.at);
                return (
                  <li key={event.label} className="relative text-sm">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-surface",
                        event.label === "Completed" ? "bg-status-success-fg" : "bg-brand",
                      )}
                    />
                    <span className="font-medium">{event.label}</span>
                    {event.by ? <span className="text-fg-muted"> by {event.by}</span> : null}
                    <span className="block text-[13px] text-fg-subtle">
                      {STAMP.format(new Date(event.at))}
                      {gap !== null ? ` · ${formatSpan(gap)} after ${history[index - 1]!.label.toLowerCase()}` : ""}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Panel>

          {theirOtherWork.length > 0 ? (
            <Panel
              title={`${isAssignee ? "Your" : `${task.assignee!.full_name.split(" ")[0]}'s`} other open work here`}
              action={<PanelLink href={`${projectHref(project.key, "tasks")}`}>All tasks</PanelLink>}
            >
              <TaskLines>
                {theirOtherWork.map((candidate) => (
                  <TaskLine key={candidate.id} task={candidate} projectKey={project.key} />
                ))}
              </TaskLines>
            </Panel>
          ) : null}
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-6">
          <div className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5">
            <div className="flex items-center gap-3">
              {task.assignee ? (
                <>
                  <UserAvatar name={task.assignee.full_name} avatarUrl={task.assignee.avatar_url} className="size-9" />
                  <div className="min-w-0">
                    <p className="text-xs text-fg-subtle">Assigned to</p>
                    <p className="truncate text-sm font-medium">{task.assignee.full_name}</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-fg-muted">Nobody owns this task yet.</p>
              )}
            </div>
            <TaskProperties
              taskId={task.id}
              projectKey={project.key}
              title={task.title}
              description={task.description}
              status={task.status}
              priority={task.priority}
              dueAt={task.due_at}
              assigneeId={task.assignee?.id ?? null}
              acceptedAt={task.accepted_at}
              startedAt={task.started_at}
              team={(team.data ?? []).map((member) => ({
                userId: member.user_id,
                fullName: member.profile?.full_name ?? "Unnamed",
              }))}
              canEdit={canEdit}
              canManage={canManage}
              canDelete={can(viewer, "task.delete", ctx)}
              viewerUserId={viewer.userId}
            />
          </div>

          <Panel title="Project" action={<PanelLink href={projectHref(project.key)}>Open</PanelLink>}>
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-subtle font-mono text-xs font-semibold text-brand">
                {project.key}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{project.name}</span>
              <ProjectStatusBadge status={project.status as ProjectStatus} />
            </div>
            <ProgressBar done={projectDone} total={all.length} label="Project tasks done" />
          </Panel>

          <Panel title="Milestone" description="The next date this task counts towards">
            {milestone ? (
              <Link
                href={`${projectHref(project.key, "milestones")}/${milestone.id}`}
                className="flex items-center gap-3 rounded-md border border-border p-3 hover:bg-bg-subtle"
              >
                <Flag
                  className={cn("size-4 shrink-0", milestone.completed_at ? "text-status-success-fg" : "text-brand")}
                  aria-hidden="true"
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{milestone.title}</span>
                  <span className="text-xs text-fg-subtle">
                    {milestone.completed_at ? "Reached" : `Due ${formatDate(milestone.due_date)}`}
                  </span>
                </span>
              </Link>
            ) : (
              <p className="text-sm text-fg-muted">
                {task.due_at
                  ? "No milestone falls on or after this deadline."
                  : "Give the task a deadline to place it under a milestone."}
              </p>
            )}
          </Panel>
        </aside>
      </div>
    </PageBody>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  hint: string;
  tone?: "warning";
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface p-4">
      <dt className="flex items-center gap-1.5 text-[13px] text-fg-muted">
        <Icon className="size-3.5 text-fg-subtle" aria-hidden="true" />
        {label}
      </dt>
      <dd className={cn("text-xl font-semibold tabular-nums", tone === "warning" && "text-status-warning-fg")}>
        {value}
      </dd>
      <dd className="truncate text-xs text-fg-subtle">{hint}</dd>
    </div>
  );
}
