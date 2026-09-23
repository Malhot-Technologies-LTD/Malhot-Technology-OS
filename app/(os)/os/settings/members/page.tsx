import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AccessRequests } from "@/features/organization/components/access-requests.client";
import { MemberList } from "@/features/organization/components/member-list.client";
import { listMembers } from "@/features/organization/queries";
import { listProjectOptions } from "@/features/projects/queries";
import { requireViewer } from "@/lib/auth/context";
import { can } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import { listAccessRequests } from "@/lib/supabase/elevated/access-requests";

export const metadata: Metadata = { title: "Members" };

/**
 * Settings → Members (docs/features/team.md#settings).
 *
 * Two lists: people waiting to be let in, and people already in. Members get a
 * 404 rather than a hint that the page exists.
 */
export default async function MembersSettingsPage() {
  const viewer = await requireViewer();
  if (!can(viewer, "org.invite")) notFound();

  const [members, requests, projects] = await Promise.all([
    listMembers(viewer.organizationId),
    listAccessRequests(viewer.userId, viewer.organizationId),
    listProjectOptions(viewer.organizationId),
  ]);
  if (members.error) throw new Error(`Could not load members: ${members.error.message}`);
  /*
   * A failed project query must not take the whole page down — approving and
   * managing members still works without it — but it must not masquerade as an
   * empty list either, or the assign dialog sends people off to create a
   * project they already have. Pass the failure through and say so.
   */
  if (projects.error) logger.warn("members.project_options_failed", { error: projects.error.message });
  const projectOptions = projects.data ?? [];

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="requests-heading" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="requests-heading" className="text-lg font-semibold tracking-tight">
            Waiting for access
          </h2>
          <p className="text-sm text-fg-muted">
            {requests.length === 0
              ? "Anyone can create an account, but nobody sees company data until you approve them here."
              : `${requests.length} ${requests.length === 1 ? "person has" : "people have"} signed up and cannot see anything yet.`}
          </p>
        </div>
        <AccessRequests requests={requests} projects={projectOptions} projectsFailed={Boolean(projects.error)} />
      </section>

      <section aria-labelledby="members-heading" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="members-heading" className="text-lg font-semibold tracking-tight">
            Members
          </h2>
          <p className="text-sm text-fg-muted">
            {members.data.length} {members.data.length === 1 ? "person" : "people"} in {viewer.organization.name}.
          </p>
        </div>
        <MemberList
          members={members.data}
          viewerUserId={viewer.userId}
          viewerRole={viewer.orgRole}
          projects={projectOptions}
          projectsFailed={Boolean(projects.error)}
        />
      </section>
    </div>
  );
}
