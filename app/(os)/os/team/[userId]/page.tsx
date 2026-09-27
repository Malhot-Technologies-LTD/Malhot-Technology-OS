import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ErrorState } from "@/components/os/error-state";
import { PageBody } from "@/components/os/page-header";
import { listMembers } from "@/features/organization/queries";
import { listProjectOptions } from "@/features/projects/queries";
import { listSocialManagers } from "@/features/social/queries";
import { listMyCompletedTasks, listMyTasks } from "@/features/tasks/queries";
import { canSeeRecords, canViewPerson } from "@/features/team/access";
import { MemberProfile } from "@/features/team/components/member-profile";
import { getMember, getMemberRecord, listMemberDocuments, listMemberProjects } from "@/features/team/queries";
import { describeQueryFailure } from "@/lib/actions/db-errors";
import { requireViewer } from "@/lib/auth/context";
import { can } from "@/lib/permissions";
import { requestTime } from "@/lib/request-time";

export const metadata: Metadata = { title: "Team member" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A person's page (docs/features/team.md#member-page): reached from the Team
 * directory. Work is shown to whoever can see the directory, within the
 * projects they share (RLS); employment details and documents only to org
 * admins and the person themselves.
 */
export default async function TeamMemberPage({ params }: PageProps<"/os/team/[userId]">) {
  const { userId } = await params;
  if (!UUID.test(userId)) notFound();
  const viewer = await requireViewer();
  if (!canViewPerson(viewer, userId)) notFound();

  const member = await getMember(viewer.organizationId, userId);
  if (member.error) {
    return (
      <PageBody>
        <ErrorState {...describeQueryFailure(member.error)} />
      </PageBody>
    );
  }
  if (!member.data) notFound();

  const isAdmin = can(viewer, "member.records");
  const private_ = canSeeRecords(viewer, userId);
  const [projects, open, done, managers, record, documents, members, options] = await Promise.all([
    listMemberProjects(viewer.organizationId, userId),
    listMyTasks(userId),
    listMyCompletedTasks(userId, 30),
    listSocialManagers(viewer.organizationId),
    private_ ? getMemberRecord(viewer.organizationId, userId) : null,
    private_ ? listMemberDocuments(viewer.organizationId, userId) : null,
    private_ ? listMembers(viewer.organizationId) : null,
    isAdmin ? listProjectOptions(viewer.organizationId) : null,
  ]);

  const records =
    !private_ || !record || !documents
      ? null
      : record.missing || documents.missing
        ? ("missing" as const)
        : {
            record: record.data,
            documents: documents.data,
            colleagues: (members?.data ?? [])
              .filter((row) => row.user_id !== userId)
              .map((row) => ({ id: row.user_id, name: row.profile?.full_name || "Unnamed" })),
          };

  return (
    <PageBody>
      <MemberProfile
        member={member.data}
        projects={projects.data ?? []}
        openTasks={open.data ?? []}
        doneTasks={done.data ?? []}
        isSelf={viewer.userId === userId}
        isAdmin={isAdmin}
        socialManager={managers?.has(userId) ?? false}
        now={requestTime()}
        records={records}
        organizationId={viewer.organizationId}
        assignableProjects={options?.data ?? []}
      />
    </PageBody>
  );
}
