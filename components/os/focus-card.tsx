import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The one coloured surface on a page.
 *
 * Everything else in the OS separates with borders on neutral surfaces, so a
 * solid brand panel is the strongest signal the system has — which is exactly
 * why a page gets at most one, and only for the thing you should look at first.
 * A second would cancel the first out.
 *
 * Text on it reads from `--brand-solid-fg` / `--brand-solid-muted`, never from
 * `--fg`: the surface is the same colour in both themes, so theme-aware text
 * tokens would fail the contrast check in one of them.
 */

type Props = {
  /** Small uppercase label: the state this card is reporting. */
  eyebrow: string;
  title: string;
  description?: string;
  /** Large right-hand figure, with its own caption. */
  figure?: { value: string; unit?: string; caption: string };
  action?: { label: string; href: string };
  children?: ReactNode;
  className?: string;
};

export function FocusCard({ eyebrow, title, description, figure, action, children, className }: Props) {
  return (
    <section
      className={cn(
        "flex flex-col gap-7 rounded-lg bg-brand-solid p-8 text-brand-solid-fg sm:flex-row sm:items-center sm:justify-between sm:gap-12",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-3">
        <span className="w-fit rounded-full bg-brand-solid-fg/15 px-3 py-1.5 text-xs font-medium tracking-[0.08em] uppercase">
          {eyebrow}
        </span>
        <h2 className="text-[32px] leading-tight font-semibold tracking-[-0.02em]">{title}</h2>
        {description ? (
          <p className="max-w-2xl text-base leading-relaxed text-brand-solid-muted">{description}</p>
        ) : null}
        {children}
        {action ? (
          <Link
            href={action.href}
            className="mt-2 inline-flex h-11 w-fit items-center gap-2 rounded-xl bg-brand-solid-fg px-5 text-[15px] font-medium text-brand-solid transition-opacity duration-[120ms] hover:opacity-90"
          >
            {action.label}
            <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      {figure ? (
        <div className="flex shrink-0 flex-col gap-1 sm:items-end sm:text-right">
          <span className="text-xs font-medium tracking-[0.08em] text-brand-solid-muted uppercase">
            {figure.caption}
          </span>
          <span className="flex items-baseline gap-1.5 sm:justify-end">
            <span className="text-[76px] leading-none font-semibold tabular-nums">{figure.value}</span>
            {figure.unit ? <span className="text-base text-brand-solid-muted">{figure.unit}</span> : null}
          </span>
        </div>
      ) : null}
    </section>
  );
}
