import Link from "next/link";
import type { ReactNode } from "react";

import { Chevron } from "@/components/marketing/mark";
import { Container, Display, Eyebrow, Title } from "@/components/marketing/section";
import { ArrowLink, SiteButton } from "@/components/marketing/site-button";
import { site } from "@/content/site";
import type { CaseStudy } from "@/content/work";
import { cn } from "@/lib/utils";

/** Reusable content blocks for the website. */

/** Inner-page opening: a light grey band with the heading and a one-line lede. */
export function PageHero({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: string;
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-border bg-bg-subtle">
      <Container className="flex flex-col gap-5 py-14 md:py-20">
        <Eyebrow>{eyebrow}</Eyebrow>
        <Display className="max-w-3xl text-fg">{title}</Display>
        {lede ? <p className="max-w-2xl text-[17px] leading-relaxed text-fg-muted md:text-lg">{lede}</p> : null}
        {children ? <div className="flex flex-wrap items-center gap-5 pt-1">{children}</div> : null}
      </Container>
    </div>
  );
}

/** Closing call to action. Navy, so it hands off to the footer without a seam. */
export function CtaBand({ title, lede }: { title: ReactNode; lede?: string }) {
  return (
    <section className="bg-site-ink text-white">
      <Container className="flex flex-col gap-8 py-16 md:flex-row md:items-center md:justify-between md:py-20">
        <div className="flex max-w-xl flex-col gap-3">
          <Title className="text-white">{title}</Title>
          {lede ? <p className="text-[17px] leading-relaxed text-site-ink-fg-muted">{lede}</p> : null}
        </div>
        <div className="flex shrink-0 flex-col items-start gap-3">
          <SiteButton asChild size="lg">
            <Link href="/contact">Start a project</Link>
          </SiteButton>
          <a
            href={`mailto:${site.contactEmail.value}`}
            className="text-[15px] text-site-ink-fg-muted underline-offset-4 hover:text-white hover:underline"
          >
            or email {site.contactEmail.value}
          </a>
        </div>
      </Container>
    </section>
  );
}

/** A case study as a plain bordered card: label, title, summary, link. */
export function CaseStudyCard({ study, serviceNames }: { study: CaseStudy; serviceNames: readonly string[] }) {
  return (
    <article className="flex flex-col gap-4 border border-border bg-white p-7 transition-colors duration-150 hover:border-border-strong md:p-8">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-fg-subtle">
        <span>{study.client}</span>
        <span aria-hidden="true">·</span>
        <span>{study.year}</span>
        {study.placeholder ? <PlaceholderMark /> : null}
      </div>

      <h3 className="text-[21px] leading-snug font-bold tracking-[-0.02em] text-fg">
        <Link href={`/work/${study.slug}`} className="underline-offset-4 hover:underline">
          {study.title}
        </Link>
      </h3>

      <p className="text-[15px] leading-relaxed text-fg-muted">{study.summary}</p>

      <p className="text-sm text-fg-subtle">{serviceNames.join(" · ")}</p>

      <ArrowLink asChild className="mt-auto pt-2">
        <Link href={`/work/${study.slug}`}>Read the case study</Link>
      </ArrowLink>
    </article>
  );
}

/** Compact bulleted list used inside service and process blocks. */
export function FeatureList({ items, tone = "light" }: { items: readonly string[]; tone?: "light" | "ink" }) {
  const ink = tone === "ink";
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li
          key={item}
          className={cn("flex gap-2.5 text-[15px] leading-relaxed", ink ? "text-site-ink-fg-muted" : "text-fg-muted")}
        >
          <Chevron className={cn("mt-[0.4em] size-2.5", ink ? "text-site-blue-bright" : "text-brand")} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Visible marker for content that must be replaced before launch (OD-7). */
export function PlaceholderMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[3px] bg-status-warning-bg px-1.5 py-0.5 text-[11px] font-semibold text-status-warning-fg",
        className,
      )}
    >
      Placeholder content
    </span>
  );
}
