import type { Metadata } from "next";

import { Icon } from "@/components/site/brand/Icon";
import { PageHero } from "@/components/site/layout/PageHero";
import { ContactForm } from "@/components/site/sections/ContactForm";
import { ButtonLink } from "@/components/site/ui/Button";
import { Section } from "@/components/site/ui/Section";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Talk to ${site.name} about your next software project. Based in ${site.location}, working with clients everywhere.`,
};

const channels = [
  { icon: "mail" as const, label: "Email", value: site.email, href: `mailto:${site.email}` },
  { icon: "phone" as const, label: "Phone", value: site.phone, href: `tel:${site.phone.replace(/\s/g, "")}` },
  { icon: "pin" as const, label: "Office", value: site.location, href: null },
  { icon: "clipboard" as const, label: "Hours", value: "Monday to Friday, 08:00 to 18:00 (CAT)", href: null },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="We'd love to hear from you."
        lead="Whether you have a detailed brief or a rough idea, we will tell you honestly what it takes to build it."
      />

      <Section tone="muted">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
          <div className="flex flex-col gap-8">
            <div>
              <h2 className="text-[1.5rem] font-semibold text-fg">Get in touch</h2>
              <p className="mt-2 text-[0.975rem] leading-relaxed text-fg-muted">
                Every message is read by a person on our team, and we reply within one business day.
              </p>
            </div>

            <ul className="divide-y divide-border rounded-[var(--radius-l)] border border-border bg-white">
              {channels.map((channel) => (
                <li key={channel.label} className="flex items-start gap-4 p-5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-m)] bg-brand-subtle text-brand">
                    <Icon name={channel.icon} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[0.825rem] font-medium text-fg-subtle">{channel.label}</p>
                    {channel.href ? (
                      <a href={channel.href} className="mt-0.5 block font-medium break-words text-fg hover:text-brand">
                        {channel.value}
                      </a>
                    ) : (
                      <p className="mt-0.5 font-medium text-fg">{channel.value}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className="rounded-[var(--radius-l)] border border-border bg-white p-6">
              <h3 className="text-[1.05rem] font-semibold text-fg">Planning a full project?</h3>
              <p className="mt-2 text-[0.925rem] leading-relaxed text-fg-muted">
                Our guided brief takes about five minutes and gives us everything we need to reply with a first
                estimate.
              </p>
              <ButtonLink href="/start" variant="secondary" icon="arrow" className="mt-5">
                Start a project brief
              </ButtonLink>
            </div>
          </div>

          <ContactForm />
        </div>
      </Section>
    </>
  );
}
