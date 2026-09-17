import type { Metadata } from "next";
import Link from "next/link";

import { CtaBand, FeatureList, PageHero, PlaceholderMark } from "@/components/marketing/blocks";
import { Accent, Container, Section } from "@/components/marketing/section";
import { ServiceIcon } from "@/components/marketing/service-icons";
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
        eyebrow="Our services"
        title={
          <>
            Complete <Accent>software delivery</Accent>, one team
          </>
        }
        lede="Seven service areas, one way of working. Each engagement ends with software that runs and documents that explain it."
      />

      <nav
        aria-label="Service areas"
        className="sticky top-[72px] z-30 border-b border-border bg-white/90 backdrop-blur"
      >
        <Container className="flex gap-1 overflow-x-auto py-3">
          {services.map((service) => (
            <a
              key={service.slug}
              href={`#${service.slug}`}
              className="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap text-fg-muted hover:bg-bg-subtle hover:text-fg"
            >
              {service.name}
            </a>
          ))}
        </Container>
      </nav>

      {services.map((service, index) => {
        const related = caseStudies.filter((study) => study.services.includes(service.slug));
        return (
          <Section
            key={service.slug}
            id={service.slug}
            tone={index % 2 === 1 ? "subtle" : "white"}
            className="scroll-mt-32 py-14 md:py-16"
            aria-labelledby={`${service.slug}-heading`}
          >
            <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-brand text-white">
                    <ServiceIcon slug={service.slug} className="size-6" />
                  </span>
                  {service.placeholder ? <PlaceholderMark /> : null}
                </div>
                <h2
                  id={`${service.slug}-heading`}
                  className="text-[30px] leading-[1.1] font-bold tracking-[-0.02em] text-fg md:text-[38px]"
                >
                  {service.name}
                </h2>
                <p className="text-base leading-relaxed text-fg-muted md:text-lg">{service.description}</p>
                {related.length > 0 ? (
                  <p className="text-sm text-fg-muted">
                    Related work:{" "}
                    {related.map((study, i) => (
                      <span key={study.slug}>
                        <Link href={`/work/${study.slug}`} className="font-semibold text-brand hover:underline">
                          {study.title}
                        </Link>
                        {i < related.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-6 rounded-2xl border border-border bg-white p-6 shadow-s sm:grid-cols-2 lg:grid-cols-1">
                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-bold text-fg">What you get</h3>
                  <FeatureList items={service.outcomes} />
                </div>
                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-bold text-fg">Typical deliverables</h3>
                  <FeatureList items={service.deliverables} />
                </div>
              </div>
            </div>
          </Section>
        );
      })}

      <CtaBand
        title="Not sure which one you need?"
        lede="Describe the problem and we will suggest the smallest thing worth building."
      />
    </>
  );
}
