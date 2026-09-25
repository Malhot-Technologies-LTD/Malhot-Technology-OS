import { Suspense, cache } from "react";

import { CountPill, countLabel } from "@/components/os/count-pill";
import { listAwaitingAcceptance } from "@/features/tasks/queries";
import { countAccessRequests } from "@/lib/supabase/elevated/access-requests";

/**
 * How many things are waiting on one person, and the badge that says so.
 *
 * Two things wait on someone here: a person outside asking to be let in, and
 * work handed out that nobody has acknowledged. Both are lists that clear
 * themselves once acted on, which is what makes them fit to be counted —
 * "three people accepted something" would never go away and would teach people
 * to ignore the badge.
 *
 * RLS scopes the task half without help: tasks_select needs is_project_member
 * and an org admin resolves to a member of every project, so a manager counts
 * their projects and an admin counts the company.
 *
 * Wrapped in `cache` because two places ask the same question in one render —
 * the topbar bell and the sidebar row. The count costs an admin API call, and
 * the same number twice is not worth paying for twice.
 */
export const countAttention = cache(async (userId: string, organizationId: string): Promise<number> => {
  const [access, unaccepted] = await Promise.all([
    countAccessRequests(userId, organizationId),
    listAwaitingAcceptance(organizationId, 100),
  ]);
  return access + (unaccepted.data?.length ?? 0);
});

/**
 * The count, streamed.
 *
 * Suspense, not await: the bell and the nav row render immediately and the
 * number lands a moment later. A count nobody is waiting for must never hold up
 * the page they asked for. Renders nothing at all when nothing is waiting —
 * a badge reading "0" is a badge you learn to stop seeing.
 */
export function NotificationCount({
  userId,
  organizationId,
  className,
}: {
  userId: string;
  organizationId: string;
  className?: string;
}) {
  return (
    <Suspense fallback={null}>
      <Count userId={userId} organizationId={organizationId} className={className} />
    </Suspense>
  );
}

async function Count({
  userId,
  organizationId,
  className,
}: {
  userId: string;
  organizationId: string;
  className?: string;
}) {
  const waiting = await countAttention(userId, organizationId);
  if (waiting === 0) return null;

  return (
    <>
      <CountPill count={waiting} className={className} />
      <span className="sr-only">{countLabel(waiting)}</span>
    </>
  );
}
