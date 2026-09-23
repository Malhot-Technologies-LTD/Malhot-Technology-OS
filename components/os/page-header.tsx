import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  /** Small uppercase label above the title — context the title cannot carry alone. */
  eyebrow?: string;
  title: string;
  description?: string;
  /** Right-aligned actions (buttons, menus). */
  actions?: ReactNode;
  /** Right-aligned panel that outranks actions: a status card, a figure, a countdown. */
  aside?: ReactNode;
  className?: string;
};

export function PageHeader({ eyebrow, title, description, actions, aside, className }: Props) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-6", className)}>
      <div className="flex min-w-0 flex-col gap-2">
        {eyebrow ? <p className="text-xs font-medium tracking-[0.08em] text-fg-subtle uppercase">{eyebrow}</p> : null}
        <h1 className="text-[40px] leading-[1.08] font-semibold tracking-[-0.025em]">{title}</h1>
        {description ? <p className="max-w-3xl text-base text-fg-muted">{description}</p> : null}
      </div>
      {aside ?? (actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null)}
    </div>
  );
}

/**
 * Standard content frame.
 *
 * Full-bleed by default: the OS is a data surface, and a centred column on a
 * 2560px monitor wastes the two thirds of the screen the person paid for.
 * Padding grows with the viewport instead of the content narrowing, so wide
 * screens gain columns rather than margins.
 *
 * `width="reading"` opts a page back into a measure. Use it for forms and prose,
 * where a full-width input is harder to use, not easier — the eye loses the
 * start of the next line. Settings is the main caller.
 */
export function PageBody({
  children,
  width = "full",
  className,
}: {
  children: ReactNode;
  width?: "full" | "reading";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-rise-stagger flex w-full flex-col gap-7 p-6 sm:gap-9 sm:p-8 xl:px-10 2xl:px-14",
        width === "reading" && "mx-auto max-w-5xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
