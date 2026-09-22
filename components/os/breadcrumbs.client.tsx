"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PLANNED_SECTIONS, PRIMARY_NAV } from "@/components/os/nav";

/**
 * Where-am-I trail in the topbar.
 *
 * Derived from the path rather than passed down, so no page has to remember to
 * set it and none can go stale. Labels come from the navigation definitions, so
 * the trail and the sidebar always agree; a project key stays upper-case
 * because that is how people say it out loud.
 */

const SECTION_LABELS: Record<string, string> = {
  ...Object.fromEntries(PRIMARY_NAV.map((item) => [item.href.replace("/os/", ""), item.label])),
  ...Object.fromEntries(Object.entries(PLANNED_SECTIONS).map(([slug, meta]) => [slug, meta.label])),
  settings: "Settings",
  profile: "Profile",
  password: "Password",
  appearance: "Appearance",
  inquiries: "Enquiries",
  new: "New",
  dev: "Developer",
  tokens: "Tokens",
};

function labelFor(segment: string): string {
  if (SECTION_LABELS[segment]) return SECTION_LABELS[segment];
  // Project keys are 2-6 upper-case letters; anything else gets title-cased.
  if (/^[A-Za-z]{2,6}$/.test(segment) && segment === segment.toUpperCase()) return segment;
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean).slice(1); // drop "os"

  if (segments.length === 0) {
    return <span className="text-sm font-medium">Home</span>;
  }

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        <li className="shrink-0">
          <Link href="/os" className="text-fg-muted hover:text-fg hover:underline">
            Home
          </Link>
        </li>
        {segments.map((segment, index) => {
          const href = `/os/${segments.slice(0, index + 1).join("/")}`;
          const last = index === segments.length - 1;
          return (
            <li key={href} className="flex min-w-0 items-center gap-1.5">
              <span aria-hidden="true" className="text-fg-subtle">
                /
              </span>
              {last ? (
                <span aria-current="page" className="truncate font-medium">
                  {labelFor(segment)}
                </span>
              ) : (
                <Link href={href} className="truncate text-fg-muted hover:text-fg hover:underline">
                  {labelFor(segment)}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
