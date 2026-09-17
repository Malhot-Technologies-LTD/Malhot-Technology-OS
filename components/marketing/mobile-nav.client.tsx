"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { SiteButton } from "@/components/marketing/site-button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { primaryNav, site } from "@/content/site";

/** The only client island in the site header: the mobile menu. */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <SiteButton variant="secondary" size="sm" className="size-10 px-0 md:hidden" aria-label="Open menu">
          <Menu aria-hidden="true" />
        </SiteButton>
      </SheetTrigger>
      <SheetContent side="right" data-theme="light" data-surface="site" className="w-80 bg-white text-fg">
        <SheetHeader>
          <SheetTitle>{site.name}</SheetTitle>
          <SheetDescription className="sr-only">Site navigation</SheetDescription>
        </SheetHeader>
        <nav aria-label="Primary" className="flex flex-col gap-1 px-4">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 text-lg font-semibold transition-colors duration-[120ms] hover:bg-bg-subtle"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 p-4">
          <SiteButton asChild size="lg" onClick={() => setOpen(false)}>
            <Link href="/contact">Start a project</Link>
          </SiteButton>
          <SiteButton asChild variant="secondary" size="lg" onClick={() => setOpen(false)}>
            <Link href="/login">Team login</Link>
          </SiteButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}
