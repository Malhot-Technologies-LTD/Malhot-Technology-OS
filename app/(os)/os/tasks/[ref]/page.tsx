import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatDate } from "@/components/os/data-display";
import { ErrorState } from "@/components/os/error-state";
import { PageBody } from "@/components/os/page-header";
import { PriorityBadge, StatusPill } from "@/components/os/status-badge";
import { UserAvatar } from "@/components/os/user-menu.client";
import { getProjectContext, listProjectMembers } from "@/features/projects/queries";
import { Countdown } from "@/features/tasks/components/countdown.client";
import { TaskContent, TaskProperties } from "@/features/tasks/components/task-editor.client";
import { parseTaskRef, taskRef } from "@/features/tasks/links";
import { getTaskByRef } from "@/features/tasks/queries";
import { TASK_STATUS_META } from "@/features/tasks/schemas";
import { describeQueryFailure } from "@/lib/actions/db-errors";
import { requireViewer } from "@/lib/auth/context";
import { can } from "@/lib/permissions";
import type { ProjectStatus } from "@/types/domain";

export async function generateMetadata({ params }: PageProps<"/os/tasks/[ref]">): Promise<Metadata> {
  const { ref } = await params;
  return { title: ref.toUpperCase() };
}

/**
 * One task, on its own page (`/os/tasks/MAL-42`): everything needed to do it,
 * and every control the reader is allowed, in one place with a link to share.
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
  const [ctx, team] = await Promise.all([
    getProjectContext(
      { id: project.id, key: project.key, status: project.status as ProjectStatus, qa_required: project.qa_required },
      viewer,
    ),
    listProjectMembers(project.id),
  ]);

  // Mirrors the tasks_update policy: the manager, or the person it is assigned to.
  const canManage = can(viewer, "project.manage_members", ctx);
  const isAssignee = task.assignee?.id === viewer.userId;
  const canEdit = can(viewer, "task.edit", ctx) && (canManage || isAssignee);
  const meta = TASK_STATUS_META[task.status];
  const finished = task.status === "done";

  const history = [
    { label: "Created", at: task.created_at, by: task.created_by_profile?.full_name },
    { label: "Accepted", at: task.accepted_at, by: task.accepted_at ? task.assignee?.full_name : undefined },
    { label: "Started", at: task.started_at },
    { label: "Completed", at: task.completed_at },
  ].filter((event): event is { label: string; at: string; by?: string } => Boolean(event.at));

  return (
    <PageBody>
      <nav aria-label="Breadcrumb" className="-mb-3 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
        <Link
          href={`/os/projects/${project.key}`}
          className="inline-flex items-center gap-1 hover:text-fg hover:underline"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          {project.name}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-mono text-fg-subtle">{taskRef(project.key, task.seq)}</span>
      </nav>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
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

          <section aria-labelledby="history-heading" className="rounded-lg border border-border bg-surface p-6">
            <h2 id="history-heading" className="text-sm font-semibold">
              History
            </h2>
            <ol className="mt-4 flex flex-col gap-4 border-l border-border pl-5">
              {history.map((event) => (
                <li key={event.label} className="relative text-sm">
                  <span
                    aria-hidden="true"
                    className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-surface bg-brand"
                  />
                  <span className="font-medium">{event.label}</span>
                  {event.by ? <span className="text-fg-muted"> by {event.by}</span> : null}
                  <span className="block text-[13px] text-fg-subtle">{formatDate(event.at)}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5 lg:sticky lg:top-6">
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
        </aside>
      </div>
    </PageBody>
  );
}
