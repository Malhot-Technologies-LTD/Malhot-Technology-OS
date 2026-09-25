import { cn } from "@/lib/utils";

/**
 * The little red number: notification counts on the bell and the sidebar row.
 *
 * Kept apart from notification-count.tsx — which reaches for admin-only queries
 * and so can never cross a client boundary — precisely so the component gallery
 * can render the real pill against fixture data instead of a lookalike.
 *
 * Caps at "9+". Past a handful the exact number stops changing what you do
 * about it, and three digits would not fit the dot anyway.
 */
export function CountPill({ count, className }: { count: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex min-w-4.5 items-center justify-center rounded-full bg-status-danger-fg px-1",
        "text-[10px] leading-4 font-semibold text-bg tabular-nums",
        className,
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

/** The count belongs in the link's accessible name; the pill itself is decorative. */
export function countLabel(count: number): string {
  return `${count} ${count === 1 ? "thing needs" : "things need"} your attention`;
}
