import Link from "next/link";

import { Container } from "@/components/marketing/section";
import { Logo } from "@/components/marketing/site-header";
import { services } from "@/content/services";
import { footerNav, site } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="bg-site-ink text-white">
      <Container className="grid gap-10 py-14 md:py-16 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col gap-4 lg:col-span-4">
          <Logo tone="ink" />
          <p className="max-w-sm text-[15px] leading-relaxed text-site-ink-fg-muted">{site.description}</p>
          <div className="flex flex-col gap-1 text-[15px]">
            <a href={`mailto:${site.contactEmail.value}`} className="text-white underline-offset-4 hover:underline">
              {site.contactEmail.value}
            </a>
            <span className="text-site-ink-fg-subtle">{site.location}</span>
          </div>
        </div>

        <FooterColumn title="Services" className="lg:col-span-3">
          {services.slice(0, 4).map((service) => (
            <FooterLink key={service.slug} href={`/services#${service.slug}`}>
              {service.name}
            </FooterLink>
          ))}
          <FooterLink href="/services">All services</FooterLink>
        </FooterColumn>

        <FooterColumn title="Company" className="lg:col-span-3">
          {footerNav.company.map((link) => (
            <FooterLink key={link.href} href={link.href}>
              {link.label}
            </FooterLink>
          ))}
          <FooterLink href="/work">Work</FooterLink>
        </FooterColumn>

        <FooterColumn title="Team" className="lg:col-span-2">
          <FooterLink href="/login">Team login</FooterLink>
          {footerNav.legal.map((link) => (
            <FooterLink key={link.href} href={link.href}>
              {link.label}
            </FooterLink>
          ))}
        </FooterColumn>
      </Container>

      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-2 py-6 text-sm text-site-ink-fg-subtle md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
          <p>{site.tagline}</p>
        </Container>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <nav aria-label={title} className={`flex flex-col gap-3 ${className ?? ""}`}>
      <p className="text-[12px] font-semibold tracking-[0.14em] text-white/50 uppercase">{title}</p>
      {children}
    </nav>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="w-fit text-[15px] text-site-ink-fg-muted transition-colors hover:text-white">
      {children}
    </Link>
  );
}
