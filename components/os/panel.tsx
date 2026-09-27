import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The white, bordered block every OS page is built from: a heading, an optional
 * one-line description and action, then the content. One definition so the
 * dashboard and the project pages share the same rhythm.
 */
export function Panel({
  title,
  description,
  action,
  className,
  bodyClassName,
  children,
  id,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
  id?: string;
}) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn("flex min-w-0 flex-col gap-5 rounded-lg border border-border bg-surface p-5", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id={headingId} className="text-base font-semibold tracking-tight">
            {title}
          </h2>
          {description ? <p className="text-[13px] text-fg-subtle">{description}</p> : null}
        </div>
        {action}
      </div>
      {bodyClassName ? <div className={bodyClassName}>{children}</div> : children}
    </section>
  );
}

export function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="flex shrink-0 items-center gap-1 text-[13px] text-fg-muted hover:text-fg hover:underline"
    >
      {children}
      <ArrowRight className="size-3.5" aria-hidden="true" />
    </Link>
  );
}

/** A thin inline bar with its percentage, for table cells and dense rows. */
export function MiniProgress({ done, total, label }: { done: number; total: number; label: string }) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        className="h-1.5 min-w-10 flex-1 overflow-hidden rounded-full bg-bg-subtle"
        role="img"
        aria-label={`${label}: ${done} of ${total}`}
      >
        <span
          className="block h-full rounded-full bg-brand transition-[width] duration-[240ms]"
          style={{ width: `${percent}%` }}
        />
      </span>
      <span className="w-9 shrink-0 text-right text-xs text-fg-muted tabular-nums">{percent}%</span>
    </span>
  );
}
