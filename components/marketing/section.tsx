import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Website layout primitives. Light register (data-surface="site" in
 * app/(marketing)/layout.tsx): white sections alternate with a faint blue-grey,
 * with occasional navy/gradient bands for emphasis.
 */

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1200px] px-4 md:px-6", className)}>{children}</div>;
}

type SectionProps = {
  id?: string;
  tone?: "white" | "subtle" | "navy";
  className?: string;
  children: ReactNode;
  "aria-labelledby"?: string;
};

export function Section({ id, tone = "white", className, children, ...rest }: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "py-16 md:py-20 lg:py-24",
        tone === "subtle" && "bg-bg-subtle",
        tone === "navy" && "bg-site-navy text-white",
        className,
      )}
      {...rest}
    >
      <Container>{children}</Container>
    </section>
  );
}

type HeadingProps = {
  id?: string;
  eyebrow?: string;
  title: ReactNode;
  lede?: string;
  align?: "start" | "center";
  className?: string;
  onNavy?: boolean;
};

export function SectionHeading({
  id,
  eyebrow,
  title,
  lede,
  align = "center",
  className,
  onNavy = false,
}: HeadingProps) {
  return (
    <div
      className={cn(
        "flex max-w-3xl flex-col gap-4",
        align === "center" ? "mx-auto items-center text-center" : "items-start",
        className,
      )}
    >
      {eyebrow ? <Eyebrow onNavy={onNavy}>{eyebrow}</Eyebrow> : null}
      <h2
        id={id}
        className={cn(
          "text-[30px] leading-[1.12] font-bold tracking-[-0.02em] text-balance md:text-[40px] lg:text-[44px]",
          onNavy ? "text-white" : "text-fg",
        )}
      >
        {title}
      </h2>
      {lede ? (
        <p className={cn("max-w-2xl text-base leading-relaxed md:text-lg", onNavy ? "text-white/75" : "text-fg-muted")}>
          {lede}
        </p>
      ) : null}
    </div>
  );
}

/** Label above headings: short rules either side, as on the reference site. */
export function Eyebrow({ children, onNavy = false }: { children: ReactNode; onNavy?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-3 text-xs font-semibold tracking-[0.14em] uppercase",
        onNavy ? "text-white/80" : "text-brand",
      )}
    >
      <span aria-hidden="true" className={cn("h-px w-6", onNavy ? "bg-white/50" : "bg-brand/60")} />
      {children}
      <span aria-hidden="true" className={cn("h-px w-6", onNavy ? "bg-white/50" : "bg-brand/60")} />
    </span>
  );
}

/** Brand-blue words inside a heading. */
export function Accent({ children }: { children: ReactNode }) {
  return <span className="text-brand">{children}</span>;
}
