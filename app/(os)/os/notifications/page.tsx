import { BellOff, DoorOpen } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/os/empty-state";
import { PageBody, PageHeader } from "@/components/os/page-header";
import { AccessRequests } from "@/features/organization/components/access-requests.client";
import { listProjectOptions } from "@/features/projects/queries";
import { AcceptanceList } from "@/features/tasks/components/acceptance-list";
import { listAwaitingAcceptance, listRecentAcceptances } from "@/features/tasks/queries";
import { requireViewer } from "@/lib/auth/context";
import { logger } from "@/lib/logger";
import { can } from "@/lib/permissions";
import { listAccessRequests } from "@/lib/supabase/elevated/access-requests";

export const metadata: Metadata = { title: "Notifications" };

/**
 * Notifications (docs/features/notifications.md).
 *
 * One source for now, and it is the one that cannot wait: somebody created an
 * account and is sitting outside the door. That used to surface only in
 * Settings → Members — a page you visit on purpose, which is the wrong place
 * for something you need to be told. A person waiting for access is blocked
 * until an admin happens to look.
 *
 * Approving here is the same control as on the members page, including the
 * prompt to put them on a project straight after, because being let into the
 * organisation without a project still leaves an empty workspace.
 *
 * Task and mention notifications arrive with Phase 4 and will slot in beside
 * this as further sections.
 */
export default async function NotificationsPage() {
  const viewer = await requireViewer();
  const isAdmin = can(viewer, "org.invite");

  if (!isAdmin) {
    return (
      <PageBody>
        <PageHeader title="Notifications" />
        <EmptyState
          icon={BellOff}
          title="Nothing needs you right now"
          description="Task assignments, mentions and review requests will appear here once tasks arrive."
        />
      </PageBody>
    );
  }

  const [requests, projects, accepted, waiting] = await Promise.all([
    listAccessRequests(viewer.userId, viewer.organizationId),
    listProjectOptions(viewer.organizationId),
    listRecentAcceptances(viewer.organizationId),
    listAwaitingAcceptance(viewer.organizationId),
  ]);
  if (projects.error) logger.warn("notifications.project_options_failed", { message: projects.error.message });

  return (
    <PageBody>
      <PageHeader
        title="Notifications"
        description={
          requests.length === 0
            ? "Nothing is waiting for you."
            : `${requests.length} ${requests.length === 1 ? "person has" : "people have"} asked to join and cannot see anything yet.`
        }
      />

      <section aria-labelledby="access-heading" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="access-heading" className="text-xl font-medium">
            Someone tried to get in
          </h2>
          <p className="text-[15px] text-fg-muted">
            Anyone can create an account. Nobody sees company data until you approve them here.
          </p>
        </div>

        {requests.length === 0 ? (
          <EmptyState
            variant="well"
            icon={DoorOpen}
            title="No one is waiting"
            description="New sign-ups appear here the moment they happen."
          />
        ) : (
          <AccessRequests requests={requests} projects={projects.data ?? []} projectsFailed={Boolean(projects.error)} />
        )}
      </section>

      <section aria-labelledby="waiting-heading" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="waiting-heading" className="text-xl font-medium">
            Handed out, not picked up
          </h2>
          <p className="text-[15px] text-fg-muted">
            Assigned work nobody has acknowledged yet. This is the list that tells you whether someone has actually seen
            what you gave them.
          </p>
        </div>
        <AcceptanceList rows={waiting.data ?? []} mode="waiting" />
      </section>

      <section aria-labelledby="accepted-heading" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="accepted-heading" className="text-xl font-medium">
            Recently accepted
          </h2>
          <p className="text-[15px] text-fg-muted">Who has taken on what, most recent first.</p>
        </div>
        <AcceptanceList rows={accepted.data ?? []} mode="accepted" />
      </section>
    </PageBody>
  );
}
