import { AlertTriangle, ListTodo, UserX, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ErrorState } from "@/components/os/error-state";
import { StatRow, StatTile } from "@/components/os/metrics";
import { Panel } from "@/components/os/panel";
import { UserAvatar } from "@/components/os/user-menu.client";
import { ProjectTeam } from "@/features/projects/components/project-team.client";
import { taskTotals, workload } from "@/features/projects/insights";
import { listAssignableMembers } from "@/features/projects/queries";
import { projectRoleLabel } from "@/features/projects/roles";
import { projectHref } from "@/features/projects/tabs";
import { loadMembers, loadTasks, loadWorkspace } from "@/features/projects/workspace";
import { describeQueryFailure } from "@/lib/actions/db-errors";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Team" };

/** Who is on the project, what role each holds, and how much each person is carrying. */
export default async function ProjectTeamPage({ params }: PageProps<"/os/projects/[key]/team">) {
  const { key } = await params;
  const workspace = await loadWorkspace(key);
  if (workspace.kind !== "ok") return null;
  const { project, perms, viewer, now } = workspace;

  const [members, tasks, assignable] = await Promise.all([
    loadMembers(project.id),
    loadTasks(project.id),
    // Only a manager sees the picker, so only a manager pays for the query.
    perms.manageTeam ? listAssignableMembers(viewer.organizationId, project.id) : Promise.resolve([]),
  ]);
  if (members.error) return <ErrorState {...describeQueryFailure(members.error)} />;

  const all = tasks.data ?? [];
  const totals = taskTotals(all, now);
  const loads = new Map(workload(all, now).map((row) => [row.userId ?? "none", row]));
  const people = members.data ?? [];
  const busiest = Math.max(1, ...people.map((member) => loads.get(member.user_id)?.open ?? 0));
  const idle = people.filter((member) => (loads.get(member.user_id)?.open ?? 0) === 0).length;
  const base = projectHref(project.key);

  return (
    <>
      <StatRow>
        <StatTile
          label="People"
          value={people.length}
          hint={`${people.filter((m) => m.role === "manager").length} managing`}
          icon={Users}
          tone="brand"
        />
        <StatTile
          label="Open tasks"
          value={totals.open}
          hint={`${people.length === 0 ? 0 : (totals.open / people.length).toFixed(1)} per person`}
          icon={ListTodo}
        />
        <StatTile
          label="Unassigned"
          value={totals.unassigned}
          hint={totals.unassigned === 0 ? "Every task has an owner" : "Waiting for an owner"}
          icon={UserX}
          tone={totals.unassigned > 0 ? "warning" : "neutral"}
          href={`${base}/tasks`}
        />
        <StatTile
          label="Not accepted"
          value={totals.notAccepted}
          hint="Handed out, not picked up"
          icon={AlertTriangle}
          tone={totals.notAccepted > 0 ? "warning" : "neutral"}
        />
        <StatTile label="Nothing open" value={idle} hint="People with free capacity" icon={Users} />
      </StatRow>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <Panel title="Workload" description="Open work per person on this project">
          <div className="-mx-5 -mb-5 overflow-x-auto border-t border-border">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="bg-bg-subtle text-left text-xs text-fg-subtle">
                <tr>
                  <th scope="col" className="px-5 py-2.5 font-medium">
                    Person
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    Load
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">
                    Open
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">
                    In progress
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">
                    Overdue
                  </th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">
                    Done
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {people.map((member) => {
                  const load = loads.get(member.user_id);
                  const name = member.profile?.full_name ?? "Unnamed";
                  return (
                    <tr key={member.user_id}>
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-3">
                          <UserAvatar name={name} avatarUrl={member.profile?.avatar_url ?? null} className="size-8" />
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate font-medium">
                              {name}
                              {member.user_id === viewer.userId ? (
                                <span className="font-normal text-fg-subtle"> (you)</span>
                              ) : null}
                            </span>
                            <span className="text-xs text-fg-subtle">
                              {projectRoleLabel(member.role)}
                              {member.profile?.title ? ` · ${member.profile.title}` : ""}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="w-40 px-3 py-3">
                        <span
                          className="flex h-2 overflow-hidden rounded-full bg-bg-subtle"
                          role="img"
                          aria-label={`${load?.open ?? 0} open, ${load?.overdue ?? 0} overdue`}
                        >
                          <span
                            className="h-full bg-status-danger-fg"
                            style={{ width: `${((load?.overdue ?? 0) / busiest) * 100}%` }}
                          />
                          <span
                            className="h-full bg-brand"
                            style={{ width: `${(((load?.open ?? 0) - (load?.overdue ?? 0)) / busiest) * 100}%` }}
                          />
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{load?.open ?? 0}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{load?.inProgress ?? 0}</td>
                      <td
                        className={cn(
                          "px-3 py-3 text-right tabular-nums",
                          (load?.overdue ?? 0) > 0 ? "font-medium text-status-danger-fg" : "text-fg-subtle",
                        )}
                      >
                        {load?.overdue ?? 0}
                      </td>
                      <td className="px-5 py-3 text-right text-fg-muted tabular-nums">{load?.done ?? 0}</td>
                    </tr>
                  );
                })}
                {loads.get("none") ? (
                  <tr>
                    <td className="px-5 py-3 text-fg-muted">
                      <Link href={`${base}/tasks`} className="hover:underline">
                        Unassigned
                      </Link>
                    </td>
                    <td />
                    <td className="px-3 py-3 text-right tabular-nums">{loads.get("none")!.open}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{loads.get("none")!.inProgress}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{loads.get("none")!.overdue}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{loads.get("none")!.done}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title="Members"
          description={perms.manageTeam ? "Add people, change roles, remove them" : "Who is on this project"}
        >
          <ProjectTeam
            projectId={project.id}
            members={people}
            assignable={assignable}
            canManage={perms.manageTeam}
            viewerUserId={viewer.userId}
          />
        </Panel>
      </div>
    </>
  );
}
