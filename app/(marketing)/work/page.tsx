import type { Metadata } from "next";
import Link from "next/link";

import { CaseStudyCard, CtaBand, PageHero } from "@/components/marketing/blocks";
import { Section } from "@/components/marketing/section";
import { getService, services } from "@/content/services";
import { caseStudies } from "@/content/work";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Work",
  description: "Selected case studies: the problem, what we built, our role, the technology and the outcome.",
  alternates: { canonical: "/work" },
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Filter by service area via ?service=<slug>; a plain link list keeps this static and crawlable. */
export default async function WorkPage({ searchParams }: PageProps<"/work">) {
  const params = await searchParams;
  const active = first(params.service);
  const activeService = active ? getService(active) : undefined;
  const studies = activeService ? caseStudies.filter((s) => s.services.includes(activeService.slug)) : caseStudies;
  const usedServices = services.filter((s) => caseStudies.some((c) => c.services.includes(s.slug)));

  return (
    <>
      <PageHero
        eyebrow="Selected work"
        title="Problems we have solved"
        lede="Each study covers the problem, the solution, our role, the technology and the outcome. Client names appear only with permission."
      />

      <Section tone="light" className="pt-0 md:pt-0 lg:pt-0">
        <nav aria-label="Filter by service" className="flex flex-wrap gap-2 border-t border-border pt-8">
          <FilterLink href="/work" active={!activeService}>
            All
          </FilterLink>
          {usedServices.map((service) => (
            <FilterLink
              key={service.slug}
              href={`/work?service=${service.slug}`}
              active={activeService?.slug === service.slug}
            >
              {service.name}
            </FilterLink>
          ))}
        </nav>

        {studies.length > 0 ? (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {studies.map((study) => (
              <CaseStudyCard
                key={study.slug}
                study={study}
                serviceNames={study.services.map((slug) => getService(slug)?.name ?? slug)}
              />
            ))}
          </div>
        ) : (
          <p className="mt-10 text-fg-muted">
            No case studies for that service yet.{" "}
            <Link href="/work" className="text-fg underline-offset-4 hover:underline">
              Show all work
            </Link>
          </p>
        )}
      </Section>

      <CtaBand title="Want to be the next one?" />
    </>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-md border px-3 py-1.5 text-sm transition-colors duration-[120ms]",
        active ? "border-fg bg-fg text-bg" : "border-border text-fg-muted hover:border-border-strong hover:text-fg",
      )}
    >
      {children}
    </Link>
  );
}
