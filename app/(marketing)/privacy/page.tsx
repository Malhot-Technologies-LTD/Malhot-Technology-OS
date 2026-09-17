import type { Metadata } from "next";

import { PageHero, PlaceholderMark } from "@/components/marketing/blocks";
import { Section } from "@/components/marketing/section";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: `How ${site.name} handles the personal data you share through this website.`,
  alternates: { canonical: "/privacy" },
};

const UPDATED = "16 September 2026";

/**
 * Privacy notice for the contact form and analytics (docs/product/public-website.md).
 * Factual about what the site does today; legal review is an OD-7 content task.
 */
export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy notice" lede={`Last updated ${UPDATED}.`} />
      <Section className="py-12 md:py-16">
        <div className="mx-auto flex max-w-[720px] flex-col gap-8 leading-relaxed text-fg-muted">
          <p className="flex items-center gap-2 text-sm">
            <PlaceholderMark /> Pending legal review and a named data controller contact.
          </p>

          <Clause title="Who we are">
            {site.name}, {site.location}. Questions about this notice go to {site.contactEmail.value}.
          </Clause>

          <Clause title="What we collect and why">
            <p>
              <strong className="text-fg">Contact form.</strong> Your name, email address, optional company and budget
              range, and your message. We use them only to reply to your enquiry and, if we work together, to set up the
              project. We also store a one-way hash of your network address for 24 hours to limit automated submissions;
              it cannot be turned back into your address.
            </p>
            <p>
              <strong className="text-fg">Analytics.</strong> We use cookie-less, aggregate page analytics (page views,
              referrers, device class). No cookies are set and no individual visitor is identified.
            </p>
            <p>
              <strong className="text-fg">Team login.</strong> The login area is for Malhot staff. It sets strictly
              necessary session cookies for signed-in team members only.
            </p>
          </Clause>

          <Clause title="Where it is stored">
            Enquiries are stored in our operations system, hosted on Supabase, and are visible only to Malhot
            administrators. The website is served by Vercel.
          </Clause>

          <Clause title="How long we keep it">
            Enquiries are kept while we are in conversation and for up to two years afterwards, then deleted. You can
            ask us to delete your enquiry earlier at any time.
          </Clause>

          <Clause title="Your rights">
            You can ask what we hold about you, ask us to correct or delete it, or object to our use of it. Email{" "}
            {site.contactEmail.value} and we will respond within 30 days.
          </Clause>

          <Clause title="Changes">
            We will update this page when the way the site handles data changes, and change the date at the top.
          </Clause>
        </div>
      </Section>
    </>
  );
}

function Clause({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-bold tracking-[-0.01em] text-fg">{title}</h2>
      {typeof children === "string" ? <p>{children}</p> : children}
    </section>
  );
}
