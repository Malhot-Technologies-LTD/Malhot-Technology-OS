import Link from "next/link";

import { Mark } from "@/components/marketing/mark";
import { MobileNav } from "@/components/marketing/mobile-nav.client";
import { Container } from "@/components/marketing/section";
import { SiteButton } from "@/components/marketing/site-button";
import { primaryNav, site } from "@/content/site";
import { cn } from "@/lib/utils";

/** White, sticky, one hairline rule. The plain business-site header. */

export function Logo({ className, tone = "light" }: { className?: string; tone?: "light" | "ink" }) {
  return (
    <Link
      href="/"
      aria-label={`${site.name} home`}
      className={cn(
        "inline-flex items-center gap-2.5 rounded-[3px] outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
        className,
      )}
    >
      <Mark className={cn("h-[22px] w-[27px]", tone === "ink" ? "text-white" : "text-site-ink")} />
      <span className={cn("text-[17px] font-bold tracking-[-0.02em]", tone === "ink" ? "text-white" : "text-fg")}>
        {site.shortName}
      </span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur">
      <Container className="flex h-[68px] items-center justify-between gap-6">
        <Logo />

        <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[15px] font-medium text-fg-muted transition-colors duration-150 hover:text-fg"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="hidden text-[15px] font-medium text-fg-muted transition-colors hover:text-fg lg:inline"
          >
            Team login
          </Link>
          <SiteButton asChild className="hidden sm:inline-flex">
            <Link href="/contact">Start a project</Link>
          </SiteButton>
          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
