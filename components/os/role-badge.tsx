import { StatusPill } from "@/components/os/status-badge";
import type { OrgRole } from "@/types/domain";

/**
 * How an organisation role is named and explained, in one place
 * (docs/product/user-roles.md#organisation-roles).
 *
 * Descriptions are written for the person holding the role — what they can do,
 * not how the system models it — so the same words work in the sidebar, the
 * profile page and the members list.
 */
export const ORG_ROLE_META: Record<OrgRole, { label: string; summary: string; detail: string[] }> = {
  owner: {
    label: "Owner",
    summary: "You run this organisation",
    detail: [
      "Full access to every project, member and setting",
      "Approve documents, complete tasks and change project status anywhere",
      "Invite people, approve sign-ups and set their roles",
      "Transfer ownership — and you cannot be removed while you are the only owner",
    ],
  },
  admin: {
    label: "Admin",
    summary: "You run the company day to day",
    detail: [
      "Full access to every project, member and setting",
      "Approve documents, complete tasks and change project status anywhere",
      "Invite people, approve sign-ups and set their roles",
      "Read website enquiries",
    ],
  },
  member: {
    label: "Member",
    summary: "You work on the projects you belong to",
    detail: [
      "See and work on projects you are a member of",
      "Create projects — you become the manager of any project you start",
      "Your rights inside a project depend on your role there: manager, developer, designer, marketer, QA or viewer",
    ],
  },
};

const TONE = { owner: "success", admin: "info", member: "neutral" } as const;

export function RoleBadge({ role }: { role: OrgRole }) {
  return <StatusPill tone={TONE[role]}>{ORG_ROLE_META[role].label}</StatusPill>;
}
