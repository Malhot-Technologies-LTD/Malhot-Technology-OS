import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * ErrorState (docs/design/design-system.md#components). Distinct from EmptyState:
 * empty means "nothing here yet, do something"; this means "we could not load it".
 *
 * Says what went wrong and what to do about it, in the interface's voice — no
 * apology, no raw exception text, and never a dead end without an action.
 */
export function ErrorState({
  title = "This could not be loaded",
  description,
  reference,
  action,
  className,
}: {
  title?: string;
  description?: string;
  /** Support reference (an error digest); shown last, in mono. */
  reference?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-md border border-status-danger-border bg-status-danger-bg px-6 py-12 text-center",
        className,
      )}
    >
      <AlertTriangle className="size-6 text-status-danger-fg" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{title}</p>
        {description ? <p className="max-w-md text-sm text-fg-muted">{description}</p> : null}
      </div>
      {action}
      {reference ? <p className="font-mono text-xs text-fg-subtle">Reference {reference}</p> : null}
    </div>
  );
}
