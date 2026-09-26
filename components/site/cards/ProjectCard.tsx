import Image from "next/image";
import Link from "next/link";

import { Icon, type IconName } from "@/components/site/brand/Icon";
import type { ShowcaseCard } from "@/features/showcase/public";
import type { ShowcaseCategory } from "@/features/showcase/schemas";

export const categoryIcon: Record<ShowcaseCategory, IconName> = {
  Web: "code",
  Mobile: "mobile",
  Design: "design",
  Marketing: "growth",
};

/** "Web · 2025", or just the category when no year was given. */
export function projectEyebrow(project: Pick<ShowcaseCard, "category" | "year">): string {
  return project.year ? `${project.category} · ${project.year}` : project.category;
}

/**
 * A project in the grid, as published from Settings → Website.
 *
 * The cover is the project's first photo. Without one it falls back to a
 * typographic cover rather than a stock image: a photo of a keyboard above a
 * case study reads as exactly what it is.
 */
export function ProjectCard({ project, headingLevel = "h3" }: { project: ShowcaseCard; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-l)] border border-border bg-white transition-shadow duration-200 hover:shadow-[var(--shadow-m)]">
      <ProjectCover project={project} />
      <div className="flex flex-1 flex-col p-6">
        <p className="text-[0.75rem] font-semibold tracking-[0.12em] text-brand uppercase">{projectEyebrow(project)}</p>
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

function ProjectCover({ project }: { project: ShowcaseCard }) {
  if (project.cover) {
    return (
      <div className="relative aspect-[16/9] overflow-hidden border-b border-border bg-bg-subtle">
        {/* Decorative here: the title below names the project, and the photo's own description is on its page. */}
        <Image
          src={project.cover.url}
          alt=""
          fill
          sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </div>
    );
  }

  const icon = categoryIcon[project.category];
  return (
    <div
      aria-hidden
      className="relative flex aspect-[16/9] items-end overflow-hidden border-b border-border bg-brand-subtle p-6"
    >
      <Icon
        name={icon}
        strokeWidth={1}
        className="absolute -top-4 -right-4 h-36 w-36 text-brand/15 transition-transform duration-300 group-hover:scale-105"
      />
      <span className="relative inline-flex items-center gap-2 rounded-[var(--radius-s)] bg-white px-2.5 py-1 text-[0.8rem] font-medium text-fg shadow-[var(--shadow-s)]">
        <Icon name={icon} className="h-4 w-4 text-brand" />
        {project.scope ?? project.category}
      </span>
    </div>
  );
}
