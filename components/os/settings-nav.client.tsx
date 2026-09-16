"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const SECTIONS = [
  { label: "Profile", href: "/os/settings/profile" },
  { label: "Appearance", href: "/os/settings/appearance" },
] as const;

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings sections" className="flex gap-1 md:w-48 md:flex-col">
      {SECTIONS.map((section) => {
        const active = pathname === section.href;
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-sm text-fg-muted transition-colors duration-[120ms] hover:bg-bg-subtle hover:text-fg",
              active && "bg-bg-subtle font-medium text-fg",
            )}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
