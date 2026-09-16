import Link from "next/link";

import { MobileNav } from "@/components/marketing/mobile-nav.client";
import { Container } from "@/components/marketing/section";
import { Button } from "@/components/ui/button";
import { primaryNav, site } from "@/content/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link href="/" className="text-base font-semibold tracking-tight" aria-label={`${site.name} home`}>
          {site.name}
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-fg-muted transition-colors duration-[120ms] hover:bg-surface hover:text-fg"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link href="/contact">Start a project</Link>
          </Button>
          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
