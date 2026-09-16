"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { primaryNav, site } from "@/content/site";

/** The only client island in the site header: the mobile menu. */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" data-theme="dark" className="w-80 bg-bg text-fg">
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
              className="rounded-md px-3 py-3 text-lg font-medium transition-colors duration-[120ms] hover:bg-surface"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 p-4">
          <Button asChild size="lg" onClick={() => setOpen(false)}>
            <Link href="/contact">Start a project</Link>
          </Button>
          <Button asChild variant="outline" size="lg" onClick={() => setOpen(false)}>
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
