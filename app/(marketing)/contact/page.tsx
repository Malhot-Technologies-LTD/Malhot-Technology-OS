import type { Metadata } from "next";

import { PageHero, PlaceholderMark } from "@/components/marketing/blocks";
import { Section } from "@/components/marketing/section";
import { site } from "@/content/site";
import { ContactForm } from "@/features/inquiries/components/contact-form.client";

export const metadata: Metadata = {
  title: "Contact",
  description: `Start a project with ${site.name}. Tell us the problem and we reply within two working days.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Start a project"
        lede="Tell us what you are trying to build. We reply within two working days, usually with a few questions and a suggested first step."
      />
      <Section tone="light" className="py-12 md:py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_320px] lg:gap-20">
          <ContactForm />
          <aside className="flex flex-col gap-8 text-sm">
            <div className="flex flex-col gap-2">
              <h2 className="text-xs font-medium tracking-[0.08em] text-fg-subtle uppercase">Prefer email?</h2>
              <a
                href={`mailto:${site.contactEmail.value}`}
                className="text-base font-medium text-fg underline-offset-4 hover:underline"
              >
                {site.contactEmail.value}
              </a>
              {site.contactEmail.placeholder ? <PlaceholderMark className="w-fit" /> : null}
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-xs font-medium tracking-[0.08em] text-fg-subtle uppercase">Where we are</h2>
              <p className="text-fg-muted">{site.location}. We work with clients anywhere; most meetings are remote.</p>
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-xs font-medium tracking-[0.08em] text-fg-subtle uppercase">What happens next</h2>
              <ol className="flex list-decimal flex-col gap-1 pl-4 text-fg-muted">
                <li>We reply within two working days.</li>
                <li>A 30-minute call to understand the problem.</li>
                <li>A short written proposal with a first milestone.</li>
              </ol>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
