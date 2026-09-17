import type { Metadata } from "next";
import Link from "next/link";

import { CaseStudyCard, CtaBand, PlaceholderMark } from "@/components/marketing/blocks";
import { Chevron } from "@/components/marketing/mark";
import { Container, Eyebrow, Section, SectionHead } from "@/components/marketing/section";
import { ArrowLink, SiteButton } from "@/components/marketing/site-button";
import { stages } from "@/content/process";
import { getService, services } from "@/content/services";
import { site } from "@/content/site";
import { caseStudies } from "@/content/work";

export const metadata: Metadata = {
  title: { absolute: `${site.name} — ${site.tagline}` },
  description: site.description,
  alternates: { canonical: "/" },
};

/** Three promises, not metrics: we have no measured numbers we may publish yet. */
const PROMISES = [
  "Fixed milestones, agreed before work starts",
  "Working software every week, from week one",
  "A documented handover, so it runs without us",
] as const;

const EXPECTATIONS = [
  {
    title: "One team, start to finish",
    body: "The people who scope the system design it, build it, test it and deploy it. Nothing is handed to a stranger halfway through.",
  },
  {
    title: "Testing is a stage, not a favour",
    body: "Every feature has written test cases and a recorded test run before it is called done. Bugs are tracked to closure.",
  },
  {
    title: "You always know where it stands",
    body: "A plan with dates, a board you can open, and honest weekly notes. If something slips, you hear it from us first.",
  },
  {
    title: "Built to be maintained",
    body: "Mainstream tools, plain code and a handover pack. A new engineer can pick it up without archaeology.",
  },
] as const;

export default function HomePage() {
  return (
    <>
      <Hero />
      <ServicesSection />
      <ProcessSection />
      <WorkSection />
      <ExpectationsSection />
      <CtaBand
        title="Tell us what you are trying to build."
        lede="We reply within two working days, usually with a few questions and a suggested first milestone."
      />
    </>
  );
}

/* ---------------------------------------------------------------- hero ---- */

function Hero() {
  return (
    <div className="border-b border-border bg-white">
      <Container>
        {/* Type only: the headline carries the hero, centred so it is not
            left-aligned against an empty half-page. */}
        <div className="flex flex-col items-center gap-6 py-20 text-center md:py-24 lg:py-28">
          <Eyebrow>Software company · {site.location}</Eyebrow>

          <h1 className="max-w-3xl text-[clamp(2.125rem,4.2vw,3.25rem)] leading-[1.1] font-bold tracking-[-0.025em] text-balance text-fg">
            Software that ships. Systems that last.
          </h1>

          <p className="max-w-2xl text-[17px] leading-relaxed text-fg-muted md:text-lg">
            We design, build and run websites, web applications and internal systems for companies that need software to
            work — then hand over the documents to keep it running.
          </p>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <SiteButton asChild size="lg">
              <Link href="/contact">Start a project</Link>
            </SiteButton>
            <SiteButton asChild size="lg" variant="outline">
              <Link href="/work">See our work</Link>
            </SiteButton>
          </div>
        </div>
      </Container>

      {/* Promise strip: closes the fold on substance rather than decoration */}
      <div className="border-t border-border bg-bg-subtle">
        <Container>
          <ul className="grid md:grid-cols-3">
            {PROMISES.map((promise, index) => (
              <li
                key={promise}
                className={`flex items-start gap-3 py-5 text-[15px] leading-relaxed text-fg-muted md:py-6 ${
                  index > 0 ? "md:border-l md:border-border md:pl-8" : ""
                } ${index < PROMISES.length - 1 ? "md:pr-8" : ""}`}
              >
                <Chevron className="mt-[0.35em] size-2.5 text-brand" />
                <span>{promise}</span>
              </li>
            ))}
          </ul>
        </Container>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ services ---- */

function ServicesSection() {
  return (
    <Section id="services" aria-labelledby="services-heading">
      <SectionHead
        id="services-heading"
        eyebrow="What we do"
        title="Seven service areas, one way of working"
        intro="Most projects combine two or three of these. Whichever they are, the process, the reporting and the handover are the same."
      >
        <ArrowLink asChild>
          <Link href="/services">What each service includes</Link>
        </ArrowLink>
      </SectionHead>

      <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <li key={service.slug}>
            <Link
              href={`/services#${service.slug}`}
              className="flex h-full flex-col gap-3 border border-border bg-white p-6 transition-colors duration-150 hover:border-border-strong hover:bg-bg-subtle md:p-7"
            >
              <span className="text-[19px] leading-snug font-bold tracking-[-0.02em] text-fg">{service.name}</span>
              {service.placeholder ? <PlaceholderMark className="w-fit" /> : null}
              <span className="text-[15px] leading-relaxed text-fg-muted">{service.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ------------------------------------------------------------- process ---- */

function ProcessSection() {
  return (
    <Section tone="subtle" aria-labelledby="process-heading">
      <SectionHead
        id="process-heading"
        eyebrow="How a project runs"
        title="Seven stages, each ending in something you can read or use"
        intro="No black box between the kick-off and the launch. You see the work every week and receive a written output at every stage."
      >
        <ArrowLink asChild>
          <Link href="/process">The full process</Link>
        </ArrowLink>
      </SectionHead>

      <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stages.map((stage, index) => (
          <li key={stage.key} className="flex flex-col gap-2.5 border-t-2 border-border bg-transparent pt-5">
            <span className="text-sm font-semibold text-brand tabular-nums">{String(index + 1).padStart(2, "0")}</span>
            <h3 className="text-[17px] leading-snug font-bold tracking-[-0.02em] text-fg">{stage.name}</h3>
            <p className="text-[15px] leading-relaxed text-fg-muted">{stage.summary}</p>
            <p className="mt-auto pt-3 text-[13px] text-fg-subtle">You get: {stage.youGet.join(", ")}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* ---------------------------------------------------------------- work ---- */

function WorkSection() {
  return (
    <Section aria-labelledby="work-heading">
      <SectionHead
        id="work-heading"
        eyebrow="Selected work"
        title="The problem, what we built, and what happened"
        intro="Client names appear only with permission, and we publish no result we cannot evidence."
      >
        <ArrowLink asChild>
          <Link href="/work">All work</Link>
        </ArrowLink>
      </SectionHead>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {caseStudies.map((study) => (
          <CaseStudyCard
            key={study.slug}
            study={study}
            serviceNames={study.services.map((slug) => getService(slug)?.name ?? slug)}
          />
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------- expectations ---- */

function ExpectationsSection() {
  return (
    <Section tone="subtle" aria-labelledby="expect-heading">
      <SectionHead
        id="expect-heading"
        eyebrow="What to expect"
        title="How we work with you, in four commitments"
        intro="These are the things clients tell us are missing elsewhere, so we make them explicit before the first invoice."
      />

      <dl className="mt-12 grid gap-8 md:grid-cols-2 lg:gap-x-12">
        {EXPECTATIONS.map((item) => (
          <div key={item.title} className="flex flex-col gap-2.5 border-t border-border pt-5">
            <dt className="text-[19px] leading-snug font-bold tracking-[-0.02em] text-fg">{item.title}</dt>
            <dd className="max-w-lg text-[15px] leading-relaxed text-fg-muted">{item.body}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
