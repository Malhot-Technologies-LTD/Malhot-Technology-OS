import Link from "next/link";

import { Icon, type IconName } from "@/components/site/brand/Icon";
import type { Project } from "@/content/site";

const categoryIcon: Record<Project["category"], IconName> = {
  Web: "code",
  Mobile: "mobile",
  Design: "design",
  Marketing: "growth",
};

/**
 * A project in the grid.
 *
 * The cover is typographic, not a photo. There are no screenshots of these
 * products yet, and a stock photo of a keyboard above a case study reads as
 * exactly what it is. When real screenshots exist, put one in the cover and
 * drop the icon.
 */
export function ProjectCard({ project, headingLevel = "h3" }: { project: Project; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-l)] border border-border bg-white transition-shadow duration-200 hover:shadow-[var(--shadow-m)]">
      <ProjectCover project={project} />
      <div className="flex flex-1 flex-col p-6">
        <p className="text-[0.75rem] font-semibold tracking-[0.12em] text-brand uppercase">
          {project.category} · {project.year}
        </p>
        <Heading className="mt-2 text-[1.2rem] leading-snug font-semibold text-fg">
          {/* The whole card is the target; the link's box is stretched over it. */}
          <Link href={`/projects/${project.slug}`} className="after:absolute after:inset-0">
            {project.title}
          </Link>
        </Heading>
        <p className="mt-2.5 text-[0.925rem] leading-relaxed text-fg-muted">{project.summary}</p>
        <p className="mt-auto flex items-center gap-1.5 pt-5 text-[0.875rem] font-semibold text-brand">
          Read the case study
          <Icon name="arrow" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </p>
      </div>
    </article>
  );
}

function ProjectCover({ project }: { project: Project }) {
  return (
    <div
      aria-hidden
      className="relative flex aspect-[16/9] items-end overflow-hidden border-b border-border bg-brand-subtle p-6"
    >
      <Icon
        name={categoryIcon[project.category]}
        strokeWidth={1}
        className="absolute -top-4 -right-4 h-36 w-36 text-brand/15 transition-transform duration-300 group-hover:scale-105"
      />
      <span className="relative inline-flex items-center gap-2 rounded-[var(--radius-s)] bg-white px-2.5 py-1 text-[0.8rem] font-medium text-fg shadow-[var(--shadow-s)]">
        <Icon name={categoryIcon[project.category]} className="h-4 w-4 text-brand" />
        {project.kind}
      </span>
    </div>
  );
}
