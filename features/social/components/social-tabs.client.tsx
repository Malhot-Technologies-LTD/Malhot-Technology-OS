"use client";

import { CalendarDays, LayoutDashboard, ListChecks, UsersRound } from "lucide-react";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { slug: "", label: "Overview", icon: LayoutDashboard },
  { slug: "calendar", label: "Calendar", icon: CalendarDays },
  { slug: "posts", label: "Posts", icon: ListChecks },
  { slug: "accounts", label: "Accounts", icon: UsersRound },
] as const;

/** The Social section's pages. Four fit every screen, so there is no scrolling to manage. */
export function SocialTabs() {
  const segment = useSelectedLayoutSegment() ?? "";
  return (
    <nav aria-label="Social media pages" className="-mb-px overflow-x-auto border-b border-border">
      <ul className="flex min-w-max items-center gap-0.5">
        {TABS.map((tab) => {
          const current = tab.slug === segment;
          const Icon = tab.icon;
          return (
            <li key={tab.label}>
              <Link
                href={tab.slug ? `/os/social/${tab.slug}` : "/os/social"}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-2 border-b-2 px-2.5 text-sm whitespace-nowrap transition-colors duration-[120ms]",
                  current
                    ? "border-brand font-medium text-fg"
                    : "border-transparent text-fg-muted hover:border-border-strong hover:text-fg",
                )}
              >
                <Icon className={cn("size-4", current ? "text-brand" : "text-fg-subtle")} aria-hidden="true" />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
