import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AccessRequests } from "@/features/organization/components/access-requests.client";
import { MemberList } from "@/features/organization/components/member-list.client";
import { listMembers } from "@/features/organization/queries";
import { requireViewer } from "@/lib/auth/context";
import { can } from "@/lib/permissions";
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

  const [members, requests] = await Promise.all([
    listMembers(viewer.organizationId),
    listAccessRequests(viewer.userId, viewer.organizationId),
  ]);
  if (members.error) throw new Error(`Could not load members: ${members.error.message}`);

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
        <AccessRequests requests={requests} />
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
        <MemberList members={members.data} viewerUserId={viewer.userId} viewerRole={viewer.orgRole} />
      </section>
    </div>
  );
}
