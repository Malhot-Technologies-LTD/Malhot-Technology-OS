import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Container, Eyebrow } from "@/components/marketing/section";
import { SiteButton } from "@/components/marketing/site-button";
import { Picture } from "@/components/marketing/visuals";
import { photos, type Photo } from "@/content/images";
import { site } from "@/content/site";
import type { CaseStudy } from "@/content/work";
import { cn } from "@/lib/utils";

/** Reusable content blocks for the website. */

export function PageHero({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: string;
  children?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden bg-bg-subtle">
      <Backdrop />
      <Container className="relative flex flex-col items-center gap-5 pt-16 pb-16 text-center md:pt-24 md:pb-20">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1 className="max-w-3xl text-[36px] leading-[1.08] font-bold tracking-[-0.025em] text-balance text-fg md:text-[52px]">
          {title}
        </h1>
        {lede ? <p className="max-w-2xl text-base leading-relaxed text-fg-muted md:text-lg">{lede}</p> : null}
        {children ? <div className="flex flex-wrap items-center justify-center gap-3 pt-2">{children}</div> : null}
      </Container>
    </div>
  );
}

/** Soft blue wash + dot grid behind heroes. Decorative only. */
export function Backdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{
        backgroundImage:
          "radial-gradient(70% 60% at 50% 0%, color-mix(in oklch, var(--brand) 12%, transparent) 0%, transparent 70%)",
      }}
    />
  );
}

export function CtaBand({ title, lede }: { title: string; lede?: string }) {
  return (
    <section className="py-16 md:py-20">
      <Container>
        <div className="relative overflow-hidden rounded-2xl bg-site-navy px-6 py-12 text-white md:px-14 md:py-16">
          <Pattern />
          <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex max-w-2xl flex-col gap-3">
              <h2 className="text-[28px] leading-[1.1] font-bold tracking-[-0.02em] md:text-[36px]">{title}</h2>
              {lede ? <p className="text-base text-white/80 md:text-lg">{lede}</p> : null}
            </div>
            <div className="flex flex-col items-start gap-3">
              <SiteButton asChild variant="white" size="lg">
                <Link href="/contact">
                  Start a project <ArrowRight aria-hidden="true" />
                </Link>
              </SiteButton>
              <a
                href={`mailto:${site.contactEmail.value}`}
                className="text-sm text-white/80 underline-offset-4 hover:underline"
              >
                or email {site.contactEmail.value}
              </a>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/** Diagonal line texture used on the blue bands (the reference uses a similar motif). */
export function Pattern() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-[0.12]"
      style={{
        backgroundImage: "repeating-linear-gradient(135deg, white 0 1px, transparent 1px 22px)",
      }}
    />
  );
}

const STUDY_PHOTOS: Record<string, Photo> = {
  "delivery-tracking-tool": photos.deskOverhead,
  "marketing-site-rebuild": photos.codeLaptop,
};

export function caseStudyPhoto(slug: string): Photo {
  return STUDY_PHOTOS[slug] ?? photos.workshop;
}

export function CaseStudyCard({ study, serviceNames }: { study: CaseStudy; serviceNames: readonly string[] }) {
  return (
    <Link
      href={`/work/${study.slug}`}
      className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-2xl bg-site-navy text-white shadow-s md:aspect-[16/11]"
    >
      <Picture
        photo={caseStudyPhoto(study.slug)}
        sizes="(min-width: 768px) 50vw, 100vw"
        className="absolute inset-0 transition-transform duration-[400ms] ease-standard group-hover:scale-[1.03]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-site-navy via-site-navy/55 to-transparent"
      />
      <div className="relative flex flex-col gap-3 p-6 md:p-8">
        <div className="flex items-center gap-3 text-xs text-white/70">
          <span>
            {study.client} · {study.year}
          </span>
          {study.placeholder ? <PlaceholderMark className="text-status-warning-bg" /> : null}
        </div>
        <h3 className="text-xl leading-snug font-bold tracking-[-0.01em] md:text-2xl">{study.title}</h3>
        <p className="line-clamp-2 max-w-lg text-sm text-white/80">{study.summary}</p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {serviceNames.map((name) => (
            <span key={name} className="rounded-full border border-white/25 px-2.5 py-1 text-xs text-white/85">
              {name}
            </span>
          ))}
          <span className="ml-auto inline-flex items-center gap-1 text-sm font-semibold">
            Read more <ArrowUpRight aria-hidden="true" className="size-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Visible marker for content that must be replaced before launch (OD-7). */
export function PlaceholderMark({ className }: { className?: string }) {
  return (
    <span className={cn("text-[11px] font-medium tracking-wide text-status-warning-fg uppercase", className)}>
      Placeholder content
    </span>
  );
}

export function FeatureList({ items, className }: { items: readonly string[]; className?: string }) {
  return (
    <ul className={cn("flex flex-col gap-2.5", className)}>
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-relaxed text-fg-muted md:text-base">
          <span
            aria-hidden="true"
            className="mt-[0.45em] flex size-4 shrink-0 items-center justify-center rounded-full bg-brand-subtle"
          >
            <span className="size-1.5 rounded-full bg-brand" />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function ServiceRow({
  name,
  summary,
  href,
  icon,
  index,
}: {
  name: string;
  summary: string;
  href: string;
  icon: ReactNode;
  index: number;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-5 border-b border-border py-6 first:pt-0 last:border-b-0 last:pb-0"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-subtle text-brand [&_svg]:size-5">
        {icon}
      </span>
      <span className="flex flex-1 flex-col gap-1">
        <span className="flex items-baseline gap-3">
          <span className="font-mono text-xs text-fg-subtle">0{index + 1}</span>
          <span className="text-lg font-bold tracking-[-0.01em] text-fg group-hover:text-brand">{name}</span>
        </span>
        <span className="text-sm leading-relaxed text-fg-muted md:text-base">{summary}</span>
        <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand">
          Learn more{" "}
          <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </span>
    </Link>
  );
}
