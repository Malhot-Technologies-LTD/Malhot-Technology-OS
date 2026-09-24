import type { Metadata } from "next";

import { PageHero } from "@/components/site/layout/PageHero";
import { media, site } from "@/content/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: `How ${site.name} handles the personal data you share through this website.`,
  alternates: { canonical: "/privacy" },
};

const UPDATED = "24 September 2026";

/**
 * Privacy notice for the contact form, the project brief and analytics.
 *
 * Restyled onto the dark site when the website and the OS merged, but the
 * clauses are unchanged except where the merge changed the facts: /start now
 * writes to the same enquiry store as the contact form, so it is named here.
 *
 * Factual about what the site does today. A legal review and a named data
 * controller are still outstanding (content/README.md).
 */
export default function PrivacyPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Privacy notice"
        highlight="notice"
        copy={`Last updated ${UPDATED}.`}
        image={media.night}
        breadcrumb={{ label: "Home", href: "/" }}
      />

      <section className="shell py-20 sm:py-28">
        <div className="mx-auto flex max-w-[46rem] flex-col gap-10">
          <p className="rounded-[20px] border border-amber-400/25 bg-amber-400/10 px-5 py-4 text-[0.88rem] leading-relaxed text-amber-100/90">
            Pending legal review and a named data controller contact.
          </p>

          <Clause title="Who we are">
            {site.legalName}, {site.location}. Questions about this notice go to {site.email}.
          </Clause>

          <Clause title="What we collect and why">
            <p>
              <strong className="font-semibold text-white">Contact form and project briefs.</strong> Your name, email
              address, optional company, phone and budget range, and whatever you write in the message or brief. We use
              them only to reply to you and, if we work together, to set up the project. We also store a one-way hash of
              your network address for 24 hours to limit automated submissions; it cannot be turned back into your
              address.
            </p>
            <p>
              <strong className="font-semibold text-white">A saved draft.</strong> The project brief at /start keeps
              what you have typed in your own browser&apos;s local storage so you can close the tab and come back. It
              never leaves your device until you submit, and it is cleared the moment you do.
            </p>
            <p>
              <strong className="font-semibold text-white">Analytics.</strong> We use cookie-less, aggregate page
              analytics (page views, referrers, device class). No cookies are set and no individual visitor is
              identified.
            </p>
            <p>
              <strong className="font-semibold text-white">Team login.</strong> The login area is for {site.name} staff
              and invited collaborators. It sets strictly necessary session cookies for signed-in people only.
            </p>
            {/*
             * Not optional wording. The background clips on the home, projects
             * and contact pages are served by a third party behind Cloudflare,
             * which sets __cf_bm and _cfuvid on the visitor when a clip loads.
             * Claiming "no cookies are set" while that happens would be false.
             * See content/README.md — vendoring or dropping the clips removes
             * this paragraph along with the cookies.
             */}
            <p>
              <strong className="font-semibold text-white">Background video.</strong> Some pages play a short background
              clip on wide screens. The clips are hosted by Pexels and delivered through Cloudflare, which sets its own
              bot-management cookies (<code>__cf_bm</code>, <code>_cfuvid</code>) in your browser when one loads. We do
              not read them and they carry nothing about you from us. No clip loads on a narrow screen, on a metered
              connection, or if you have asked your system to reduce motion.
            </p>
          </Clause>

          <Clause title="Where it is stored">
            Enquiries and briefs are stored in our internal systems and are visible only to {site.name} administrators.
            The website is served by Vercel.
          </Clause>

          <Clause title="How long we keep it">
            Enquiries are kept while we are in conversation and for up to two years afterwards, then deleted. You can
            ask us to delete yours earlier at any time.
          </Clause>

          <Clause title="Your rights">
            You can ask what we hold about you, ask us to correct or delete it, or object to our use of it. Email{" "}
            {site.email} and we will respond within 30 days.
          </Clause>

          <Clause title="Changes">
            We will update this page when the way the site handles data changes, and change the date at the top.
          </Clause>
        </div>
      </section>
    </>
  );
}

function Clause({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-white/10 pt-7">
      <h2 className="display text-[1.4rem] text-white">{title}</h2>
      <div className="flex flex-col gap-3 text-[1rem] leading-relaxed text-white/60">
        {typeof children === "string" ? <p>{children}</p> : children}
      </div>
    </section>
  );
}
