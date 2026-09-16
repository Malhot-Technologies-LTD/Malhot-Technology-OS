import Link from "next/link";

import { Container } from "@/components/marketing/section";
import { footerNav, site } from "@/content/site";

const COLUMNS = [
  { title: "Company", links: footerNav.company },
  { title: "Work", links: footerNav.work },
  { title: "Legal", links: footerNav.legal },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-bg">
      <Container className="grid gap-10 py-14 md:grid-cols-[1.5fr_repeat(3,1fr)] md:py-20">
        <div className="flex flex-col gap-3">
          <p className="text-base font-semibold tracking-tight">{site.name}</p>
          <p className="max-w-xs text-sm text-fg-muted">{site.tagline}</p>
          <a
            href={`mailto:${site.contactEmail.value}`}
            className="text-sm text-fg underline-offset-4 hover:underline"
            data-placeholder={site.contactEmail.placeholder || undefined}
          >
            {site.contactEmail.value}
          </a>
          <p className="text-sm text-fg-subtle">{site.location}</p>
        </div>
        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title} className="flex flex-col gap-3">
            <p className="text-xs font-medium tracking-[0.08em] text-fg-subtle uppercase">{column.title}</p>
            {column.links.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-fg-muted hover:text-fg">
                {link.label}
              </Link>
            ))}
          </nav>
        ))}
      </Container>
      <Container className="flex flex-col gap-2 border-t border-border py-6 text-xs text-fg-subtle md:flex-row md:items-center md:justify-between">
        <p>
          © {new Date().getFullYear()} {site.name}. All rights reserved.
        </p>
        <Link href="/login" className="hover:text-fg">
          Team login
        </Link>
      </Container>
    </footer>
  );
}
