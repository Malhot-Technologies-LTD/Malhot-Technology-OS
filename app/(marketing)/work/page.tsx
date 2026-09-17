import type { Metadata } from "next";
import Link from "next/link";

import { CaseStudyCard, CtaBand, PageHero } from "@/components/marketing/blocks";
import { Accent, Section } from "@/components/marketing/section";
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

/** Filter by service area via ?service=<slug>; plain links keep this crawlable. */
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
        title={
          <>
            Problems we have <Accent>solved</Accent>
          </>
        }
        lede="Each study covers the problem, the solution, our role, the technology and the outcome. Client names appear only with permission."
      />

      <Section className="py-14 md:py-16 lg:py-20">
        <nav aria-label="Filter by service" className="flex flex-wrap gap-2">
          <FilterLink href="/work" active={!activeService}>
            All work
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
          <div className="mt-10">
            <p className="border-t border-border py-12 text-fg-muted">
              No case studies for that service yet.{" "}
              <Link href="/work" className="font-medium text-brand underline underline-offset-4">
                Show all work
              </Link>
            </p>
          </div>
        )}
      </Section>

      <CtaBand
        title="Want to be the next one?"
        lede="Tell us the problem you are trying to solve and we will tell you honestly whether we are the right team for it."
      />
    </>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-[3px] border px-3.5 py-2 text-sm font-medium transition-colors duration-200",
        active
          ? "border-site-ink bg-site-ink text-white"
          : "border-border text-fg-muted hover:border-border-strong hover:text-fg",
      )}
    >
      {children}
    </Link>
  );
}
