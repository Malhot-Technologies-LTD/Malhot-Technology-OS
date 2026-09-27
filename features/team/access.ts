import { oversees } from "@/components/os/nav-audience";
import type { Viewer } from "@/lib/auth/context";
import { can } from "@/lib/permissions";

/**
 * Who may open a person's page, and who sees its private half.
 *
 * The page: anyone who can see the Team directory (org admins, project
 * managers), and everyone for their own page. The employment details and
 * documents: org admins, and the person themselves — RLS enforces the same.
 */
export function canViewPerson(viewer: Viewer, userId: string): boolean {
  return viewer.userId === userId || oversees({ orgRole: viewer.orgRole, projectRoles: viewer.projectRoles });
}

export function canSeeRecords(viewer: Viewer, userId: string): boolean {
  return viewer.userId === userId || can(viewer, "member.records");
}
