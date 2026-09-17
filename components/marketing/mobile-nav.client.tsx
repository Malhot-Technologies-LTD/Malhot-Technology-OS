"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Mark } from "@/components/marketing/mark";
import { SiteButton } from "@/components/marketing/site-button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { primaryNav, site } from "@/content/site";

/** The only client island in the site header: the mobile menu, on the ink surface. */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <SiteButton variant="outline" size="sm" className="size-10 px-0 lg:hidden" aria-label="Open menu">
          <Menu aria-hidden="true" />
        </SiteButton>
      </SheetTrigger>
      <SheetContent
        side="right"
        data-theme="light"
        data-surface="site"
        className="w-[min(20rem,86vw)] bg-white font-site text-fg"
      >
        <SheetHeader className="border-b border-border">
          <SheetTitle className="flex items-center gap-2.5 text-fg">
            <Mark className="h-5 w-[24px] text-site-ink" />
            {site.shortName}
          </SheetTitle>
          <SheetDescription className="sr-only">Site navigation</SheetDescription>
        </SheetHeader>
        <nav aria-label="Primary" className="flex flex-col px-4">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="border-b border-border py-3.5 text-[17px] font-semibold text-fg transition-colors hover:text-brand"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2.5 p-4">
          <SiteButton asChild size="lg" onClick={() => setOpen(false)}>
            <Link href="/contact">Start a project</Link>
          </SiteButton>
          <SiteButton asChild variant="outline" size="lg" onClick={() => setOpen(false)}>
            <Link href="/login">Team login</Link>
          </SiteButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}
