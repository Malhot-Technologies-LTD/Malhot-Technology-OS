import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { CaseStudyCard, CtaBand, PageHero } from "@/components/marketing/blocks";
import { Section, SectionHeading } from "@/components/marketing/section";
import { Button } from "@/components/ui/button";
import { stages } from "@/content/process";
import { getService, services } from "@/content/services";
import { site } from "@/content/site";
import { capabilities } from "@/content/team";
import { caseStudies } from "@/content/work";

export const metadata: Metadata = {
  title: { absolute: `${site.name} — ${site.tagline}` },
  description: site.description,
  alternates: { canonical: "/" },
};

const POSITIONING = [
  {
    title: "What we build",
    body: "Websites, web applications, backend systems, automation and carefully scoped AI-assisted tools.",
  },
  {
    title: "How we work",
    body: "One lifecycle from idea to archived documentation, run on our own operating system, with testing as a stage rather than an afterthought.",
  },
  {
    title: "What you get",
    body: "Working software in verifiable increments, honest progress reports and the documents to run it after we leave.",
  },
] as const;

export default function HomePage() {
  const featured = caseStudies.slice(0, 4);

  return (
    <>
      <PageHero size="large" eyebrow="Software company · Kigali" title={site.tagline} lede={site.description}>
        <Button asChild size="lg">
          <Link href="/contact">
            Start a project <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/work">See our work</Link>
        </Button>
      </PageHero>

      <Section tone="subtle" className="py-12 md:py-16 lg:py-20" aria-labelledby="positioning-heading">
        <h2 id="positioning-heading" className="sr-only">
          What we build, how we work, what you get
        </h2>
        <div className="grid gap-8 md:grid-cols-3 md:gap-12">
          {POSITIONING.map((item) => (
            <div key={item.title} className="flex flex-col gap-2">
              <h3 className="text-base font-semibold">{item.title}</h3>
              <p className="text-sm leading-relaxed text-fg-muted md:text-base">{item.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section aria-labelledby="services-heading">
        <SectionHeading
          id="services-heading"
          eyebrow="Services"
          title="Systems, not just screens"
          lede="Every engagement is built to be maintained: clear data models, security at the database, and a deployment you can operate."
        />
        <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <Link
              key={service.slug}
              href={`/services#${service.slug}`}
              className="group flex flex-col gap-2 bg-bg p-6 transition-colors duration-[120ms] hover:bg-surface md:p-8"
            >
              <h3 className="text-lg font-semibold tracking-[-0.01em] group-hover:underline group-hover:underline-offset-4">
                {service.name}
              </h3>
              <p className="text-sm leading-relaxed text-fg-muted">{service.summary}</p>
            </Link>
          ))}
          <Link
            href="/services"
            className="group flex flex-col justify-between gap-2 bg-bg-subtle p-6 transition-colors duration-[120ms] hover:bg-surface md:p-8"
          >
            <span className="text-lg font-semibold tracking-[-0.01em]">All services</span>
            <span className="inline-flex items-center gap-1 text-sm text-fg-muted group-hover:text-fg">
              What each includes <ArrowRight aria-hidden="true" className="size-4" />
            </span>
          </Link>
        </div>
      </Section>

      <Section tone="light" aria-labelledby="work-heading">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading id="work-heading" eyebrow="Selected work" title="What we have shipped" />
          <Button asChild variant="outline">
            <Link href="/work">All work</Link>
          </Button>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {featured.map((study) => (
            <CaseStudyCard
              key={study.slug}
              study={study}
              serviceNames={study.services.map((slug) => getService(slug)?.name ?? slug)}
            />
          ))}
        </div>
      </Section>

      <Section aria-labelledby="capabilities-heading">
        <SectionHeading
          id="capabilities-heading"
          eyebrow="Capabilities"
          title="Boring technology, deliberately chosen"
          lede="Tools that will still be maintained in five years and that a new engineer can read on day one."
        />
        <dl className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {capabilities.map((group) => (
            <div key={group.area} className="flex flex-col gap-3">
              <dt className="text-xs font-medium tracking-[0.08em] text-fg-subtle uppercase">{group.area}</dt>
              {group.items.map((item) => (
                <dd key={item} className="text-sm text-fg-muted">
                  {item}
                </dd>
              ))}
            </div>
          ))}
        </dl>
      </Section>

      <Section tone="light" aria-labelledby="process-heading">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            id="process-heading"
            eyebrow="Process"
            title="One lifecycle, start to finish"
            lede="The same stages every project goes through inside our operating system, so you always know where we are."
          />
          <Button asChild variant="outline">
            <Link href="/process">How we work</Link>
          </Button>
        </div>
        <ol className="mt-12 grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          {stages.map((stage, index) => (
            <li key={stage.key} className="flex flex-col gap-2 border-t border-border-strong pt-4">
              <span className="font-mono text-xs text-fg-subtle">0{index + 1}</span>
              <span className="text-base font-semibold">{stage.name}</span>
              <span className="text-sm text-fg-muted">{stage.summary}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section aria-labelledby="team-heading">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <SectionHeading
            id="team-heading"
            eyebrow="Team"
            title="A small team that runs every project on its own operating system"
          />
          <div className="flex flex-col gap-6 text-base leading-relaxed text-fg-muted md:text-lg">
            <p>
              Five people covering project management, frontend, backend, quality assurance and marketing. Small enough
              that you talk to the people doing the work; disciplined enough that the work is tracked, tested and
              documented.
            </p>
            <p>
              Malhot OS, the system we use to plan, build, test and deliver, is software we built for ourselves. The
              case studies on this site are its output.
            </p>
            <Link href="/about" className="text-sm font-medium text-fg underline-offset-4 hover:underline">
              About the company
            </Link>
          </div>
        </div>
      </Section>

      <CtaBand title="Have a system in mind?" lede="Tell us the problem. We will reply within two working days." />
    </>
  );
}
