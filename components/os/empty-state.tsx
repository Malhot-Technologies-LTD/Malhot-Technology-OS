import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Primary action; every empty state should offer one where an action exists. */
  action?: ReactNode;
  /** `well` sits inside a card and stays quiet; `page` stands alone and takes more room. */
  variant?: "page" | "well";
  className?: string;
};

/**
 * Nothing-here panel.
 *
 * A recessed well rather than a dashed outline: dashed reads as "drop a file",
 * and at the size these reach on a dashboard it turns into visual noise. The
 * well says "this area is real, it is simply empty" and sits calmly inside a
 * card, which is where most empty states in the OS actually live.
 */
export function EmptyState({ icon: Icon, title, description, action, variant = "page", className }: Props) {
  const well = variant === "well";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-bg-subtle text-center",
        well ? "px-6 py-10" : "px-8 py-20",
        className,
      )}
    >
      {Icon ? (
        <span
          className={cn(
            "flex items-center justify-center rounded-lg border border-border bg-surface text-fg-subtle",
            well ? "size-11" : "size-14",
          )}
        >
          <Icon className={well ? "size-5" : "size-7"} aria-hidden="true" />
        </span>
      ) : null}
      <div className="flex flex-col gap-1">
        <p className={cn("font-medium", well ? "text-base" : "text-xl")}>{title}</p>
        {description ? <p className="max-w-md text-base text-fg-muted">{description}</p> : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
