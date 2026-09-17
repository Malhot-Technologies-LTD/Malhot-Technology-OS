import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { caseStudyPhoto, CtaBand, PageHero, PlaceholderMark } from "@/components/marketing/blocks";
import { Section } from "@/components/marketing/section";
import { Picture } from "@/components/marketing/visuals";
import { getService } from "@/content/services";
import { caseStudies, getCaseStudy } from "@/content/work";

export function generateStaticParams() {
  return caseStudies.map((study) => ({ slug: study.slug }));
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  if (!study) return {};
  return {
    title: study.title,
    description: study.summary,
    alternates: { canonical: `/work/${study.slug}` },
    openGraph: { title: study.title, description: study.summary, type: "article" },
  };
}

export default async function CaseStudyPage({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  if (!study) notFound();

  const facts = [
    { label: "Client", value: study.client },
    { label: "Year", value: study.year },
    { label: "Services", value: study.services.map((s) => getService(s)?.name ?? s).join(", ") },
    { label: "Technology", value: study.technology.join(", ") },
  ];

  return (
    <article>
      <PageHero eyebrow={`${study.client} · ${study.year}`} title={study.title} lede={study.summary}>
        {study.placeholder ? (
          <p className="flex items-center gap-2 text-sm text-fg-muted">
            <PlaceholderMark /> This study is illustrative and will be replaced with a real one before launch.
          </p>
        ) : null}
      </PageHero>

      <Section className="pt-0 md:pt-0 lg:pt-0">
        <Picture
          photo={caseStudyPhoto(study.slug)}
          sizes="(min-width: 1200px) 1200px, 100vw"
          priority
          className="-mt-8 aspect-[21/9] rounded-3xl shadow-m md:-mt-10"
        />

        <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_300px] lg:gap-20">
          <div className="flex flex-col gap-12">
            <Block title="Problem" paragraphs={study.problem} />
            <Block title="Solution" paragraphs={study.solution} />
            <Block title="Our role" paragraphs={[study.role]} />
            <Block title="Outcome" paragraphs={study.outcome} />
          </div>
          <aside aria-label="Project facts" className="lg:sticky lg:top-28 lg:self-start">
            <dl className="flex flex-col gap-5 rounded-2xl border border-border bg-white p-6 shadow-s">
              {facts.map((fact) => (
                <div key={fact.label} className="flex flex-col gap-1">
                  <dt className="text-xs font-bold tracking-wide text-fg-subtle uppercase">{fact.label}</dt>
                  <dd className="text-sm text-fg">{fact.value}</dd>
                </div>
              ))}
            </dl>
            <Link
              href="/work"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline"
            >
              <ArrowLeft aria-hidden="true" className="size-4" /> All work
            </Link>
          </aside>
        </div>
      </Section>

      <CtaBand title="Have a similar problem?" />
    </article>
  );
}

function Block({ title, paragraphs }: { title: string; paragraphs: readonly string[] }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold tracking-[-0.02em] text-fg">{title}</h2>
      {paragraphs.map((p) => (
        <p key={p} className="max-w-[720px] leading-relaxed text-fg-muted md:text-lg">
          {p}
        </p>
      ))}
    </section>
  );
}
