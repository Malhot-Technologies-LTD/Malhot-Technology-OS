import { Mail, MapPin } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/marketing/section";
import { Logo } from "@/components/marketing/site-header";
import { services } from "@/content/services";
import { footerNav, site } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-bg-subtle">
      <Container className="grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1.2fr] md:py-20">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-fg-muted">{site.description}</p>
        </div>

        <nav aria-label="Quick links" className="flex flex-col gap-3">
          <p className="text-sm font-bold text-fg">Quick links</p>
          {[...footerNav.company, ...footerNav.work, ...footerNav.legal].map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-fg-muted hover:text-fg">
              {link.label}
            </Link>
          ))}
        </nav>

        <nav aria-label="Services" className="flex flex-col gap-3">
          <p className="text-sm font-bold text-fg">Our services</p>
          {services.slice(0, 6).map((service) => (
            <Link key={service.slug} href={`/services#${service.slug}`} className="text-sm text-fg-muted hover:text-fg">
              {service.name}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-fg">Contact information</p>
          <p className="inline-flex items-start gap-2 text-sm text-fg-muted">
            <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand" /> {site.location}
          </p>
          <a
            href={`mailto:${site.contactEmail.value}`}
            className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg"
          >
            <Mail aria-hidden="true" className="size-4 shrink-0 text-brand" /> {site.contactEmail.value}
          </a>
          <Link href="/login" className="mt-2 text-sm font-medium text-brand hover:underline">
            Team login →
          </Link>
        </div>
      </Container>
      <div className="border-t border-border">
        <Container className="flex flex-col gap-2 py-5 text-xs text-fg-subtle md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
          <p>{site.location}</p>
        </Container>
      </div>
    </footer>
  );
}
