import type { Metadata } from "next";

import { CtaBand, FeatureList, PageHero } from "@/components/marketing/blocks";
import { Accent, ChevronList, Section, SectionHead } from "@/components/marketing/section";
import { stages } from "@/content/process";

export const metadata: Metadata = {
  title: "Process",
  description:
    "How a project runs from discovery to support: what happens at each stage and the documents you receive.",
  alternates: { canonical: "/process" },
};

const DOCUMENTS = [
  "Project brief",
  "Requirements and MVP specification",
  "Project plan",
  "Testing report",
  "Deployment report",
  "Final project report",
] as const;

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
        lede="Seven stages, each with a clear output, so you always know where the project is and what arrives next."
      />

      <Section>
        <ol className="flex flex-col">
          {stages.map((stage, index) => (
            <li
              key={stage.key}
              id={stage.key}
              className="grid scroll-mt-24 gap-6 border-t border-border py-9 first:border-t-0 first:pt-0 md:grid-cols-12 md:gap-10"
            >
              <div className="flex flex-col gap-2 md:col-span-4">
                <span className="text-sm font-semibold text-brand tabular-nums">
                  Stage {String(index + 1).padStart(2, "0")}
                </span>
                <h2 className="text-[22px] leading-snug font-bold tracking-[-0.02em] text-fg">{stage.name}</h2>
                <p className="text-[15px] leading-relaxed text-fg-muted">{stage.summary}</p>
              </div>

              <div className="flex flex-col gap-3 md:col-span-5">
                <h3 className="text-[12px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">What we do</h3>
                <FeatureList items={stage.weDo} />
              </div>

              <div className="flex flex-col gap-3 md:col-span-3">
                <h3 className="text-[12px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">
                  What you receive
                </h3>
                <FeatureList items={stage.youGet} />
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="subtle" aria-labelledby="documents-heading">
        <SectionHead
          id="documents-heading"
          eyebrow="What you keep"
          title="Six documents that outlive the engagement"
          intro="Every project produces the same written record. If you replace us, or hire in-house, the next team starts with this rather than with archaeology."
        />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DOCUMENTS.map((document) => (
            <li key={document} className="border border-border bg-white p-5 text-[15px] font-semibold text-fg">
              {document}
            </li>
          ))}
        </ul>
      </Section>

      <Section aria-labelledby="after-heading">
        <SectionHead
          id="after-heading"
          eyebrow="After launch"
          title="Shipping is the start of the support relationship"
          intro="Software that nobody maintains degrades. We stay on to keep it healthy — or hand it over cleanly if you would rather run it yourself."
        >
          <ChevronList
            items={[
              "Bug fixes and small improvements",
              "Dependency and security updates",
              "Roadmap conversations, not upsells",
              "A clean exit whenever you want one",
            ]}
          />
        </SectionHead>
      </Section>

      <CtaBand
        title="Ready to start at stage one?"
        lede="Discovery begins with a conversation. Tell us the problem and we will take it from there."
      />
    </>
  );
}
