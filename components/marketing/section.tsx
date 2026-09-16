import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Website layout primitives (docs/design/design-system.md#website).
 * Content is 1200px wide with 16/24px gutters; sections carry the vertical
 * rhythm. `tone="light"` re-scopes the tokens so light bands sit inside the
 * dark-dominant page.
 */

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1200px] px-4 md:px-6", className)}>{children}</div>;
}

type SectionProps = {
  id?: string;
  tone?: "dark" | "light" | "subtle";
  className?: string;
  children: ReactNode;
  "aria-labelledby"?: string;
};

export function Section({ id, tone = "dark", className, children, ...rest }: SectionProps) {
  return (
    <section
      id={id}
      data-theme={tone === "light" ? "light" : undefined}
      className={cn(
        "py-16 md:py-24 lg:py-32",
        tone === "light" && "bg-bg text-fg",
        tone === "subtle" && "bg-bg-subtle",
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
  title: string;
  lede?: string;
  align?: "start" | "center";
  className?: string;
};

export function SectionHeading({ id, eyebrow, title, lede, align = "start", className }: HeadingProps) {
  return (
    <div className={cn("flex max-w-3xl flex-col gap-4", align === "center" && "mx-auto text-center", className)}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 id={id} className="text-[32px] leading-[1.1] font-semibold tracking-[-0.025em] md:text-[44px] lg:text-[48px]">
        {title}
      </h2>
      {lede ? <p className="text-lg leading-relaxed text-fg-muted">{lede}</p> : null}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-medium tracking-[0.08em] text-brand uppercase">{children}</p>;
}
