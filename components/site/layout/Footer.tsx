import Link from "next/link";

import { Icon } from "@/components/site/brand/Icon";
import { Logo } from "@/components/site/brand/Logo";
import { navLinks, services, site } from "@/content/site";

/**
 * Site footer: brand and address, then three link columns, then a legal bar.
 *
 * Social links are not rendered: every entry in `site.socials` still points at
 * a platform's home page rather than a Malhot account (content/README.md), and
 * an icon that opens x.com is worse than no icon. Add them back here once the
 * real profile URLs exist.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="on-ink bg-site-ink text-white">
      <div className="shell grid gap-12 py-14 sm:py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.2fr_1.2fr]">
        <div className="max-w-xs">
          <Link href="/" aria-label={`${site.name} home`} className="inline-block">
            <Logo />
          </Link>
          <p className="mt-5 text-[0.9rem] leading-relaxed text-site-ink-fg-muted">
            Software company in {site.location}. We design, build and ship websites, applications and the systems behind
            them.
          </p>
        </div>

        <FooterColumn title="Company">
          {navLinks.map((link) => (
            <li key={link.href}>
              <FooterLink href={link.href}>{link.label}</FooterLink>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title="Services">
          {services.map((service) => (
            <li key={service.slug}>
              <FooterLink href={`/services#${service.slug}`}>{service.title}</FooterLink>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title="Contact">
          <li className="flex gap-2.5">
            <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0 text-site-blue-bright" />
            <span className="text-site-ink-fg-muted">{site.location}</span>
          </li>
          <li className="flex gap-2.5">
            <Icon name="mail" className="mt-0.5 h-4 w-4 shrink-0 text-site-blue-bright" />
            <FooterLink href={`mailto:${site.email}`}>{site.email}</FooterLink>
          </li>
          <li className="flex gap-2.5">
            <Icon name="phone" className="mt-0.5 h-4 w-4 shrink-0 text-site-blue-bright" />
            <FooterLink href={`tel:${site.phone.replace(/\s/g, "")}`}>{site.phone}</FooterLink>
          </li>
        </FooterColumn>
      </div>

      <div className="border-t border-site-ink-line">
        <div className="shell flex flex-col gap-3 py-6 text-[0.825rem] text-site-ink-fg-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {site.legalName}. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <FooterLink href="/privacy">Privacy</FooterLink>
            {/* The only sign-in entry on the site: the login is for the team, so it stays out of the header. */}
            <Link
              href="/login"
              className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-m)] border border-white/40 px-3.5 text-[0.85rem] font-semibold text-white transition-colors hover:border-white hover:bg-white/10"
            >
              <Icon name="user" className="h-4 w-4" />
              Team sign in
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[0.8rem] font-semibold tracking-[0.12em] text-white uppercase">{title}</h2>
      <ul className="mt-5 space-y-3 text-[0.9rem]">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-site-ink-fg-muted transition-colors hover:text-white hover:underline">
      {children}
    </Link>
  );
}
