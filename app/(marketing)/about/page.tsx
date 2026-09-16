import type { Metadata } from "next";

import { CtaBand, PageHero, PlaceholderMark } from "@/components/marketing/blocks";
import { Section, SectionHeading } from "@/components/marketing/section";
import { site } from "@/content/site";
import { team, values } from "@/content/team";

export const metadata: Metadata = {
  title: "About",
  description: `${site.name}: who we are, what we believe about building software, and how the team operates.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title="A software company that ships"
        lede="Malhot Technologies designs, builds and operates software for clients who need it to work: websites, web applications, backend systems and automation."
      />

      <Section tone="light" aria-labelledby="story-heading">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <SectionHeading id="story-heading" eyebrow="Story" title="Built around one claim" />
          <div className="flex flex-col gap-5 leading-relaxed text-fg-muted">
            <p>
              Malhot exists to make one claim true: that we actually build and ship software. Everything else follows
              from it. We keep the team small, the tools boring and the process visible.
            </p>
            <p>
              We run every project on Malhot OS, an operating system we built for ourselves, so plans, tasks, tests and
              documents live in one place and progress is counted rather than felt.
            </p>
            <p className="flex items-center gap-2 text-sm">
              <PlaceholderMark /> Company story to be supplied by the founders.
            </p>
          </div>
        </div>
      </Section>

      <Section aria-labelledby="values-heading">
        <SectionHeading id="values-heading" eyebrow="Beliefs" title="What we believe about building software" />
        <dl className="mt-12 grid gap-8 md:grid-cols-2">
          {values.map((value) => (
            <div key={value.title} className="flex flex-col gap-2 border-t border-border pt-5">
              <dt className="text-lg font-semibold">{value.title}</dt>
              <dd className="text-sm leading-relaxed text-fg-muted md:text-base">{value.body}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section tone="light" aria-labelledby="team-heading">
        <SectionHeading
          id="team-heading"
          eyebrow="Team"
          title="Five people, five disciplines"
          lede="Project management, frontend, backend, quality assurance and marketing. You talk to the people doing the work."
        />
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((member, index) => (
            <li key={index} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col">
                  <span className="font-semibold">{member.name}</span>
                  <span className="text-sm text-fg-muted">{member.role}</span>
                </div>
                {member.placeholder ? <PlaceholderMark /> : null}
              </div>
              <p className="text-sm text-fg-muted">{member.bio}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section aria-labelledby="operate-heading">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <SectionHeading id="operate-heading" eyebrow="How we operate" title="Weekly rhythm, written progress" />
          <div className="flex flex-col gap-5 leading-relaxed text-fg-muted">
            <p>
              Work is planned in milestones and delivered in thin vertical slices you can try on a preview environment
              every week. Every change is reviewed; every feature has test cases; every stage ends in a document.
            </p>
            <p>
              You get a written progress report each week and can see the plan, the board and the test results whenever
              you like. If something is late or broken, you hear it from us first.
            </p>
          </div>
        </div>
      </Section>

      <CtaBand title="Work with us" />
    </>
  );
}
