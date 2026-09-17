import type { Metadata } from "next";
import { ArrowRight, CalendarCheck, Clock, Mail, MapPin, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Backdrop, CaseStudyCard, Pattern, ServiceRow } from "@/components/marketing/blocks";
import { Accent, Container, Eyebrow, Section, SectionHeading } from "@/components/marketing/section";
import { ServiceIcon } from "@/components/marketing/service-icons";
import { SiteButton } from "@/components/marketing/site-button";
import { PhotoCollage, Picture } from "@/components/marketing/visuals";
import { photos } from "@/content/images";
import { stages } from "@/content/process";
import { getService, services } from "@/content/services";
import { site } from "@/content/site";
import { caseStudies } from "@/content/work";
import { ContactForm } from "@/features/inquiries/components/contact-form.client";

export const metadata: Metadata = {
  title: { absolute: `${site.name} — ${site.tagline}` },
  description: site.description,
  alternates: { canonical: "/" },
};

const TECH = ["Next.js", "TypeScript", "Postgres", "Supabase", "Vercel", "GitHub", "Tailwind CSS", "Playwright"];

const FACTS = [
  { value: "5", label: "Specialists on every project: delivery, frontend, backend, QA, marketing" },
  { value: "7", label: "Stages from discovery to support, each with a written output" },
  { value: "Weekly", label: "Working software on a preview link, with a written progress note" },
  { value: "2 days", label: "Maximum time to a first reply on any enquiry" },
] as const;

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <div className="relative overflow-hidden">
        <Backdrop />
        <Container className="relative grid items-center gap-10 pt-12 pb-16 md:pt-16 md:pb-24 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <div className="flex flex-col items-start gap-6">
            <Eyebrow>Software company · Kigali</Eyebrow>
            <h1 className="text-[40px] leading-[1.05] font-bold tracking-[-0.03em] text-balance text-fg md:text-[56px] lg:text-[64px]">
              Software that ships. <Accent>Systems that last.</Accent>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-fg-muted md:text-lg">
              We design, build and run websites, web applications, backend systems and automation for businesses that
              need software to simply work: on time, tested, and documented well enough to run without us.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <SiteButton asChild size="lg">
                <Link href="/contact">
                  Start a project <ArrowRight aria-hidden="true" />
                </Link>
              </SiteButton>
              <SiteButton asChild variant="secondary" size="lg">
                <Link href="/work">See our work</Link>
              </SiteButton>
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-fg-muted">
              <li className="inline-flex items-center gap-2">
                <Clock aria-hidden="true" className="size-4 text-brand" /> Reply within two working days
              </li>
              <li className="inline-flex items-center gap-2">
                <ShieldCheck aria-hidden="true" className="size-4 text-brand" /> Fixed milestones, written reports
              </li>
            </ul>
          </div>
          <div className="relative mx-auto w-full max-w-[520px] lg:max-w-none">
            <Picture
              photo={photos.hero}
              priority
              sizes="(min-width: 1024px) 45vw, (min-width: 640px) 520px, 100vw"
              className="aspect-[4/5] rounded-2xl shadow-l lg:aspect-auto lg:h-[520px]"
            />
            <Link
              href="/contact"
              className="absolute -bottom-6 left-4 flex items-center gap-4 rounded-2xl border border-border bg-white p-4 pr-5 shadow-m transition-colors hover:border-brand sm:left-6"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-brand text-white">
                <CalendarCheck aria-hidden="true" className="size-5" />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-bold text-fg">Free 30-minute consultation</span>
                <span className="text-xs text-fg-muted">Book a call, no commitment →</span>
              </span>
            </Link>
          </div>
        </Container>
      </div>

      {/* Technology strip (stands in for the client logo strip until real logos exist) */}
      <section aria-labelledby="tech-heading" className="border-y border-border bg-bg-subtle py-8">
        <Container className="flex flex-col items-center gap-5">
          <h2 id="tech-heading" className="text-sm font-semibold text-fg-muted">
            Technologies we build with every week
          </h2>
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {TECH.map((name) => (
              <li key={name} className="text-base font-bold tracking-tight text-fg-muted">
                {name}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* About */}
      <Section aria-labelledby="about-heading">
        <SectionHeading
          id="about-heading"
          eyebrow="About our company"
          title={
            <>
              At Malhot, we believe every business deserves software that is{" "}
              <Accent>built properly, tested honestly</Accent> and handed over with the documents to run it
            </>
          }
        />
        <PhotoCollage className="mt-14 mb-14 sm:mb-20" />
        <div className="flex justify-center">
          <SiteButton asChild variant="secondary">
            <Link href="/about">
              More about us <ArrowRight aria-hidden="true" />
            </Link>
          </SiteButton>
        </div>
      </Section>

      {/* Services */}
      <Section tone="subtle" aria-labelledby="services-heading">
        <SectionHeading
          id="services-heading"
          eyebrow="Our services"
          title="Complete software delivery"
          lede="From the first conversation to the day-to-day running of what we built."
        />
        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.15fr] lg:gap-12">
          <div className="relative overflow-hidden rounded-3xl shadow-l">
            <Picture photo={photos.pairing} sizes="(min-width: 1024px) 45vw, 100vw" className="absolute inset-0" />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-site-navy via-site-navy/60 to-transparent"
            />
            <div className="relative flex min-h-[420px] flex-col justify-end gap-4 p-8 text-white md:p-10">
              <Eyebrow onNavy>How we work</Eyebrow>
              <h3 className="text-[26px] leading-tight font-bold tracking-[-0.02em] md:text-[30px]">
                {stages.length} stages, one team, no hand-offs
              </h3>
              <p className="max-w-md text-white/80">
                {stages.map((s) => s.name).join(" → ")}. The people who design your system are the people who build,
                test and deploy it.
              </p>
              <SiteButton asChild variant="white" className="mt-2 w-fit">
                <Link href="/process">
                  See the full process <ArrowRight aria-hidden="true" />
                </Link>
              </SiteButton>
            </div>
          </div>
          <div className="flex flex-col rounded-2xl border border-border bg-white p-6 md:p-8">
            {services.slice(0, 4).map((service, index) => (
              <ServiceRow
                key={service.slug}
                index={index}
                name={service.name}
                summary={service.summary}
                href={`/services#${service.slug}`}
                icon={<ServiceIcon slug={service.slug} />}
              />
            ))}
            <Link
              href="/services"
              className="mt-6 inline-flex items-center gap-2 self-start text-sm font-semibold text-fg hover:text-brand"
            >
              All {services.length} service areas <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>
      </Section>

      {/* Work */}
      <Section aria-labelledby="work-heading">
        <SectionHeading id="work-heading" eyebrow="Our projects" title="Showcasing our work" />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {caseStudies.slice(0, 4).map((study) => (
            <CaseStudyCard
              key={study.slug}
              study={study}
              serviceNames={study.services.map((slug) => getService(slug)?.name ?? slug)}
            />
          ))}
        </div>
        <div className="relative mt-8 overflow-hidden rounded-2xl bg-brand px-6 py-10 text-white md:px-12">
          <Pattern />
          <div className="relative flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2">
              <h3 className="text-[24px] leading-tight font-bold tracking-[-0.02em] md:text-[30px]">
                See the work, judge the results
              </h3>
              <p className="text-white/80">
                Each project tells one story: the problem, what we built, and what happened next.
              </p>
            </div>
            <SiteButton asChild variant="white">
              <Link href="/work">
                View all work <ArrowRight aria-hidden="true" />
              </Link>
            </SiteButton>
          </div>
        </div>
      </Section>

      {/* Facts over photo */}
      <section aria-labelledby="facts-heading" className="relative overflow-hidden bg-site-navy text-white">
        <Picture photo={photos.serverRoom} sizes="100vw" className="absolute inset-0 opacity-30" />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-site-navy via-site-navy/85 to-site-navy/40"
        />
        <Container className="relative grid items-center gap-10 py-20 md:py-28 lg:grid-cols-[1fr_1.4fr]">
          <SectionHeading
            id="facts-heading"
            align="start"
            onNavy
            eyebrow="Why Malhot"
            title="Our approach, in numbers"
          />
          <dl className="grid gap-8 sm:grid-cols-2">
            {FACTS.map((fact) => (
              <div key={fact.label} className="flex flex-col gap-2 border-l-2 border-site-blue-light pl-5">
                <dt className="order-2 text-sm text-white/75">{fact.label}</dt>
                <dd className="order-1 text-[40px] leading-none font-bold tracking-[-0.03em] text-white">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* Contact */}
      <Section aria-labelledby="contact-heading">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
          <div className="flex flex-col gap-8">
            <SectionHeading
              id="contact-heading"
              align="start"
              eyebrow="Get in touch"
              title="Talk to the engineers who will build it"
              lede="Tell us what you are trying to build. We reply within two working days, usually with a few questions and a suggested first step."
            />
            <ul className="flex flex-col gap-4">
              <li className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-subtle text-brand">
                  <MapPin aria-hidden="true" className="size-5" />
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-fg">Location</span>
                  <span className="text-sm text-fg-muted">{site.location}. Remote-first, with clients anywhere.</span>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-subtle text-brand">
                  <Mail aria-hidden="true" className="size-5" />
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-fg">Email</span>
                  <a href={`mailto:${site.contactEmail.value}`} className="text-sm text-fg-muted hover:text-brand">
                    {site.contactEmail.value}
                  </a>
                </div>
              </li>
            </ul>
            <Picture
              photo={photos.meeting}
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="hidden aspect-[4/3] rounded-3xl shadow-s lg:block"
            />
          </div>
          <div className="rounded-3xl border border-border bg-white p-6 shadow-l md:p-8">
            <h3 className="mb-1 text-xl font-bold tracking-[-0.01em] text-fg">Book a free consultation</h3>
            <p className="mb-6 text-sm text-fg-muted">A 30-minute call, no commitment.</p>
            <ContactForm />
          </div>
        </div>
      </Section>
    </>
  );
}
