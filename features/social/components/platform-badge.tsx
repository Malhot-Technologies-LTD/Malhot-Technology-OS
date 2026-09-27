import { cn } from "@/lib/utils";

import { PLATFORM_META, type Platform } from "../schemas";

/**
 * A platform's name with a small brand-coloured swatch. The name always shows:
 * the colour helps scanning, it never carries the meaning alone.
 */
export function PlatformBadge({
  platform,
  handle,
  className,
}: {
  platform: Platform;
  handle?: string;
  className?: string;
}) {
  const meta = PLATFORM_META[platform];
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2 text-sm", className)}>
      <span
        aria-hidden="true"
        className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10"
        style={{ backgroundColor: meta.color }}
      />
      <span className="truncate">
        <span className="font-medium">{meta.label}</span>
        {handle ? <span className="text-fg-muted"> · @{handle}</span> : null}
      </span>
    </span>
  );
}
