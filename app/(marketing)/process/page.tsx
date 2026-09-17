import type { Metadata } from "next";
import { FileCheck2 } from "lucide-react";

import { CtaBand, FeatureList, PageHero } from "@/components/marketing/blocks";
import { Accent, Section, SectionHeading } from "@/components/marketing/section";
import { stages } from "@/content/process";

export const metadata: Metadata = {
  title: "Process",
  description:
    "How a Malhot project runs from discovery to support: what happens at each stage and the documents you receive.",
  alternates: { canonical: "/process" },
};

const DOCUMENTS = [
  "Project brief",
  "Requirements and MVP specification",
  "Project plan",
  "Testing report",
  "Deployment report",
  "Final project report",
];

export default function ProcessPage() {
  return (
    <>
      <PageHero
        eyebrow="Our process"
        title={
          <>
            How we <Accent>work</Accent>
          </>
        }
        lede="Seven stages, each with a clear output, so you always know where the project is and what you will receive next."
      />

      <Section className="pt-12 md:pt-14">
        <ol className="grid gap-6 md:grid-cols-2">
          {stages.map((stage, index) => (
            <li
              key={stage.key}
              id={stage.key}
              className="flex scroll-mt-28 flex-col gap-5 rounded-2xl border border-border bg-white p-6 shadow-s md:p-8"
            >
              <div className="flex items-center gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand font-mono text-sm font-bold text-white">
                  0{index + 1}
                </span>
                <div className="flex flex-col">
                  <h2 className="text-xl font-bold tracking-[-0.01em] text-fg">{stage.name}</h2>
                  <p className="text-sm text-fg-muted">{stage.summary}</p>
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-bold tracking-wide text-fg-subtle uppercase">What we do</h3>
                  <FeatureList items={stage.weDo} />
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-bold tracking-wide text-fg-subtle uppercase">What you receive</h3>
                  <FeatureList items={stage.youGet} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="subtle" aria-labelledby="documents-heading">
        <SectionHeading
          id="documents-heading"
          eyebrow="Documents"
          title="Written down, every time"
          lede="Generated from the project record, reviewed by a person, approved before delivery."
        />
        <ul className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DOCUMENTS.map((doc) => (
            <li
              key={doc}
              className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold text-fg shadow-s"
            >
              <FileCheck2 aria-hidden="true" className="size-5 shrink-0 text-brand" />
              {doc}
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand title="Ready to start at stage one?" />
    </>
  );
}
