"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { formatDate } from "@/components/os/data-display";
import { StatusPill } from "@/components/os/status-badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { changeMemberRole, removeMember } from "@/features/organization/actions";
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
};

export function MemberList({ members, viewerUserId, viewerRole }: Props) {
  const canManage = viewerRole === "owner" || viewerRole === "admin";

  return (
    <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
      {members.map((member) => (
        <MemberRowItem
          key={member.user_id}
          member={member}
          isSelf={member.user_id === viewerUserId}
          canManage={canManage}
          viewerRole={viewerRole}
        />
      ))}
    </ul>
  );
}

function MemberRowItem({
  member,
  isSelf,
  canManage,
  viewerRole,
}: {
  member: MemberRow;
  isSelf: boolean;
  canManage: boolean;
  viewerRole: OrgRole;
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

      {editable ? (
        <>
          <label htmlFor={`member-role-${member.user_id}`} className="sr-only">
            Role for {name}
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
