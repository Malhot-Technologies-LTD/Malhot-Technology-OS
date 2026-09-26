import type { Metadata } from "next";

import { Icon } from "@/components/site/brand/Icon";
import { PageHero } from "@/components/site/layout/PageHero";
import { CtaBand } from "@/components/site/sections/CtaBand";
import { ButtonLink } from "@/components/site/ui/Button";
import { CheckList, Section, SectionHeader } from "@/components/site/ui/Section";
import { processSteps, services } from "@/content/site";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Web development, mobile apps, UI/UX design, branding, digital marketing and IT consulting, delivered by one accountable team.",
};

const engagements = [
  {
    title: "Product sprint",
    duration: "About 2 weeks",
    copy: "Strategy, a clickable prototype and a costed plan before you commit to a full build.",
    items: ["Discovery workshops", "Clickable prototype", "Technical plan", "Cost and timeline"],
  },
  {
    title: "Full build",
    duration: "6 to 16 weeks",
    copy: "Design and engineering working as one team until your product is live.",
    items: ["Design system", "Full-stack build", "Testing and launch", "30 days of support"],
    featured: true,
  },
  {
    title: "Ongoing partnership",
    duration: "Monthly",
    copy: "Continuous improvement, new features and performance work after launch.",
    items: ["Shared roadmap", "Regular releases", "Analytics and reporting", "Priority support"],
  },
];

export default function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Services"
        title="Everything you need to build, launch and grow"
        lead="Six disciplines, one delivery team. We plug in where you need us and stay accountable for the result."
      />

      {/* In-page index */}
      <nav aria-label="Services on this page" className="border-b border-border bg-white">
        <ul className="shell flex gap-x-6 gap-y-2 overflow-x-auto py-4 text-[0.9rem] whitespace-nowrap">
          {services.map((service) => (
            <li key={service.slug}>
              <a href={`#${service.slug}`} className="font-medium text-fg-muted hover:text-brand">
                {service.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Section>
        <ul className="divide-y divide-border">
          {services.map((service) => (
            <li
              key={service.slug}
              id={service.slug}
              className="grid scroll-mt-24 gap-8 py-12 first:pt-0 last:pb-0 lg:grid-cols-[1fr_1.1fr] lg:gap-16"
            >
              <div>
                <span className="grid h-12 w-12 place-items-center rounded-[var(--radius-m)] bg-brand-subtle text-brand">
                  <Icon name={service.icon} className="h-6 w-6" />
                </span>
                <h2 className="mt-5 text-[clamp(1.5rem,2.6vw,1.9rem)] leading-tight font-semibold text-fg">
                  {service.title}
                </h2>
                <p className="mt-2 text-[1.02rem] font-medium text-fg">{service.short}</p>
                <p className="mt-4 text-[0.975rem] leading-relaxed text-fg-muted">{service.description}</p>
              </div>
              <div className="rounded-[var(--radius-l)] border border-border bg-bg-subtle p-7">
                <h3 className="text-[0.8rem] font-semibold tracking-[0.12em] text-fg uppercase">What you get</h3>
                <CheckList items={service.bullets} className="mt-5" />
                <ButtonLink href="/start" variant="secondary" icon="arrow" className="mt-7">
                  Discuss your project
                </ButtonLink>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="process" tone="muted" labelledBy="process-title">
        <SectionHeader
          id="process-title"
          eyebrow="How we work"
          title="Four stages, no surprises"
          lead="Every project moves through the same stages. Each one ends with something you can review."
        />
        <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {processSteps.map((step) => (
            <li key={step.index} className="rounded-[var(--radius-l)] border border-border bg-white p-7">
              <span className="text-[0.85rem] font-semibold text-brand">Step {step.index}</span>
              <h3 className="mt-2 text-[1.15rem] font-semibold text-fg">{step.title}</h3>
              <p className="mt-2.5 text-[0.925rem] leading-relaxed text-fg-muted">{step.copy}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="engagements" labelledBy="engagements-title">
        <SectionHeader
          id="engagements-title"
          eyebrow="Engagements"
          title="Ways to work with us"
          lead="Pick the shape that fits your stage. Every engagement is staffed by the same senior design and engineering team."
        />
        <ul className="mt-12 grid gap-5 lg:grid-cols-3">
          {engagements.map((plan) => (
            <li
              key={plan.title}
              className={
                plan.featured
                  ? "relative flex flex-col rounded-[var(--radius-l)] border-2 border-brand bg-white p-7"
                  : "flex flex-col rounded-[var(--radius-l)] border border-border bg-white p-7"
              }
            >
              {plan.featured ? (
                <span className="absolute -top-3 left-7 rounded-[var(--radius-s)] bg-brand px-2.5 py-1 text-[0.75rem] font-semibold text-white">
                  Most common
                </span>
              ) : null}
              <p className="text-[0.85rem] font-medium text-fg-subtle">{plan.duration}</p>
              <h3 className="mt-1.5 text-[1.3rem] font-semibold text-fg">{plan.title}</h3>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-fg-muted">{plan.copy}</p>
              <CheckList items={plan.items} className="mt-6 border-t border-border pt-6" />
              <div className="mt-auto pt-8">
                <ButtonLink
                  href="/start"
                  variant={plan.featured ? "primary" : "secondary"}
                  className="w-full"
                  icon="arrow"
                >
                  Get started
                </ButtonLink>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand />
    </>
  );
}
