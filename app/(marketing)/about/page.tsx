import type { Metadata } from "next";

import { CtaBand, PageHero, PlaceholderMark } from "@/components/marketing/blocks";
import { Accent, Section, SectionHead } from "@/components/marketing/section";
import { site } from "@/content/site";
import { capabilities, team, values } from "@/content/team";

export const metadata: Metadata = {
  title: "About",
  description: `${site.name}: who we are, what we believe about building software, and how the team operates.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About us"
        title={
          <>
            A software company that <Accent>ships</Accent>
          </>
        }
        lede={`${site.name} designs, builds and operates software for clients who need it to work: websites, web applications, backend systems and automation.`}
      />

      <Section aria-labelledby="story-heading">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <SectionHead id="story-heading" eyebrow="Our story" title="Built around one claim" />
          </div>
          <div className="flex flex-col gap-5 text-[17px] leading-relaxed text-fg-muted lg:col-span-7">
            <p>
              {site.shortName} exists to make one claim true: that we actually build and ship software. Everything else
              follows from it. We keep the team small, the tools boring and the process visible.
            </p>
            <p>
              Every project runs through the same seven stages, from discovery to support, with a written output at each
              one. Plans, tasks, tests and documents live in one place, so progress is counted rather than felt.
            </p>
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <PlaceholderMark /> Company story to be supplied by the founders.
            </p>
          </div>
        </div>
      </Section>

      <Section tone="subtle" aria-labelledby="values-heading">
        <SectionHead
          id="values-heading"
          eyebrow="What we believe"
          title="Four beliefs about building software"
          intro="Not a poster on a wall. Each of these changes what we do on a normal Tuesday."
        />
        <ol className="mt-10 grid gap-6 md:grid-cols-2">
          {values.map((value) => (
            <li key={value.title} className="flex flex-col gap-2.5 border border-border bg-white p-6 md:p-7">
              <h3 className="text-[19px] leading-snug font-bold tracking-[-0.02em] text-fg">{value.title}</h3>
              <p className="text-[15px] leading-relaxed text-fg-muted">{value.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section aria-labelledby="team-heading">
        <SectionHead
          id="team-heading"
          eyebrow="Our team"
          title="Five people, five disciplines"
          intro="Small enough that everyone knows the whole system, structured enough that nothing falls between roles."
        />
        <ul className="mt-10 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((member) => (
            <li key={member.role} className="flex flex-col gap-1.5 border-t border-border pt-5">
              <p className="text-[12px] font-semibold tracking-[0.14em] text-brand uppercase">{member.discipline}</p>
              <p className="text-[19px] font-bold tracking-[-0.02em] text-fg">{member.role}</p>
              <p className="text-[15px] text-fg-muted">{member.name}</p>
              {member.placeholder ? <PlaceholderMark className="mt-1 w-fit" /> : null}
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="subtle" aria-labelledby="capabilities-heading">
        <SectionHead
          id="capabilities-heading"
          eyebrow="Capabilities"
          title="The stack we actually use"
          intro="Boring technology, deliberately chosen: tools that will still be maintained in five years and that a new engineer can read."
        />
        <dl className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((capability) => (
            <div key={capability.area} className="flex flex-col gap-3 border border-border bg-white p-6">
              <dt className="text-[12px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">
                {capability.area}
              </dt>
              <dd>
                <ul className="flex flex-col gap-1.5 text-[15px] text-fg-muted">
                  {capability.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <CtaBand
        title="Work with the team, not a queue."
        lede="You will talk to the people writing the code, for the whole project."
      />
    </>
  );
}
