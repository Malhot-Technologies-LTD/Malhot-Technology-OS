import { Users } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/os/empty-state";
import { ErrorState } from "@/components/os/error-state";
import { PageBody, PageHeader } from "@/components/os/page-header";
import { TeamDirectory, type TeamPerson } from "@/features/organization/components/team-directory.client";
import { listMembers } from "@/features/organization/queries";
import { listOrganizationMemberships, listProjectOptions } from "@/features/projects/queries";
import { describeQueryFailure } from "@/lib/actions/db-errors";
import { oversees } from "@/components/os/nav-audience";
import { requireViewer } from "@/lib/auth/context";
import { logger } from "@/lib/logger";
import type { ProjectRole } from "@/types/domain";

export const metadata: Metadata = { title: "Team" };

/**
 * Team (docs/features/team.md).
 *
 * Who is here, and what each person can actually reach. Assignment used to live
 * only inside a project's own page, which meant answering "why can't Levi see
 * anything?" required knowing which project he was missing from before you
 * could go and fix it. Here the gap and its fix are in the same place.
 *
 * Everyone in the organisation is listed, including people on no project —
 * those are exactly the ones worth seeing.
 */
export default async function TeamPage() {
  const viewer = await requireViewer();
  const canAssign = viewer.orgRole === "owner" || viewer.orgRole === "admin";

  /*
   * Hiding the sidebar entry is a courtesy; this is the control. The capability
   * matrix gives Viewer a dash on the team page, and a hidden link is still a
   * URL someone can type or a stale bookmark can hold.
   */
  if (!oversees({ orgRole: viewer.orgRole, projectRoles: viewer.projectRoles })) notFound();

  const [members, memberships, projects] = await Promise.all([
    listMembers(viewer.organizationId),
    listOrganizationMemberships(viewer.organizationId),
    listProjectOptions(viewer.organizationId),
  ]);

  if (members.error) {
    logger.error("team.members_failed", { code: members.error.code, message: members.error.message });
    return (
      <PageBody>
        <PageHeader title="Team" />
        <ErrorState {...describeQueryFailure(members.error)} />
      </PageBody>
    );
  }

  // Memberships and the project picker are both non-fatal: the directory is
  // still worth showing without them, just with less on it.
  if (memberships.error) logger.warn("team.memberships_failed", { message: memberships.error.message });
  if (projects.error) logger.warn("team.project_options_failed", { message: projects.error.message });

  const byUser = new Map<string, TeamPerson["projects"]>();
  for (const row of memberships.data ?? []) {
    if (!row.project) continue;
    const list = byUser.get(row.user_id) ?? [];
    list.push({ key: row.project.key, name: row.project.name, role: row.role as ProjectRole });
    byUser.set(row.user_id, list);
  }

  const people: TeamPerson[] = members.data.map((member) => ({
    userId: member.user_id,
    fullName: member.profile?.full_name || "Unnamed",
    title: member.profile?.title ?? null,
    avatarUrl: member.profile?.avatar_url ?? null,
    orgRole: member.role,
    projects: (byUser.get(member.user_id) ?? []).sort((a, b) => a.key.localeCompare(b.key)),
  }));

  const unplaced = people.filter((person) => person.projects.length === 0).length;

  return (
    <PageBody>
      <PageHeader
        title="Team"
        description={
          people.length === 1
            ? "You are the only person in this organisation."
            : `${people.length} people${unplaced > 0 ? `, ${unplaced} not on a project yet` : ", all on at least one project"}.`
        }
      />

      {people.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nobody here yet"
          description="People who sign up appear in Settings → Members, where you approve them."
        />
      ) : (
        <TeamDirectory
          people={people}
          projects={projects.data ?? []}
          projectsFailed={Boolean(projects.error)}
          canAssign={canAssign}
          viewerUserId={viewer.userId}
        />
      )}
    </PageBody>
  );
}
