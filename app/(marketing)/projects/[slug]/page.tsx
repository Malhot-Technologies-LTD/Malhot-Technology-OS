import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/site/brand/Icon";
import { PageHero } from "@/components/site/layout/PageHero";
import { ButtonLink } from "@/components/site/ui/Button";
import { Reveal } from "@/components/site/ui/Reveal";
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

export default async function ProjectDetailPage({ params }: Params) {
  const { slug } = await params;
  const index = projects.findIndex((item) => item.slug === slug);
  if (index === -1) notFound();

  const project = projects[index];
  const next = projects[(index + 1) % projects.length];

  return (
    <>
      <PageHero
        eyebrow={`${project.category} · ${project.year}`}
        title={project.title}
        copy={project.summary}
        image={project.cover || project.image}
        breadcrumb={{ label: "Back to projects", href: "/projects" }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <ButtonLink href={project.liveUrl} target="_blank" rel="noreferrer" icon="arrowUpRight">
            View live project
          </ButtonLink>
          <ButtonLink
            href={project.repoUrl}
            target="_blank"
            rel="noreferrer"
            variant="secondary"
            icon="github"
            iconPosition="left"
          >
            Github
          </ButtonLink>
        </div>
      </PageHero>

      <section className="relative pb-6">
        <div className="shell">
          <Reveal>
            <div className="relative -mt-4 overflow-hidden rounded-[1.8rem] border border-white/10 sm:-mt-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                loading="lazy"
                decoding="async"
                src={project.cover || project.image}
                alt={project.title}
                className="aspect-[16/9] w-full object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(4,7,15,0.75))]" />
            </div>
          </Reveal>

          <div className="mt-10 flex flex-wrap gap-2">
            {project.stack.map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[0.75rem] text-white/60"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-16 sm:py-20">
        <div className="shell grid gap-6 lg:grid-cols-2">
          <Reveal>
            <article className="h-full rounded-[1.5rem] border border-white/8 bg-[#070d1d] p-8">
              <h2 className="display text-[1.4rem] text-white">Project overview</h2>
              <p className="mt-4 text-[0.95rem] leading-relaxed text-white/55">{project.overview}</p>
              <dl className="mt-8 grid grid-cols-2 gap-5 border-t border-white/8 pt-6 text-[0.85rem]">
                <div>
                  <dt className="text-white/55">Client</dt>
                  <dd className="mt-1 text-white/80">{project.client}</dd>
                </div>
                <div>
                  <dt className="text-white/55">Scope</dt>
                  <dd className="mt-1 text-white/80">{project.kind}</dd>
                </div>
              </dl>
            </article>
          </Reveal>

          <Reveal delay={0.1}>
            <article className="h-full rounded-[1.5rem] border border-white/8 bg-[#070d1d] p-8">
              <h2 className="display text-[1.4rem] text-white">Key features</h2>
              <ul className="mt-5 space-y-3.5">
                {project.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-[0.9rem] text-white/60">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-brand-400/40 bg-brand-500/12 text-brand-200">
                      <Icon name="check" className="h-3 w-3" strokeWidth={2.6} />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>
        </div>
      </section>

      <section className="relative pb-20">
        <div className="shell">
          <div className="grid gap-5 sm:grid-cols-3">
            {project.results.map((result, i) => (
              <Reveal key={result.label} delay={i * 0.08}>
                <div className="rounded-[1.3rem] border border-white/8 bg-[linear-gradient(170deg,rgba(43,108,255,0.12),rgba(7,13,29,0.85))] p-7">
                  <p className="display text-[clamp(1.8rem,4vw,2.6rem)] text-white">{result.value}</p>
                  <p className="mt-2 text-[0.75rem] tracking-[0.18em] text-white/55 uppercase">{result.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-t border-white/8 py-16">
        <div className="shell">
          <Link
            href={`/projects/${next.slug}`}
            className="group flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-[0.72rem] tracking-[0.24em] text-white/55 uppercase">Next project</p>
              <p className="display mt-3 text-[clamp(1.8rem,4.4vw,3rem)] text-white transition-transform duration-700 group-hover:translate-x-2">
                {next.title}
              </p>
            </div>
            <div className="relative h-28 w-full overflow-hidden rounded-[36px] border border-white/10 sm:w-56">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                loading="lazy"
                decoding="async"
                src={next.image}
                alt={next.title}
                className="h-full w-full object-cover opacity-70 transition-transform duration-[1200ms] group-hover:scale-110"
              />
              <span className="absolute inset-0 grid place-items-center bg-black/30 text-white">
                <Icon name="arrowUpRight" className="h-5 w-5" />
              </span>
            </div>
          </Link>
        </div>
      </section>
    </>
  );
}
