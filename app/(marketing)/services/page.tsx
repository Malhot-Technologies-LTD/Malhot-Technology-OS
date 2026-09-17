import type { Metadata } from "next";
import Link from "next/link";

import { CtaBand, FeatureList, PageHero, PlaceholderMark } from "@/components/marketing/blocks";
import { Accent, Container, Section } from "@/components/marketing/section";
import { ArrowLink } from "@/components/marketing/site-button";
import { services } from "@/content/services";
import { caseStudies } from "@/content/work";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Web development, software systems, backend and APIs, UI/UX design, automation, AI-assisted systems and deployment. What each includes and what you receive.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Services"
        title={
          <>
            Complete software delivery, <Accent>one team</Accent>
          </>
        }
        lede="Seven service areas that combine into a single engagement. Each one ends with software that runs and documents that explain it."
      />

      {/* In-page index: long content needs a way in */}
      <nav
        aria-label="Service areas"
        className="sticky top-[68px] z-30 border-b border-border bg-white/95 backdrop-blur"
      >
        <Container className="flex gap-6 overflow-x-auto py-3 text-sm font-medium">
          {services.map((service) => (
            <a
              key={service.slug}
              href={`#${service.slug}`}
              className="shrink-0 whitespace-nowrap text-fg-muted transition-colors hover:text-fg"
            >
              {service.name}
            </a>
          ))}
        </Container>
      </nav>

      <Section className="py-0 md:py-0 lg:py-0">
        {services.map((service) => {
          const related = caseStudies.filter((study) => study.services.includes(service.slug));
          return (
            <article
              key={service.slug}
              id={service.slug}
              aria-labelledby={`${service.slug}-heading`}
              className="grid scroll-mt-28 gap-8 border-b border-border py-12 last:border-b-0 lg:grid-cols-12 lg:gap-12 lg:py-16"
            >
              <div className="flex flex-col gap-4 lg:col-span-6">
                <h2
                  id={`${service.slug}-heading`}
                  className="text-[clamp(1.5rem,2.6vw,2rem)] leading-[1.15] font-bold tracking-[-0.02em] text-fg"
                >
                  {service.name}
                </h2>
                {service.placeholder ? <PlaceholderMark className="w-fit" /> : null}
                <p className="max-w-lg text-[17px] leading-relaxed text-fg-muted">{service.description}</p>
                {related.length > 0 ? (
                  <div className="flex flex-col gap-1.5 pt-1">
                    <p className="text-[12px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">Related work</p>
                    {related.map((study) => (
                      <ArrowLink key={study.slug} asChild>
                        <Link href={`/work/${study.slug}`}>{study.title}</Link>
                      </ArrowLink>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-8 sm:grid-cols-2 lg:col-span-6 lg:gap-10">
                <div className="flex flex-col gap-3 border-t border-border pt-5">
                  <h3 className="text-[12px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">What you get</h3>
                  <FeatureList items={service.outcomes} />
                </div>
                <div className="flex flex-col gap-3 border-t border-border pt-5">
                  <h3 className="text-[12px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">
                    Typical deliverables
                  </h3>
                  <FeatureList items={service.deliverables} />
                </div>
              </div>
            </article>
          );
        })}
      </Section>

      <CtaBand
        title="Not sure which one you need?"
        lede="Describe the problem and we will suggest the smallest thing worth building first."
      />
    </>
  );
}
