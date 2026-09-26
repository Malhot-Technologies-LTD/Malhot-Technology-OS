import Image from "next/image";
import Link from "next/link";

import { Icon } from "@/components/site/brand/Icon";
import { ProjectCard } from "@/components/site/cards/ProjectCard";
import { CtaBand } from "@/components/site/sections/CtaBand";
import { HeroSlides } from "@/components/site/sections/HeroSlides";
import { ButtonLink } from "@/components/site/ui/Button";
import { CheckList, Eyebrow, Section, SectionHeader } from "@/components/site/ui/Section";
import { commitments, media, processSteps, projects, sectors, services, site } from "@/content/site";

const facts = [
  { term: "End to end", detail: "Design, engineering, testing and launch, handled by one team.", icon: "layers" },
  { term: "Documented", detail: "Every stage ends in a deliverable you keep.", icon: "clipboard" },
  { term: "Kigali based", detail: "Working with clients in Rwanda and abroad.", icon: "pin" },
] as const;

const commitmentIcons = ["users", "rocket", "shield", "clipboard"] as const;

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="on-ink relative isolate overflow-hidden bg-site-ink text-white">
        {/* Legibility, not decoration: the photos are darkest where the text sits. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(11_31_75/0.95)_0%,rgb(11_31_75/0.85)_40%,rgb(11_31_75/0.2)_100%)]"
        />
        <div className="shell py-20 sm:py-24 lg:py-28">
          <div className="max-w-2xl">
            <Eyebrow onInk>Software company · {site.location}</Eyebrow>
            <h1 className="mt-4 text-[clamp(2.25rem,5.2vw,3.6rem)] leading-[1.08] font-semibold">
              We design, build and ship software that businesses run on.
            </h1>
            <p className="mt-6 max-w-xl text-[1.125rem] leading-relaxed text-site-ink-fg-muted">
              Websites, web and mobile applications, and the systems behind them. One team takes your project from the
              first workshop to launch, and stays accountable for it after.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/start" size="lg" icon="arrow">
                Start a project
              </ButtonLink>
              <ButtonLink href="/projects" size="lg" variant="inverse-outline">
                See our work
              </ButtonLink>
            </div>
            <HeroSlides slides={media.heroSlides} />
          </div>
        </div>
      </section>

      {/* Introduction */}
      <Section tone="muted" labelledBy="intro-title">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <Eyebrow>Who we are</Eyebrow>
            <h2
              id="intro-title"
              className="mt-3 text-[clamp(1.75rem,3.2vw,2.4rem)] leading-[1.15] font-semibold text-fg"
            >
              A software development company in Kigali that builds software properly.
            </h2>
          </div>
          <div className="lg:col-span-6 lg:pt-8">
            <p className="text-[1.1rem] leading-relaxed text-fg-muted">
              We work with businesses and organisations that need software planned, tested, documented and delivered on
              the terms agreed at the start.
            </p>
            <Link
              href="/about"
              className="mt-6 inline-flex items-center gap-1.5 text-[0.95rem] font-semibold text-brand hover:underline"
            >
              More about {site.name}
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <ul className="mt-14 grid gap-8 border-t border-border pt-10 sm:grid-cols-3 sm:gap-10">
          {facts.map((fact) => (
            <li key={fact.term}>
              <div className="flex items-center gap-3">
                <Icon name={fact.icon} className="h-5 w-5 shrink-0 text-brand" />
                <p className="text-[1.05rem] font-semibold text-fg">{fact.term}</p>
              </div>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-fg-muted">{fact.detail}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* Services */}
      <Section labelledBy="services-title">
        <SectionHeader
          id="services-title"
          eyebrow="What we do"
          title="Services built around the whole product"
          lead="From the first design to the code running in production. Take one service or the whole set."
          action={
            <ButtonLink href="/services" variant="secondary" icon="arrow">
              All services
            </ButtonLink>
          }
        />
        <ul className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <li
              key={service.slug}
              className="flex flex-col rounded-[var(--radius-l)] border border-border bg-white p-7 transition-colors hover:border-brand"
            >
              <span className="grid h-11 w-11 place-items-center rounded-[var(--radius-m)] bg-brand-subtle text-brand">
                <Icon name={service.icon} className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-[1.15rem] font-semibold text-fg">{service.title}</h3>
              <p className="mt-2 text-[0.925rem] leading-relaxed text-fg-muted">{service.short}</p>
              <CheckList items={service.bullets.slice(0, 3)} className="mt-5" />
              <Link
                href={`/services#${service.slug}`}
                className="mt-auto inline-flex items-center gap-1.5 pt-6 text-[0.875rem] font-semibold text-brand hover:underline"
              >
                Learn more<span className="sr-only"> about {service.title}</span>
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {/* How we work */}
      <Section tone="muted" labelledBy="process-title">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeader
              id="process-title"
              eyebrow="How we work"
              title="A clear process, from idea to launch"
              lead="You always know what stage the project is in, what comes next and what you will receive at the end of it."
            />
            <ol className="mt-10 space-y-7">
              {processSteps.map((step) => (
                <li key={step.index} className="grid grid-cols-[3rem_1fr] gap-4">
                  <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-brand bg-white text-[0.95rem] font-semibold text-brand">
                    {step.index}
                  </span>
                  <div>
                    <h3 className="text-[1.1rem] font-semibold text-fg">{step.title}</h3>
                    <p className="mt-1.5 text-[0.95rem] leading-relaxed text-fg-muted">{step.copy}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-l)] sm:aspect-[4/3] lg:aspect-[4/5]">
            <Image
              src={media.presentation.src}
              alt={media.presentation.alt}
              fill
              sizes="(min-width: 1024px) 36rem, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </Section>

      {/* Commitments */}
      <Section tone="ink" labelledBy="why-title">
        <SectionHeader
          id="why-title"
          onInk
          eyebrow={`Why ${site.name}`}
          title="What you can count on, on every project"
        />
        <ul className="mt-12 grid gap-px overflow-hidden rounded-[var(--radius-l)] bg-site-ink-line sm:grid-cols-2 lg:grid-cols-4">
          {commitments.map((item, index) => (
            <li key={item.title} className="bg-site-ink-raised p-7">
              <Icon name={commitmentIcons[index % commitmentIcons.length]} className="h-7 w-7 text-site-blue-bright" />
              <h3 className="mt-5 text-[1.1rem] font-semibold text-white">{item.title}</h3>
              <p className="mt-2.5 text-[0.925rem] leading-relaxed text-site-ink-fg-muted">{item.copy}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* Sectors */}
      <Section id="industries" labelledBy="sectors-title">
        <SectionHeader
          id="sectors-title"
          eyebrow="Sectors"
          title="Where our software is used"
          lead="We design each product around the people who will use it every day, and the conditions they use it in."
        />
        <ul className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-border">
          {sectors.map((sector) => (
            <li key={sector.title} className="lg:px-7 lg:first:pl-0 lg:last:pr-0">
              <span className="grid h-12 w-12 place-items-center rounded-[var(--radius-m)] border border-border text-brand">
                <Icon name={sector.icon} className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-[1.1rem] font-semibold text-fg">{sector.title}</h3>
              <p className="mt-2 text-[0.925rem] leading-relaxed text-fg-muted">{sector.copy}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* Selected work */}
      <Section tone="muted" labelledBy="work-title">
        <SectionHeader
          id="work-title"
          eyebrow="Selected work"
          title="Recent projects"
          lead="A few of the products we have designed and built."
          action={
            <ButtonLink href="/projects" variant="secondary" icon="arrow">
              See all projects
            </ButtonLink>
          }
        />
        <ul className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {projects.slice(0, 3).map((project) => (
            <li key={project.slug}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand />
    </>
  );
}
