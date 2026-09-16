import type { Metadata } from "next";

import { CtaBand, FeatureList, PageHero } from "@/components/marketing/blocks";
import { Section, SectionHeading } from "@/components/marketing/section";
import { stages } from "@/content/process";

export const metadata: Metadata = {
  title: "Process",
  description:
    "How a Malhot project runs from discovery to support: what happens at each stage and the documents you receive.",
  alternates: { canonical: "/process" },
};

export default function ProcessPage() {
  return (
    <>
      <PageHero
        eyebrow="Process"
        title="How we work"
        lede="Seven stages, each with a clear output. The same lifecycle runs inside our operating system, so the documents you receive are generated from the real project data, not written from memory."
      />

      <Section tone="light" className="py-12 md:py-16 lg:py-20">
        <ol className="flex flex-col divide-y divide-border">
          {stages.map((stage, index) => (
            <li
              key={stage.key}
              id={stage.key}
              className="grid scroll-mt-20 gap-6 py-10 md:grid-cols-[120px_1fr_1fr_1fr] md:gap-10 md:py-12"
            >
              <div className="flex flex-col gap-1">
                <span className="font-mono text-xs text-fg-subtle">0{index + 1}</span>
                <h2 className="text-2xl font-semibold tracking-[-0.02em]">{stage.name}</h2>
              </div>
              <p className="text-fg-muted md:text-base">{stage.summary}</p>
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-medium tracking-[0.08em] text-fg-subtle uppercase">What we do</h3>
                <FeatureList items={stage.weDo} />
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-medium tracking-[0.08em] text-fg-subtle uppercase">What you receive</h3>
                <FeatureList items={stage.youGet} />
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section aria-labelledby="documents-heading">
        <SectionHeading
          id="documents-heading"
          eyebrow="Documents"
          title="Written down, every time"
          lede="Project brief, requirements and MVP specification, project plan, testing report, deployment report and final report. Generated from the project record, reviewed by a person, approved before delivery."
        />
      </Section>

      <CtaBand title="Ready to start at stage one?" />
    </>
  );
}
