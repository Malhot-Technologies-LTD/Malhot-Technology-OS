import type { Metadata } from "next";
import { UserRound } from "lucide-react";

import { CtaBand, PageHero, PlaceholderMark } from "@/components/marketing/blocks";
import { Accent, Section, SectionHeading } from "@/components/marketing/section";
import { PhotoCollage } from "@/components/marketing/visuals";
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
        eyebrow="About us"
        title={
          <>
            A software company that <Accent>ships</Accent>
          </>
        }
        lede="Malhot Technologies designs, builds and operates software for clients who need it to work: websites, web applications, backend systems and automation."
      />

      <Section aria-labelledby="story-heading">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <SectionHeading id="story-heading" align="start" eyebrow="Our story" title="Built around one claim" />
          <div className="flex flex-col gap-5 leading-relaxed text-fg-muted md:text-lg">
            <p>
              Malhot exists to make one claim true: that we actually build and ship software. Everything else follows
              from it. We keep the team small, the tools boring and the process visible.
            </p>
            <p>
              Every project runs through the same seven stages, from discovery to support, with a written output at each
              one. Plans, tasks, tests and documents live in one place, so progress is counted rather than felt.
            </p>
            <p className="flex items-center gap-2 text-sm">
              <PlaceholderMark /> Company story to be supplied by the founders.
            </p>
          </div>
        </div>
        <PhotoCollage className="mt-16" />
      </Section>

      <Section tone="subtle" aria-labelledby="values-heading">
        <SectionHeading id="values-heading" eyebrow="What we believe" title="Four beliefs about building software" />
        <ul className="mt-12 grid gap-5 md:grid-cols-2">
          {values.map((value, index) => (
            <li key={value.title} className="flex gap-5 rounded-2xl border border-border bg-white p-6 shadow-s">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand font-mono text-sm font-bold text-white">
                0{index + 1}
              </span>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-lg font-bold text-fg">{value.title}</h3>
                <p className="text-sm leading-relaxed text-fg-muted md:text-base">{value.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section aria-labelledby="team-heading">
        <SectionHeading
          id="team-heading"
          eyebrow="Our team"
          title="Five people, five disciplines"
          lede="Project management, frontend, backend, quality assurance and marketing. You talk to the people doing the work."
        />
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((member, index) => (
            <li key={index} className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-6 shadow-s">
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-bg-subtle text-fg-subtle">
                  <UserRound aria-hidden="true" className="size-7" />
                </span>
                {member.placeholder ? <PlaceholderMark /> : null}
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-fg">{member.name}</span>
                <span className="text-sm font-medium text-brand">{member.role}</span>
              </div>
              <p className="text-sm text-fg-muted">{member.bio}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="subtle" aria-labelledby="operate-heading">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <SectionHeading
            id="operate-heading"
            align="start"
            eyebrow="How we operate"
            title="Weekly rhythm, written progress"
          />
          <div className="flex flex-col gap-5 leading-relaxed text-fg-muted md:text-lg">
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
