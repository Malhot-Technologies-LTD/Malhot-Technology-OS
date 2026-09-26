import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon } from "@/components/site/brand/Icon";
import { PageHero } from "@/components/site/layout/PageHero";
import { CtaBand } from "@/components/site/sections/CtaBand";
import { CheckList, Section } from "@/components/site/ui/Section";
import { projects } from "@/content/site";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const project = projects.find((item) => item.slug === slug);
  if (!project) return { title: "Project not found" };
  return { title: project.title, description: project.summary };
}

/**
 * A case study.
 *
 * Results are shown only for a project whose figures have been confirmed
 * (`unverified` unset). A number on a case study reads as a measured fact, and
 * the imported ones were never sourced (content/README.md). The live-site and
 * repository links are not rendered at all: every one of them points at a
 * placeholder, not at the product.
 */
export default async function ProjectDetailPage({ params }: Params) {
  const { slug } = await params;
  const index = projects.findIndex((item) => item.slug === slug);
  if (index === -1) notFound();

  const project = projects[index];
  const next = projects[(index + 1) % projects.length];
  const facts = [
    { term: "Client", detail: project.client },
    { term: "Scope", detail: project.kind },
    { term: "Category", detail: project.category },
    { term: "Year", detail: project.year },
  ];

  return (
    <>
      <PageHero
        eyebrow={`${project.category} · ${project.year}`}
        title={project.title}
        lead={project.summary}
        breadcrumb={{ label: "All projects", href: "/projects" }}
      />

      <Section>
        <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr] lg:gap-16">
          <div>
            <h2 className="text-[1.5rem] font-semibold text-fg">Overview</h2>
            <p className="mt-4 text-[1.02rem] leading-relaxed text-fg-muted">{project.overview}</p>

            <h2 className="mt-12 text-[1.5rem] font-semibold text-fg">What we built</h2>
            <CheckList items={project.features} className="mt-5" />

            {!project.unverified ? (
              <>
                <h2 className="mt-12 text-[1.5rem] font-semibold text-fg">Results</h2>
                <dl className="mt-5 grid gap-5 sm:grid-cols-3">
                  {project.results.map((result) => (
                    <div
                      key={result.label}
                      className="flex flex-col-reverse rounded-[var(--radius-l)] border border-border p-6"
                    >
                      <dt className="mt-1 text-[0.9rem] text-fg-muted">{result.label}</dt>
                      <dd className="text-[1.8rem] font-semibold text-brand">{result.value}</dd>
                    </div>
                  ))}
                </dl>
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
          </aside>
        </div>
      </Section>

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

      <CtaBand />
    </>
  );
}
