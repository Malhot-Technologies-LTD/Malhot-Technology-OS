import type { Metadata } from "next";

import { ProjectCard } from "@/components/site/cards/ProjectCard";
import { PageHero } from "@/components/site/layout/PageHero";
import { CtaBand } from "@/components/site/sections/CtaBand";
import { ButtonLink } from "@/components/site/ui/Button";
import { Section } from "@/components/site/ui/Section";
import { listPublishedShowcases } from "@/features/showcase/public";

export const metadata: Metadata = {
  title: "Projects",
  description: "Selected MALHOT work: web platforms, mobile apps and design systems built for real businesses.",
};

/**
 * The portfolio. Projects come from Settings → Website in the OS; this page is
 * static and is refreshed when an admin saves a change there.
 */
export default async function ProjectsPage() {
  const projects = await listPublishedShowcases();

  return (
    <>
      <PageHero
        eyebrow="Our work"
        title="Real solutions. Real impact."
        lead="A selection of products we have designed, engineered and launched, and what each one set out to solve."
      />

      <Section tone="muted" labelledBy="projects-title">
        <h2 id="projects-title" className="sr-only">
          All projects
        </h2>
        {projects.length > 0 ? (
          <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <li key={project.slug}>
                <ProjectCard project={project} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mx-auto max-w-xl rounded-[var(--radius-l)] border border-border bg-white p-10 text-center">
            <p className="text-[1.15rem] font-semibold text-fg">Case studies are on their way</p>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-fg-muted">
              We are writing up recent work. In the meantime, tell us what you are building and we will walk you through
              comparable projects.
            </p>
            <div className="mt-6 flex justify-center">
              <ButtonLink href="/contact" icon="arrow">
                Talk to us
              </ButtonLink>
            </div>
          </div>
        )}
      </Section>

      <CtaBand title="Want to be our next case study?" />
    </>
  );
}
