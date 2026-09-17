import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CtaBand, PageHero, PlaceholderMark } from "@/components/marketing/blocks";
import { Section } from "@/components/marketing/section";
import { ArrowLink } from "@/components/marketing/site-button";
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
          <p className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
            <PlaceholderMark />
            This study is illustrative and will be replaced with a real one before launch.
          </p>
        ) : null}
      </PageHero>

      <Section>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="flex flex-col gap-10 lg:col-span-8">
            <Block title="Problem" paragraphs={study.problem} />
            <Block title="Solution" paragraphs={study.solution} />
            <Block title="Our role" paragraphs={[study.role]} />
            <Block title="Outcome" paragraphs={study.outcome} />
          </div>

          <aside aria-label="Project facts" className="lg:col-span-4">
            <dl className="flex flex-col gap-4 border border-border bg-bg-subtle p-6 lg:sticky lg:top-24">
              {facts.map((fact) => (
                <div key={fact.label} className="flex flex-col gap-1">
                  <dt className="text-[12px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">{fact.label}</dt>
                  <dd className="text-[15px] leading-relaxed text-fg">{fact.value}</dd>
                </div>
              ))}
              <ArrowLink asChild className="pt-2">
                <Link href="/work">All case studies</Link>
              </ArrowLink>
            </dl>
          </aside>
        </div>
      </Section>

      <CtaBand
        title="Have a problem that looks like this?"
        lede="Tell us where it hurts and we will suggest the smallest thing worth building first."
      />
    </article>
  );
}

function Block({ title, paragraphs }: { title: string; paragraphs: readonly string[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[24px] leading-snug font-bold tracking-[-0.02em] text-fg">{title}</h2>
      {paragraphs.map((paragraph) => (
        <p key={paragraph} className="max-w-2xl text-[17px] leading-relaxed text-fg-muted">
          {paragraph}
        </p>
      ))}
    </section>
  );
}
