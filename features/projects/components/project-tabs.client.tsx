"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import { PROJECT_TABS, projectHref } from "@/features/projects/tabs";
import { cn } from "@/lib/utils";

/**
 * The project's tab bar. Scrolls sideways on narrow screens rather than
 * wrapping: a second row of tabs reads as a second level of navigation.
 */
export function ProjectTabs({ projectKey }: { projectKey: string }) {
  // The first segment under [key]: null on the overview, "milestones" on a milestone's page.
  const segment = useSelectedLayoutSegment() ?? "";

  return (
    <nav aria-label="Project pages" className="-mb-px [scrollbar-width:none] overflow-x-auto">
      <ul className="flex min-w-max items-center gap-0.5">
        {PROJECT_TABS.map((tab) => {
          const active = tab.slug === segment;
          const Icon = tab.icon;
          return (
            <li key={tab.slug || "overview"}>
              <Link
                href={projectHref(projectKey, tab.slug)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-2 border-b-2 px-2.5 text-sm whitespace-nowrap transition-colors duration-[120ms]",
                  active
                    ? "border-brand font-medium text-fg"
                    : "border-transparent text-fg-muted hover:border-border-strong hover:text-fg",
                )}
              >
                {/* Icons only where there is room for all thirteen tabs beside them. */}
                <Icon
                  className={cn("hidden size-4 2xl:block", active ? "text-brand" : "text-fg-subtle")}
                  aria-hidden="true"
                />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
