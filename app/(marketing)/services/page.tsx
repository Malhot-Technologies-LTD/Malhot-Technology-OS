import type { Metadata } from "next";
import Link from "next/link";

import { CtaBand, FeatureList, PageHero, PlaceholderMark } from "@/components/marketing/blocks";
import { Section } from "@/components/marketing/section";
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
        title="What we build"
        lede="Seven service areas, one way of working. Each engagement ends with software that runs and documents that explain it."
      />

      <nav aria-label="Service areas" className="border-y border-border">
        <div className="mx-auto flex max-w-[1200px] gap-1 overflow-x-auto px-4 py-3 md:px-6">
          {services.map((service) => (
            <a
              key={service.slug}
              href={`#${service.slug}`}
              className="shrink-0 rounded-md px-3 py-1.5 text-sm whitespace-nowrap text-fg-muted hover:bg-surface hover:text-fg"
            >
              {service.name}
            </a>
          ))}
        </div>
      </nav>

      {services.map((service, index) => {
        const related = caseStudies.filter((study) => study.services.includes(service.slug));
        return (
          <Section
            key={service.slug}
            id={service.slug}
            tone={index % 2 === 1 ? "light" : "dark"}
            className="scroll-mt-20 py-14 md:py-20"
            aria-labelledby={`${service.slug}-heading`}
          >
            <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-fg-subtle">0{index + 1}</span>
                  {service.placeholder ? <PlaceholderMark /> : null}
                </div>
                <h2
                  id={`${service.slug}-heading`}
                  className="text-[32px] leading-[1.1] font-semibold tracking-[-0.025em] md:text-[40px]"
                >
                  {service.name}
                </h2>
                <p className="text-lg text-fg-muted">{service.description}</p>
                {related.length > 0 ? (
                  <p className="text-sm text-fg-muted">
                    Related work:{" "}
                    {related.map((study, i) => (
                      <span key={study.slug}>
                        <Link href={`/work/${study.slug}`} className="text-fg underline-offset-4 hover:underline">
                          {study.title}
                        </Link>
                        {i < related.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-1">
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-medium tracking-[0.08em] text-fg-subtle uppercase">What you get</h3>
                  <FeatureList items={service.outcomes} />
                </div>
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-medium tracking-[0.08em] text-fg-subtle uppercase">
                    Typical deliverables
                  </h3>
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
