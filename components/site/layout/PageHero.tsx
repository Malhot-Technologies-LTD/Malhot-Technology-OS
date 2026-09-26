import Link from "next/link";
import type { ReactNode } from "react";

import { Icon } from "@/components/site/brand/Icon";
import { Eyebrow } from "@/components/site/ui/Section";

/**
 * The header band for every page except home: navy, left-aligned, a
 * breadcrumb, the page's one h1 and a lead paragraph. Plain on purpose — the
 * page's content does the work, this only tells you where you are.
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  breadcrumb,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  breadcrumb?: { label: string; href: string };
  children?: ReactNode;
}) {
  return (
    <section className="on-ink bg-site-ink text-white">
      <div className="shell py-14 sm:py-16 lg:py-20">
        {breadcrumb ? (
          <Link
            href={breadcrumb.href}
            className="mb-6 inline-flex items-center gap-1.5 text-[0.875rem] text-site-ink-fg-muted transition-colors hover:text-white"
          >
            <Icon name="arrowLeft" className="h-4 w-4" />
            {breadcrumb.label}
          </Link>
        ) : null}
        <div className="max-w-3xl">
          {eyebrow ? <Eyebrow onInk>{eyebrow}</Eyebrow> : null}
          <h1 className="mt-3 text-[clamp(2rem,4.4vw,3.1rem)] leading-[1.1] font-semibold">{title}</h1>
          {lead ? <p className="mt-5 text-[1.1rem] leading-relaxed text-site-ink-fg-muted">{lead}</p> : null}
          {children ? <div className="mt-8">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
