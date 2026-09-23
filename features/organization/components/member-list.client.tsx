"use client";

import { FolderPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { formatDate } from "@/components/os/data-display";
import { StatusPill } from "@/components/os/status-badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { changeMemberRole, removeMember } from "@/features/organization/actions";
import {
  AssignToProjectDialog,
  type AssignableProject,
  type AssignTarget,
} from "@/features/organization/components/assign-to-project-dialog.client";
import type { MemberRow } from "@/features/organization/queries";
import type { OrgRole } from "@/types/domain";

const ROLE_HELP: Record<OrgRole, string> = {
  owner: "Everything, plus ownership transfer",
  admin: "Every project, members, settings",
  member: "Only projects they belong to",
};

type Props = {
  members: readonly MemberRow[];
  viewerUserId: string;
  viewerRole: OrgRole;
  projects: readonly AssignableProject[];
  projectsFailed?: boolean;
};

/**
 * Everyone in the organisation, and what they can reach.
 *
 * Each row carries "Add to project" because organisation membership is only
 * half of access: `projects_select` shows a plain member only the projects they
 * belong to. Approval is the natural first moment to assign someone, but it is
 * not the only one — people join projects later, and the prompt at approval can
 * be skipped — so the same control lives here, reachable at any time.
 */
export function MemberList({ members, viewerUserId, viewerRole, projects, projectsFailed }: Props) {
  const canManage = viewerRole === "owner" || viewerRole === "admin";
  const [assigning, setAssigning] = useState<AssignTarget | null>(null);

  return (
    <>
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
        {members.map((member) => (
          <MemberRowItem
            key={member.user_id}
            member={member}
            isSelf={member.user_id === viewerUserId}
            canManage={canManage}
            viewerRole={viewerRole}
            onAssign={setAssigning}
          />
        ))}
      </ul>

      <AssignToProjectDialog
        person={assigning}
        projects={projects}
        projectsFailed={projectsFailed}
        onClose={() => setAssigning(null)}
      />
    </>
  );
}

function MemberRowItem({
  member,
  isSelf,
  canManage,
  viewerRole,
  onAssign,
}: {
  member: MemberRow;
  isSelf: boolean;
  canManage: boolean;
  viewerRole: OrgRole;
  onAssign: (person: AssignTarget) => void;
}) {
  const [pending, startTransition] = useTransition();
  const name = member.profile?.full_name || "Unnamed";

  // Owners are only reassignable by another owner, and nobody edits themselves
  // here — that avoids an admin accidentally locking themselves out.
  const editable = canManage && !isSelf && (member.role !== "owner" || viewerRole === "owner");

  function setRole(role: string) {
    startTransition(async () => {
      const result = await changeMemberRole({ userId: member.user_id, role });
      if (result.ok) toast.success(`${name} is now ${role}`);
      else toast.error(result.error.message);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await removeMember(member.user_id);
      if (result.ok) toast.success(`${name} removed from the organisation`);
      else toast.error(result.error.message);
    });
  }

  return (
    <li className="flex flex-wrap items-center gap-3 p-4">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">
          {name}
          {isSelf ? <span className="ml-2 text-sm font-normal text-fg-muted">you</span> : null}
        </span>
        <span className="truncate text-sm text-fg-muted">
          {member.profile?.title || ROLE_HELP[member.role]} · joined {formatDate(member.joined_at)}
        </span>
      </div>

      {/*
       * Offered for anyone an admin manages, including themselves: putting
       * yourself on a project you created but were never added to is a normal
       * thing to need, and nothing about it risks a lockout.
       */}
      {canManage ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAssign({ userId: member.user_id, name })}
          disabled={pending}
        >
          <FolderPlus aria-hidden="true" />
          Add to project
        </Button>
      ) : null}

      {editable ? (
        <>
          <label htmlFor={`member-role-${member.user_id}`} className="sr-only">
            Organisation role for {name}
          </label>
          <Select value={member.role} onValueChange={setRole}>
            <SelectTrigger id={`member-role-${member.user_id}`} size="sm" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              {viewerRole === "owner" ? <SelectItem value="owner">Owner</SelectItem> : null}
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={remove} disabled={pending}>
            Remove
          </Button>
        </>
      ) : (
        <StatusPill tone={member.role === "owner" ? "success" : member.role === "admin" ? "info" : "neutral"}>
          {member.role}
        </StatusPill>
      )}
    </li>
  );
}
