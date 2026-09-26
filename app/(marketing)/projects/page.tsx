import type { Metadata } from "next";

import { ProjectCard } from "@/components/site/cards/ProjectCard";
import { PageHero } from "@/components/site/layout/PageHero";
import { CtaBand } from "@/components/site/sections/CtaBand";
import { Section } from "@/components/site/ui/Section";
import { projects } from "@/content/site";

export const metadata: Metadata = {
  title: "Projects",
  description: "Selected MALHOT work: web platforms, mobile apps and design systems built for real businesses.",
};

export default function ProjectsPage() {
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
        <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <li key={project.slug}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand title="Want to be our next case study?" />
    </>
  );
}
