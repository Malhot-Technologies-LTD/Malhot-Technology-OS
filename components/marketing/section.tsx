import type { ReactNode } from "react";

import { Chevron } from "@/components/marketing/mark";
import { cn } from "@/lib/utils";

/**
 * Website layout primitives. Every section is composed from these, so the type
 * scale and vertical rhythm are decided once here rather than per page.
 *
 * The register is a conventional business site: a white reading surface, light
 * grey for alternating sections, and navy for the closing call to action and
 * the footer. Restraint is the point — no textures, no motion, one accent.
 */

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1180px] px-6 md:px-10", className)}>{children}</div>;
}

export type Tone = "light" | "subtle" | "ink";

const toneSurface: Record<Tone, string> = {
  light: "bg-bg text-fg",
  subtle: "bg-bg-subtle text-fg",
  ink: "bg-site-ink text-white",
};

export function Section({
  id,
  tone = "light",
  className,
  containerClassName,
  children,
  ...rest
}: {
  id?: string;
  tone?: Tone;
  className?: string;
  containerClassName?: string;
  children: ReactNode;
  "aria-labelledby"?: string;
  "aria-label"?: string;
}) {
  return (
    <section id={id} className={cn("py-16 md:py-20 lg:py-24", toneSurface[tone], className)} {...rest}>
      <Container className={containerClassName}>{children}</Container>
    </section>
  );
}

/** Small label above a heading. Plain uppercase text — not a pill, not a badge. */
export function Eyebrow({
  children,
  tone = "light",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-[12px] font-semibold tracking-[0.14em] uppercase",
        tone === "ink" ? "text-site-blue-bright" : "text-brand",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Page heading. Deliberately moderate: large enough to lead, not a poster. */
export function Display({
  as: Tag = "h1",
  className,
  children,
}: {
  as?: "h1" | "h2" | "p";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      className={cn(
        "text-[clamp(2.125rem,4.2vw,3.25rem)] leading-[1.1] font-bold tracking-[-0.025em] text-balance",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** Section heading, one step below Display. */
export function Title({
  as: Tag = "h2",
  id,
  className,
  children,
}: {
  as?: "h2" | "h3";
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      id={id}
      className={cn(
        "text-[clamp(1.625rem,2.6vw,2.125rem)] leading-[1.15] font-bold tracking-[-0.02em] text-balance",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** A word set in the brand blue inside a heading. Solid colour, never a gradient. */
export function Accent({ children, tone = "light" }: { children: ReactNode; tone?: Tone }) {
  return <span className={tone === "ink" ? "text-site-blue-bright" : "text-brand"}>{children}</span>;
}

/** Standard section opening: eyebrow, heading, optional intro paragraph. */
export function SectionHead({
  id,
  eyebrow,
  title,
  intro,
  tone = "light",
  className,
  children,
}: {
  id: string;
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  tone?: Tone;
  className?: string;
  children?: ReactNode;
}) {
  const ink = tone === "ink";
  return (
    <div className={cn("flex max-w-3xl flex-col gap-4", className)}>
      {eyebrow ? <Eyebrow tone={tone}>{eyebrow}</Eyebrow> : null}
      <Title id={id} className={ink ? "text-white" : "text-fg"}>
        {title}
      </Title>
      {intro ? (
        <p className={cn("text-[17px] leading-relaxed", ink ? "text-site-ink-fg-muted" : "text-fg-muted")}>{intro}</p>
      ) : null}
      {children ? <div className="flex flex-wrap items-center gap-5 pt-1">{children}</div> : null}
    </div>
  );
}

/** Hairline that reads as a drawn rule on either surface. */
export function Rule({ tone = "light", className }: { tone?: Tone; className?: string }) {
  return <hr className={cn("border-0 border-t", tone === "ink" ? "border-white/15" : "border-border", className)} />;
}

export function ChevronList({
  items,
  tone = "light",
  className,
}: {
  items: readonly string[];
  tone?: Tone;
  className?: string;
}) {
  const ink = tone === "ink";
  return (
    <ul className={cn("flex flex-col gap-2.5", className)}>
      {items.map((item) => (
        <li
          key={item}
          className={cn("flex gap-3 text-[15px] leading-relaxed", ink ? "text-site-ink-fg-muted" : "text-fg-muted")}
        >
          <Chevron className={cn("mt-[0.4em] size-2.5", ink ? "text-site-blue-bright" : "text-brand")} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
