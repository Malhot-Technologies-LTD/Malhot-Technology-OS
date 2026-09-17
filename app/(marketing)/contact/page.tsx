import type { Metadata } from "next";

import { PageHero, PlaceholderMark } from "@/components/marketing/blocks";
import { Accent, Section } from "@/components/marketing/section";
import { site } from "@/content/site";
import { ContactForm } from "@/features/inquiries/components/contact-form.client";

export const metadata: Metadata = {
  title: "Contact",
  description: `Start a project with ${site.name}. Tell us the problem and we reply within two working days.`,
  alternates: { canonical: "/contact" },
};

const NEXT_STEPS = [
  { step: "A reply within two working days", detail: "From a person who has read your message, not an autoresponder." },
  { step: "A 30-minute call", detail: "We ask about the problem, the users and the constraints. No pitch deck." },
  { step: "A short written proposal", detail: "Scope, a first milestone, a price and a date. You decide from there." },
] as const;

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Get in touch"
        title={
          <>
            Start a <Accent>project</Accent>
          </>
        }
        lede="Tell us what you are trying to build. We reply within two working days, usually with a few questions and a suggested first step."
      />

      <Section className="py-14 md:py-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* The form leads: it is the only thing this page is for */}
          <div className="lg:col-span-7">
            <div className="border-t-2 border-site-ink bg-white p-6 shadow-l md:p-8">
              <ContactForm />
            </div>
          </div>

          <aside className="flex flex-col gap-10 lg:col-span-5">
            <div className="flex flex-col gap-2 border-t border-border pt-5">
              <h2 className="text-[11px] font-semibold tracking-[0.18em] text-fg-subtle uppercase">Prefer email?</h2>
              <a
                href={`mailto:${site.contactEmail.value}`}
                className="w-fit text-[19px] font-bold tracking-[-0.02em] text-brand underline-offset-4 hover:underline"
              >
                {site.contactEmail.value}
              </a>
              {site.contactEmail.placeholder ? <PlaceholderMark className="w-fit" /> : null}
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-5">
              <h2 className="text-[11px] font-semibold tracking-[0.18em] text-fg-subtle uppercase">Where we are</h2>
              <p className="text-[15px] leading-relaxed text-fg-muted">
                {site.location}. We work with clients anywhere; most meetings are remote.
              </p>
            </div>

            <div className="flex flex-col gap-4 border-t border-border pt-5">
              <h2 className="text-[11px] font-semibold tracking-[0.18em] text-fg-subtle uppercase">
                What happens next
              </h2>
              <ol className="flex flex-col gap-5">
                {NEXT_STEPS.map((item, index) => (
                  <li key={item.step} className="flex gap-4">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[3px] bg-site-ink font-mono text-xs font-semibold text-white tabular-nums">
                      {index + 1}
                    </span>
                    <div className="flex flex-col gap-1">
                      <p className="text-[15px] font-semibold text-fg">{item.step}</p>
                      <p className="text-sm leading-relaxed text-fg-muted">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
