import { Bell } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { countAccessRequests } from "@/lib/supabase/elevated/access-requests";
import { cn } from "@/lib/utils";

/**
 * Topbar bell, with a count of the people waiting to be let in.
 *
 * The count comes from an admin API call, so it is wrapped in Suspense and
 * streamed: the bell renders immediately and the badge appears a moment later.
 * A number nobody is waiting for must never hold up the page they asked for.
 *
 * An unread badge is the whole point of the thing. Someone who signed up is
 * blocked until an admin notices, and "notices" cannot mean "happens to open
 * Settings → Members".
 */
export function NotificationBell({ userId, organizationId }: { userId: string; organizationId: string }) {
  return (
    <Link
      href="/os/notifications"
      aria-label="Notifications"
      className="relative flex size-9 items-center justify-center rounded-lg text-fg-muted transition-colors duration-[120ms] hover:bg-surface hover:text-fg"
    >
      <Bell className="size-[18px]" aria-hidden="true" />
      <Suspense fallback={null}>
        <WaitingBadge userId={userId} organizationId={organizationId} />
      </Suspense>
    </Link>
  );
}

async function WaitingBadge({ userId, organizationId }: { userId: string; organizationId: string }) {
  const waiting = await countAccessRequests(userId, organizationId);
  if (waiting === 0) return null;

  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "absolute -top-0.5 -right-0.5 flex min-w-4.5 items-center justify-center rounded-full bg-status-danger-fg px-1",
          "text-[10px] leading-4 font-semibold text-bg tabular-nums",
        )}
      >
        {waiting > 9 ? "9+" : waiting}
      </span>
      {/* The badge is decorative; the count belongs in the link's own name. */}
      <span className="sr-only">
        {waiting} {waiting === 1 ? "person is" : "people are"} waiting for access
      </span>
    </>
  );
}
