import { Bell } from "lucide-react";
import Link from "next/link";

import { NotificationCount } from "@/components/os/notification-count";

/**
 * Topbar bell, with a count of what is waiting on you.
 *
 * An unread badge is the whole point of the thing. Someone who signed up is
 * blocked until an admin notices, and "notices" cannot mean "happens to open
 * Settings → Members".
 *
 * The number itself lives in notification-count.tsx, because the sidebar row
 * shows the same one and two badges that disagree are worse than no badge.
 */
export function NotificationBell({ userId, organizationId }: { userId: string; organizationId: string }) {
  return (
    <Link
      href="/os/notifications"
      aria-label="Notifications"
      className="relative flex size-9 items-center justify-center rounded-lg text-fg-muted transition-colors duration-[120ms] hover:bg-surface hover:text-fg"
    >
      <Bell className="size-[18px]" aria-hidden="true" />
      <NotificationCount userId={userId} organizationId={organizationId} className="absolute -top-0.5 -right-0.5" />
    </Link>
  );
}
