import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Container, Eyebrow } from "@/components/marketing/section";
import { Button } from "@/components/ui/button";
import type { CaseStudy } from "@/content/work";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";

/** Reusable content blocks for the website (docs/design/design-system.md, marketing-specific). */

export function PageHero({
  eyebrow,
  title,
  lede,
  children,
  size = "default",
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  children?: ReactNode;
  size?: "default" | "large";
}) {
  return (
    <div className="relative overflow-hidden">
      <HeroGlow />
      <Container
        className={cn(
          "relative flex flex-col gap-6 pt-16 pb-16 md:pt-24 md:pb-24",
          size === "large" && "lg:pt-32 lg:pb-32",
        )}
      >
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1
          className={cn(
            "max-w-4xl font-semibold tracking-[-0.03em] text-balance",
            size === "large"
              ? "text-[44px] leading-[1.02] md:text-[64px] lg:text-[72px] lg:leading-[1]"
              : "text-[36px] leading-[1.05] md:text-[48px]",
          )}
        >
          {title}
        </h1>
        {lede ? <p className="max-w-2xl text-lg leading-relaxed text-fg-muted md:text-xl">{lede}</p> : null}
        {children ? <div className="flex flex-wrap items-center gap-3 pt-2">{children}</div> : null}
      </Container>
    </div>
  );
}

/** A restrained brand glow behind hero content. Decorative only; hidden from AT. */
function HeroGlow() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-0"
      style={{
        background:
          "radial-gradient(60% 50% at 20% 0%, color-mix(in oklch, var(--brand) 22%, transparent) 0%, transparent 70%)",
      }}
    />
  );
}

export function CtaBand({ title, lede }: { title: string; lede?: string }) {
  return (
    <section className="border-t border-border bg-bg-subtle py-16 md:py-24">
      <Container className="flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
        <div className="flex max-w-2xl flex-col gap-3">
          <h2 className="text-[32px] leading-[1.1] font-semibold tracking-[-0.025em] md:text-[40px]">{title}</h2>
          {lede ? <p className="text-lg text-fg-muted">{lede}</p> : null}
        </div>
        <div className="flex flex-col items-start gap-3">
          <Button asChild size="lg">
            <Link href="/contact">
              Start a project <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <a
            href={`mailto:${site.contactEmail.value}`}
            className="text-sm text-fg-muted underline-offset-4 hover:underline"
          >
            or email {site.contactEmail.value}
          </a>
        </div>
      </Container>
    </section>
  );
}

export function CaseStudyCard({ study, serviceNames }: { study: CaseStudy; serviceNames: readonly string[] }) {
  return (
    <Link
      href={`/work/${study.slug}`}
      className="group flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 transition-colors duration-[120ms] hover:border-border-strong md:p-8"
    >
      <div className="flex items-center justify-between gap-4 text-xs text-fg-subtle">
        <span>
          {study.client} · {study.year}
        </span>
        {study.placeholder ? <PlaceholderMark /> : null}
      </div>
      <h3 className="text-xl leading-snug font-semibold tracking-[-0.01em] group-hover:underline group-hover:underline-offset-4">
        {study.title}
      </h3>
      <p className="text-sm leading-relaxed text-fg-muted">{study.summary}</p>
      <ul className="mt-auto flex flex-wrap gap-2 pt-2" aria-label="Services">
        {serviceNames.map((name) => (
          <li key={name} className="rounded-sm border border-border px-2 py-0.5 text-xs text-fg-muted">
            {name}
          </li>
        ))}
      </ul>
    </Link>
  );
}

/** Visible marker for content that must be replaced before launch (OD-7). */
export function PlaceholderMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border border-status-warning-border bg-status-warning-bg px-1.5 py-0.5 text-[11px] font-medium text-status-warning-fg",
        className,
      )}
    >
      Placeholder
    </span>
  );
}

export function FeatureList({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-relaxed text-fg-muted">
          <span aria-hidden="true" className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-brand" />
          {item}
        </li>
      ))}
    </ul>
  );
}
