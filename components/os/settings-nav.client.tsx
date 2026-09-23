"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const SECTIONS = [
  { label: "Profile", href: "/os/settings/profile", adminOnly: false },
  { label: "Password", href: "/os/settings/password", adminOnly: false },
  { label: "Appearance", href: "/os/settings/appearance", adminOnly: false },
  { label: "Members", href: "/os/settings/members", adminOnly: true },
  { label: "Enquiries", href: "/os/settings/inquiries", adminOnly: true },
] as const;

export function SettingsNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings sections" className="flex gap-1 md:w-56 md:flex-col">
      {SECTIONS.filter((section) => isAdmin || !section.adminOnly).map((section) => {
        const active = pathname === section.href;
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-2.5 text-[15px] text-fg-muted transition-colors duration-[120ms] hover:bg-bg-subtle hover:text-fg",
              active && "bg-brand-subtle font-medium text-brand",
            )}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
