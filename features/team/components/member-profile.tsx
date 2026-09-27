import { AlertTriangle, CalendarClock, CheckCircle2, FolderKanban, ListTodo, Lock, Settings } from "lucide-react";
import Link from "next/link";

import { formatDate } from "@/components/os/data-display";
import { EmptyState } from "@/components/os/empty-state";
import { StatRow, StatTile } from "@/components/os/metrics";
import { Panel, PanelLink } from "@/components/os/panel";
import { ProjectStatusBadge, StatusPill } from "@/components/os/status-badge";
import { UserAvatar } from "@/components/os/user-menu.client";
import { Button } from "@/components/ui/button";
import type { AssignableProject } from "@/features/organization/components/assign-to-project-dialog.client";
import { PROJECT_ROLE_META } from "@/features/projects/roles";
import { taskHref, taskRef } from "@/features/tasks/links";
import { TASK_STATUS_META, type TaskStatus } from "@/features/tasks/schemas";
import type { OrgRole, Priority } from "@/types/domain";

import type { Member, MemberDocument, MemberProject, MemberRecord } from "../queries";
import { EMPLOYMENT_TYPE_LABEL } from "../schemas";
import { memberTimeline, type TimelineTask } from "../timeline";
import { AddToProjectButton } from "./add-to-project-button.client";
import { MemberDocuments } from "./member-documents.client";
import { MemberRecordPanel } from "./member-record-form.client";

export type ProfileTask = TimelineTask & {
  status: TaskStatus;
  priority: Priority;
  due_at: string | null;
};

const DAY = 86_400_000;
const ROLE_LABEL: Record<OrgRole, string> = { owner: "Owner", admin: "Admin", member: "Member" };
const VERB = { accepted: "Accepted", started: "Started", finished: "Finished" } as const;

/**
 * One person: who they are, what they are on, what they owe and have done, and
 * — for admins and themselves — their employment details and paperwork.
 * Rendered from rows so the page and a fixture preview draw the same thing.
 */
export function MemberProfile({
  member,
  projects,
  openTasks,
  doneTasks,
  isSelf,
  isAdmin,
  socialManager,
  now,
  records,
  organizationId,
  assignableProjects,
}: {
  member: Member;
  projects: readonly MemberProject[];
  openTasks: readonly ProfileTask[];
  doneTasks: readonly ProfileTask[];
  isSelf: boolean;
  isAdmin: boolean;
  socialManager: boolean;
  now: number;
  /** Present only for admins and the person themselves. Null when the migration is missing. */
  records:
    | {
        record: MemberRecord | null;
        documents: readonly MemberDocument[];
        colleagues: readonly { id: string; name: string }[];
      }
    | null
    | "missing";
  organizationId: string;
  assignableProjects: readonly AssignableProject[];
}) {
  const name = member.profile?.full_name || "Unnamed";
  const first = name.split(" ")[0] || name;
  const timeZone = member.profile?.timezone || "Africa/Kigali";
  const localTime = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone }).format(now);
  const record = records && records !== "missing" ? records.record : null;

  const overdue = openTasks.filter((task) => task.due_at && Date.parse(task.due_at) < now);
  const dueSoon = openTasks.filter((task) => {
    const due = task.due_at ? Date.parse(task.due_at) : Number.NaN;
    return due >= now && due <= now + 7 * DAY;
  });
  const openByProject = new Map<string, number>();
  for (const task of openTasks) {
    if (task.project) openByProject.set(task.project.key, (openByProject.get(task.project.key) ?? 0) + 1);
  }
  const timeline = memberTimeline([...openTasks, ...doneTasks], 12);
  const liveProjects = projects.filter((row) => row.project);

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex min-w-0 items-center gap-4">
          <UserAvatar name={name} avatarUrl={member.profile?.avatar_url ?? null} className="size-16 text-lg" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <h1 className="truncate text-3xl font-semibold tracking-tight">
              {name}
              {isSelf ? <span className="ml-2 text-base font-normal text-fg-subtle">you</span> : null}
            </h1>
            <p className="text-fg-muted">
              {record?.position || member.profile?.title || "No title yet"}
              {record?.department ? ` · ${record.department}` : ""}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-fg-subtle">
              <StatusPill tone={member.role === "member" ? "neutral" : "info"}>{ROLE_LABEL[member.role]}</StatusPill>
              {socialManager ? <StatusPill tone="review">Social media manager</StatusPill> : null}
              {record?.employment_type ? (
                <StatusPill tone="neutral">{EMPLOYMENT_TYPE_LABEL[record.employment_type]}</StatusPill>
              ) : null}
              <span>Joined {formatDate(member.joined_at)}</span>
              <span aria-hidden="true">·</span>
              <span>
                {localTime} local time ({timeZone.replace(/_/g, " ")})
              </span>
            </div>
          </div>
        </div>
        {isAdmin ? (
          <div className="flex flex-wrap gap-2">
            <AddToProjectButton person={{ userId: member.user_id, name }} projects={assignableProjects} />
            <Button asChild variant="ghost">
              <Link href="/os/settings/members">
                <Settings aria-hidden="true" /> Role & access
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      <StatRow>
        <StatTile label="Open tasks" value={openTasks.length} hint="assigned and not finished" icon={ListTodo} />
        <StatTile
          label="Overdue"
          value={overdue.length}
          hint={overdue.length === 0 ? "Every deadline holds" : "past their deadline"}
          icon={AlertTriangle}
          tone={overdue.length > 0 ? "danger" : "neutral"}
        />
        <StatTile
          label="Due in 7 days"
          value={dueSoon.length}
          hint="coming up"
          icon={CalendarClock}
          tone={dueSoon.length > 0 ? "warning" : "neutral"}
        />
        <StatTile
          label="Done, 30 days"
          value={doneTasks.length}
          hint="tasks finished"
          icon={CheckCircle2}
          tone="success"
        />
        <StatTile label="Projects" value={liveProjects.length} hint="they are on" icon={FolderKanban} tone="brand" />
      </StatRow>

      <div className="grid gap-5 xl:grid-cols-5">
        <Panel
          title="Projects"
          description="Their role on each, and what they still owe there"
          className="xl:col-span-2"
        >
          {liveProjects.length === 0 ? (
            <EmptyState
              variant="well"
              title="Not on a project"
              description={`${first} can sign in but sees no project work until added to one.`}
            />
          ) : (
            <ul className="-my-1 flex flex-col divide-y divide-border">
              {liveProjects.map(({ project, role }) => (
                <li key={project!.id} className="relative flex items-center gap-3 py-2.5">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Link
                      href={`/os/projects/${project!.key}`}
                      className="truncate text-sm font-medium after:absolute after:inset-0 hover:underline"
                    >
                      <span className="mr-1.5 font-mono text-xs text-fg-subtle">{project!.key}</span>
                      {project!.name}
                    </Link>
                    <span className="text-xs text-fg-subtle">
                      {PROJECT_ROLE_META[role].label} · {openByProject.get(project!.key) ?? 0} open
                    </span>
                  </div>
                  <ProjectStatusBadge status={project!.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Open work"
          description="Soonest deadline first"
          className="xl:col-span-3"
          action={isSelf ? <PanelLink href="/os/my-tasks">My tasks</PanelLink> : undefined}
        >
          {openTasks.length === 0 ? (
            <EmptyState
              variant="well"
              icon={CheckCircle2}
              title="Nothing open"
              description="No unfinished tasks assigned."
            />
          ) : (
            <ul className="-my-1 flex flex-col divide-y divide-border">
              {openTasks.slice(0, 10).map((task) => {
                const late = task.due_at !== null && Date.parse(task.due_at) < now;
                return (
                  <li key={task.id} className="relative flex items-center gap-3 py-2.5">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <Link
                        href={task.project ? taskHref(task.project.key, task.seq) : "/os/my-tasks"}
                        className="truncate text-sm font-medium after:absolute after:inset-0 hover:underline"
                      >
                        {task.title}
                      </Link>
                      <span className="truncate text-xs text-fg-subtle">
                        {task.project ? <span className="font-mono">{taskRef(task.project.key, task.seq)}</span> : null}{" "}
                        · {TASK_STATUS_META[task.status].label}
                      </span>
                    </div>
                    <span
                      className={
                        late
                          ? "shrink-0 text-[13px] font-medium text-status-danger-fg"
                          : "shrink-0 text-[13px] text-fg-muted"
                      }
                    >
                      {task.due_at ? `${late ? "Was due" : "Due"} ${formatDate(task.due_at)}` : "No deadline"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Recent work" description="Tasks accepted, started and finished, from the projects you share">
        {timeline.length === 0 ? (
          <EmptyState
            variant="well"
            title="Nothing recorded yet"
            description="Accepting, starting and finishing tasks shows here."
          />
        ) : (
          <ol className="relative flex flex-col gap-3 border-l border-border pl-5">
            {timeline.map((entry) => (
              <li key={entry.id} className="relative text-sm">
                <span
                  aria-hidden="true"
                  className={
                    entry.verb === "finished"
                      ? "absolute top-1.5 -left-[25px] size-2.5 rounded-full bg-status-success-fg"
                      : "absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-border-strong bg-surface"
                  }
                />
                <span className="font-medium">{VERB[entry.verb]}</span>{" "}
                {entry.task.project ? (
                  <Link href={taskHref(entry.task.project.key, entry.task.seq)} className="hover:underline">
                    {entry.task.title}
                  </Link>
                ) : (
                  entry.task.title
                )}
                <span className="block text-xs text-fg-subtle">
                  {entry.task.project ? `${entry.task.project.key} · ` : ""}
                  {formatDate(entry.at)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      {records === null ? null : (
        <section aria-labelledby="private-heading" className="flex flex-col gap-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="private-heading" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Lock className="size-4 text-fg-subtle" aria-hidden="true" /> Employment
            </h2>
            <span className="text-xs text-fg-subtle">
              Visible only to admins{isSelf ? " and you" : ` and ${first}`}
            </span>
          </div>
          {records === "missing" ? (
            <EmptyState
              variant="well"
              title="People records need a one-time database update"
              description="An admin needs to run supabase/migrations/20260927190000_member_records.sql. Then employment details and documents appear here."
            />
          ) : (
            <div className="grid gap-5 xl:grid-cols-5">
              <Panel title="Details" className="xl:col-span-3">
                <MemberRecordPanel
                  userId={member.user_id}
                  record={records.record}
                  canEdit={isAdmin}
                  colleagues={records.colleagues}
                />
              </Panel>
              <Panel
                title="Contracts & documents"
                description="Offers, contracts, IDs, certificates"
                className="xl:col-span-2"
              >
                <MemberDocuments
                  userId={member.user_id}
                  organizationId={organizationId}
                  firstName={first}
                  documents={records.documents}
                  canEdit={isAdmin}
                />
              </Panel>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
