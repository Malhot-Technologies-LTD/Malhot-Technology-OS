"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { PROJECT_TABS, projectHref } from "@/features/projects/tabs";
import { cn } from "@/lib/utils";

/**
 * The project's tab bar. Scrolls sideways rather than wrapping: a second row of
 * tabs reads as a second level of navigation.
 *
 * Thirteen tabs do not fit most screens, and scrolling only helps someone who
 * knows there is more. Without an edge, the last tab is simply cut in half and
 * reads as a rendering fault — so each edge fades exactly when there is
 * something past it, and stops when there is not.
 */
export function ProjectTabs({ projectKey }: { projectKey: string }) {
  // The first segment under [key]: null on the overview, "milestones" on a milestone's page.
  const segment = useSelectedLayoutSegment() ?? "";
  const scroller = useRef<HTMLDivElement>(null);
  const active = useRef<HTMLAnchorElement>(null);
  const [overflow, setOverflow] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const element = scroller.current;
    if (!element) return;
    const max = element.scrollWidth - element.clientWidth;
    // A pixel of slack: fractional layout widths otherwise leave the end fade
    // showing on a bar that is already scrolled as far as it goes.
    setOverflow({ start: element.scrollLeft > 1, end: element.scrollLeft < max - 1 });
  }, []);

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [measure]);

  /*
   * Bring the current tab into view on arrival. Landing on Activity — the last
   * of thirteen — and finding the bar showing Overview leaves no sign of where
   * you are.
   */
  useEffect(() => {
    active.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [segment]);

  return (
    <div className="relative">
      <div
        ref={scroller}
        onScroll={measure}
        className="-mb-px [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden"
      >
        <nav aria-label="Project pages">
          <ul className="flex min-w-max items-center gap-0.5">
            {PROJECT_TABS.map((tab) => {
              const current = tab.slug === segment;
              const Icon = tab.icon;
              return (
                <li key={tab.slug || "overview"}>
                  <Link
                    ref={current ? active : undefined}
                    href={projectHref(projectKey, tab.slug)}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "flex h-11 items-center gap-2 border-b-2 px-2.5 text-sm whitespace-nowrap transition-colors duration-[120ms]",
                      current
                        ? "border-brand font-medium text-fg"
                        : "border-transparent text-fg-muted hover:border-border-strong hover:text-fg",
                    )}
                  >
                    {/* Icons only where there is room for all thirteen tabs beside them. */}
                    <Icon
                      className={cn("hidden size-4 2xl:block", current ? "text-brand" : "text-fg-subtle")}
                      aria-hidden="true"
                    />
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Decorative and never in the way of a click. */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-surface to-transparent transition-opacity duration-[160ms]",
          overflow.start ? "opacity-100" : "opacity-0",
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-surface to-transparent transition-opacity duration-[160ms]",
          overflow.end ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
