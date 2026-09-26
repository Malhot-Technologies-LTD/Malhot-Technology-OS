import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon } from "@/components/site/brand/Icon";
import { projectEyebrow } from "@/components/site/cards/ProjectCard";
import { PageHero } from "@/components/site/layout/PageHero";
import { CtaBand } from "@/components/site/sections/CtaBand";
import { CheckList, Section } from "@/components/site/ui/Section";
import { getPublishedShowcase, listPublishedShowcases } from "@/features/showcase/public";

type Params = { params: Promise<{ slug: string }> };

/**
 * Prerenders every project published at build time. A project published later
 * renders on its first visit and is cached from then on; saving it in
 * Settings → Website expires that cache.
 */
export async function generateStaticParams() {
  const projects = await listPublishedShowcases();
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublishedShowcase(slug);
  if (!project) return { title: "Project not found" };
  return {
    title: project.title,
    description: project.summary,
    openGraph: project.cover ? { images: [{ url: project.cover.url, alt: project.cover.alt }] } : undefined,
  };
}

/**
 * A case study, as written in Settings → Website. Every section beyond the
 * summary is optional there, so each one renders only when it has content.
 */
export default async function ProjectDetailPage({ params }: Params) {
  const { slug } = await params;
  const [project, all] = await Promise.all([getPublishedShowcase(slug), listPublishedShowcases()]);
  if (!project) notFound();

  const index = all.findIndex((item) => item.slug === slug);
  const next = all.length > 1 && index !== -1 ? all[(index + 1) % all.length] : null;

  const facts = [
    { term: "Client", detail: project.clientLabel },
    { term: "Scope", detail: project.scope },
    { term: "Category", detail: project.category },
    { term: "Year", detail: project.year?.toString() ?? null },
  ].filter((fact): fact is { term: string; detail: string } => Boolean(fact.detail));

  const [hero, ...gallery] = project.images;

  return (
    <>
      <PageHero
        eyebrow={projectEyebrow(project)}
        title={project.title}
        lead={project.summary}
        breadcrumb={{ label: "All projects", href: "/projects" }}
      />

      {hero ? (
        <section aria-label="Project photos" className="bg-bg pt-12 sm:pt-16">
          <div className="shell">
            <figure className="relative aspect-[16/9] overflow-hidden rounded-[var(--radius-l)] border border-border bg-bg-subtle">
              <Image
                src={hero.url}
                alt={hero.alt}
                fill
                priority
                sizes="(min-width: 1280px) 1200px, 100vw"
                className="object-cover"
              />
            </figure>
            {gallery.length > 0 ? (
              <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {gallery.map((image) => (
                  <li key={image.id}>
                    <a
                      href={image.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative block aspect-[4/3] overflow-hidden rounded-[var(--radius-l)] border border-border bg-bg-subtle"
                    >
                      <Image
                        src={image.url}
                        alt={image.alt}
                        fill
                        sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                      <span className="sr-only">(opens the full-size photo in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ) : null}

      <Section>
        <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr] lg:gap-16">
          <div>
            {project.overview ? (
              <>
                <h2 className="text-[1.5rem] font-semibold text-fg">Overview</h2>
                <p className="mt-4 text-[1.02rem] leading-relaxed whitespace-pre-line text-fg-muted">
                  {project.overview}
                </p>
              </>
            ) : null}

            {project.features.length > 0 ? (
              <>
                <h2 className="mt-12 text-[1.5rem] font-semibold text-fg first:mt-0">What we built</h2>
                <CheckList items={project.features} className="mt-5" />
              </>
            ) : null}
          </div>

          <aside className="h-fit rounded-[var(--radius-l)] border border-border bg-bg-subtle p-7">
            <h2 className="text-[0.8rem] font-semibold tracking-[0.12em] text-fg uppercase">Project details</h2>
            <dl className="mt-5 divide-y divide-border">
              {facts.map((fact) => (
                <div key={fact.term} className="flex justify-between gap-6 py-3 text-[0.925rem]">
                  <dt className="text-fg-muted">{fact.term}</dt>
                  <dd className="text-right font-medium text-fg">{fact.detail}</dd>
                </div>
              ))}
            </dl>
            {project.stack.length > 0 ? (
              <>
                <h3 className="mt-7 text-[0.8rem] font-semibold tracking-[0.12em] text-fg uppercase">Technology</h3>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {project.stack.map((tech) => (
                    <li
                      key={tech}
                      className="rounded-[var(--radius-s)] border border-border bg-white px-2.5 py-1 text-[0.825rem] text-fg"
                    >
                      {tech}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {project.liveUrl ? (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-7 inline-flex items-center gap-1.5 text-[0.925rem] font-semibold text-brand hover:underline"
              >
                Visit the live product
                <Icon name="arrow" className="h-4 w-4" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : null}
          </aside>
        </div>
      </Section>

      {next ? (
        <section aria-label="Next project" className="border-t border-border bg-bg-subtle">
          <div className="shell py-10">
            <Link href={`/projects/${next.slug}`} className="group flex items-center justify-between gap-6">
              <span>
                <span className="block text-[0.8rem] font-semibold tracking-[0.12em] text-fg-subtle uppercase">
                  Next project
                </span>
                <span className="mt-1.5 block text-[clamp(1.3rem,2.6vw,1.8rem)] font-semibold text-fg group-hover:text-brand">
                  {next.title}
                </span>
              </span>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-border-strong bg-white text-fg transition-colors group-hover:border-brand group-hover:bg-brand group-hover:text-white">
                <Icon name="arrow" className="h-5 w-5" />
              </span>
            </Link>
          </div>
        </section>
      ) : null}

      <CtaBand />
    </>
  );
}
