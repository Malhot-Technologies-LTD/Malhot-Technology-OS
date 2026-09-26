import type { Metadata } from "next";
import Image from "next/image";

import { Icon } from "@/components/site/brand/Icon";
import { PageHero } from "@/components/site/layout/PageHero";
import { CtaBand } from "@/components/site/sections/CtaBand";
import { Eyebrow, Section, SectionHeader } from "@/components/site/ui/Section";
import { commitments, media, site, timeline } from "@/content/site";

export const metadata: Metadata = {
  title: "About",
  description: `${site.name} is a software development company in ${site.location}. Who we are, what we believe and how we work.`,
};

const values = [
  {
    title: "Clarity over noise",
    copy: "We remove everything that does not serve the user or the business. Simple is harder, and worth it.",
    icon: "layers" as const,
  },
  {
    title: "Quality as the baseline",
    copy: "Accessibility, performance and testing are part of the job, not extras we charge for later.",
    icon: "shield" as const,
  },
  {
    title: "Partnership, not tickets",
    copy: "We ask questions, propose alternatives and take ownership of outcomes, not just deliverables.",
    icon: "message" as const,
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow={`About ${site.name}`}
        title="A software team that finishes what it starts"
        lead={`${site.legalName} designs, builds and ships software for businesses and organisations. We are based in ${site.location}.`}
      />

      <Section labelledBy="story-title">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Eyebrow>Who we are</Eyebrow>
            <h2 id="story-title" className="mt-3 text-[clamp(1.75rem,3.2vw,2.4rem)] leading-[1.15] font-semibold">
              Built on one rule: only ship work we would put our name on
            </h2>
            <div className="mt-6 space-y-4 text-[1.02rem] leading-relaxed text-fg-muted">
              <p>
                {site.name} started in Kigali with a small group of engineers who wanted to build software the way it
                should be built: planned with the client, tested before it ships, and documented so the client owns what
                they paid for.
              </p>
              <p>
                Today we are a compact team covering frontend and backend engineering, quality assurance, project
                management and marketing. Everyone who works on your project is part of that team.
              </p>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-l)]">
            <Image
              src={media.meeting.src}
              alt={media.meeting.alt}
              fill
              sizes="(min-width: 1024px) 36rem, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </Section>

      <Section id="values" tone="muted" labelledBy="values-title">
        <SectionHeader
          id="values-title"
          eyebrow="What we believe"
          title="Principles we do not compromise on"
          align="center"
        />
        <ul className="mt-12 grid gap-5 md:grid-cols-3">
          {values.map((value) => (
            <li key={value.title} className="rounded-[var(--radius-l)] border border-border bg-white p-7">
              <span className="grid h-11 w-11 place-items-center rounded-[var(--radius-m)] bg-brand-subtle text-brand">
                <Icon name={value.icon} className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-[1.15rem] font-semibold text-fg">{value.title}</h3>
              <p className="mt-2.5 text-[0.95rem] leading-relaxed text-fg-muted">{value.copy}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="journey" labelledBy="journey-title">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <SectionHeader
              id="journey-title"
              eyebrow="Our journey"
              title="How we got here"
              lead="From a small group of engineers to a full product team."
            />
          </div>
          <ol className="relative border-l-2 border-border pl-8">
            {timeline.map((item) => (
              <li key={item.year} className="relative pb-10 last:pb-0">
                <span
                  aria-hidden
                  className="absolute top-1 -left-[2.55rem] h-4 w-4 rounded-full border-[3px] border-white bg-brand ring-2 ring-brand"
                />
                <p className="text-[0.9rem] font-semibold text-brand">{item.year}</p>
                <h3 className="mt-1 text-[1.15rem] font-semibold text-fg">{item.title}</h3>
                <p className="mt-2 max-w-lg text-[0.95rem] leading-relaxed text-fg-muted">{item.copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section id="commitments" tone="ink" labelledBy="promise-title">
        <SectionHeader id="promise-title" onInk eyebrow="Our commitments" title="What working with us looks like" />
        <ul className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
          {commitments.map((item) => (
            <li key={item.title} className="border-t border-site-ink-line pt-6">
              <h3 className="text-[1.15rem] font-semibold text-white">{item.title}</h3>
              <p className="mt-2.5 text-[0.95rem] leading-relaxed text-site-ink-fg-muted">{item.copy}</p>
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand title="Let's build something together" />
    </>
  );
}
