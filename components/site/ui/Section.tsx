import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Section rhythm for the website.
 *
 * Every page is a stack of these, so the vertical spacing, the three
 * backgrounds and the heading scale are decided here once rather than per
 * page. `ink` is the navy band; it adds `on-ink` so focus rings turn white
 * (styles/site.css).
 */
type Tone = "white" | "muted" | "ink";

const tones: Record<Tone, string> = {
  white: "bg-bg",
  muted: "bg-bg-subtle",
  ink: "on-ink bg-site-ink text-white",
};

export function Section({
  tone = "white",
  id,
  className,
  children,
  labelledBy,
}: {
  tone?: Tone;
  id?: string;
  className?: string;
  children: ReactNode;
  labelledBy?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn("scroll-mt-20 py-16 sm:py-20 lg:py-24", tones[tone], className)}
    >
      <div className="shell">{children}</div>
    </section>
  );
}

/** Small uppercase label above a heading. On navy it switches to the light blue. */
export function Eyebrow({ children, onInk = false }: { children: ReactNode; onInk?: boolean }) {
  return (
    <p
      className={cn(
        "text-[0.75rem] font-semibold tracking-[0.14em] uppercase",
        onInk ? "text-site-blue-bright" : "text-brand",
      )}
    >
      {children}
    </p>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  lead,
  id,
  align = "left",
  onInk = false,
  action,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  id?: string;
  align?: "left" | "center";
  onInk?: boolean;
  /** A link or button set against the heading on wide screens, e.g. "See all projects". */
  action?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6",
        align === "center" ? "items-center text-center" : "md:flex-row md:items-end md:justify-between",
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow ? <Eyebrow onInk={onInk}>{eyebrow}</Eyebrow> : null}
        <h2
          id={id}
          className={cn(
            "mt-3 text-[clamp(1.75rem,3.2vw,2.4rem)] leading-[1.15] font-semibold",
            onInk ? "text-white" : "text-fg",
          )}
        >
          {title}
        </h2>
        {lead ? (
          <p className={cn("mt-4 text-[1.05rem] leading-relaxed", onInk ? "text-site-ink-fg-muted" : "text-fg-muted")}>
            {lead}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** A tick list. Used for service bullets, deliverables and project features. */
export function CheckList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("space-y-2.5", className)}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-[0.925rem] leading-snug text-fg-muted">
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="mt-[0.2rem] h-4 w-4 shrink-0 text-brand"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m5 12.5 4.5 4.5L19 7" />
          </svg>
          {item}
        </li>
      ))}
    </ul>
  );
}
