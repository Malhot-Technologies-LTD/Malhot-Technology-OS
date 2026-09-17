import { ArrowRight, Mail, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { MobileNav } from "@/components/marketing/mobile-nav.client";
import { Container } from "@/components/marketing/section";
import { SiteButton } from "@/components/marketing/site-button";
import { primaryNav, site } from "@/content/site";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={className} aria-label={`${site.name} home`}>
      <span className="flex items-center gap-2.5">
        <Image src="/logo.png" alt="" width={36} height={36} priority className="size-9 rounded-md" />
        <span className="text-lg font-bold tracking-tight text-fg">{site.name}</span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <>
      <div className="hidden bg-site-navy text-xs text-white/80 md:block">
        <Container className="flex h-9 items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden="true" className="size-3.5" /> {site.location}
            </span>
            <a href={`mailto:${site.contactEmail.value}`} className="inline-flex items-center gap-1.5 hover:text-white">
              <Mail aria-hidden="true" className="size-3.5" /> {site.contactEmail.value}
            </a>
          </div>
          <Link href="/login" className="hover:text-white">
            Team login
          </Link>
        </Container>
      </div>

      <header className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <Container className="flex h-[72px] items-center justify-between gap-6">
          <Logo />

          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {primaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3.5 py-2 text-sm font-medium text-fg-muted transition-colors duration-[120ms] hover:bg-bg-subtle hover:text-fg"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <SiteButton asChild className="hidden md:inline-flex">
              <Link href="/contact">
                Start a project <ArrowRight aria-hidden="true" />
              </Link>
            </SiteButton>
            <MobileNav />
          </div>
        </Container>
      </header>
    </>
  );
}
