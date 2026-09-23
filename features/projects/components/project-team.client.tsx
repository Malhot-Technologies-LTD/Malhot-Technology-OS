"use client";

import { UserPlus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/os/user-menu.client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignProjectMember, changeProjectMemberRole, removeProjectMember } from "@/features/projects/actions";
import { ASSIGNABLE_PROJECT_ROLES, PROJECT_ROLE_META } from "@/features/projects/roles";
import type { AssignableMember, ProjectMemberRow } from "@/features/projects/queries";
import type { ProjectRole } from "@/types/domain";

type Props = {
  projectId: string;
  members: readonly ProjectMemberRow[];
  assignable: readonly AssignableMember[];
  canManage: boolean;
  viewerUserId: string;
};

/**
 * Who is on this project, and what they are here to do.
 *
 * This is where access actually begins. Being approved into the organisation
 * gets someone an account; `projects_select` shows a plain member only the
 * projects they are on, so until they appear in this list they sign in to an
 * empty OS. Assigning someone is the act of letting them in.
 */
export function ProjectTeam({ projectId, members, assignable, canManage, viewerUserId }: Props) {
  const [pending, startTransition] = useTransition();
  const [userId, setUserId] = useState<string>("");
  const [role, setRole] = useState<ProjectRole>("developer");

  function run(work: () => Promise<{ ok: boolean; error?: { message: string } }>, success: string) {
    startTransition(async () => {
      const result = await work();
      if (result.ok) toast.success(success);
      else toast.error(result.error?.message ?? "That did not work.");
    });
  }

  function assign() {
    if (!userId) return;
    const name = assignable.find((person) => person.userId === userId)?.fullName ?? "They";
    run(() => assignProjectMember({ projectId, userId, role }), `${name} can now see this project.`);
    setUserId("");
  }

  return (
    <div className="flex flex-col gap-5">
      {members.length === 0 ? (
        <p className="text-[15px] text-fg-muted">Nobody is on this project yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {members.map((member) => {
            const name = member.profile?.full_name ?? "Unnamed";
            const isViewer = member.user_id === viewerUserId;
            return (
              <li key={member.user_id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <UserAvatar name={name} avatarUrl={member.profile?.avatar_url ?? null} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-medium">
                    {name}
                    {isViewer ? <span className="ml-2 text-sm font-normal text-fg-subtle">you</span> : null}
                  </span>
                  {member.profile?.title ? (
                    <span className="truncate text-sm text-fg-muted">{member.profile.title}</span>
                  ) : null}
                </div>

                {canManage ? (
                  <Select
                    value={member.role}
                    disabled={pending}
                    onValueChange={(next) =>
                      run(
                        () => changeProjectMemberRole({ projectId, userId: member.user_id, role: next }),
                        `${name} is now a ${PROJECT_ROLE_META[next as ProjectRole].label.toLowerCase()}.`,
                      )
                    }
                  >
                    <SelectTrigger size="sm" className="w-36" aria-label={`Role for ${name}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_PROJECT_ROLES.map((option) => (
                        <SelectItem key={option} value={option}>
                          {PROJECT_ROLE_META[option].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-[15px] text-fg-muted">{PROJECT_ROLE_META[member.role].label}</span>
                )}

                {canManage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={pending}
                    aria-label={`Remove ${name} from this project`}
                    onClick={() =>
                      run(
                        () => removeProjectMember({ projectId, userId: member.user_id }),
                        `${name} no longer has access to this project.`,
                      )
                    }
                  >
                    <X aria-hidden="true" />
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {canManage ? (
        <div className="flex flex-col gap-3 border-t border-border pt-5">
          {assignable.length === 0 ? (
            <p className="text-sm text-fg-muted">
              Everyone in the organisation is already on this project. Approve more people in Settings → Members.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex min-w-48 flex-1 flex-col gap-1.5">
                  <span className="text-sm font-medium">Person</span>
                  <Select value={userId} onValueChange={setUserId} disabled={pending}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose someone" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignable.map((person) => (
                        <SelectItem key={person.userId} value={person.userId}>
                          {person.fullName}
                          {person.title ? ` · ${person.title}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                <label className="flex w-44 flex-col gap-1.5">
                  <span className="text-sm font-medium">Role</span>
                  <Select value={role} onValueChange={(next) => setRole(next as ProjectRole)} disabled={pending}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_PROJECT_ROLES.map((option) => (
                        <SelectItem key={option} value={option}>
                          {PROJECT_ROLE_META[option].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                <Button type="button" onClick={assign} disabled={pending || !userId}>
                  <UserPlus aria-hidden="true" />
                  {pending ? "Adding…" : "Add to project"}
                </Button>
              </div>
              <p className="text-sm text-fg-muted">{PROJECT_ROLE_META[role].summary}.</p>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
