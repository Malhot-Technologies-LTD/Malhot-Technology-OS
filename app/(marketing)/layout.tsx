import { Analytics } from "@vercel/analytics/next";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

/**
 * Public website: dark-dominant register with light sections
 * (docs/design/design-system.md#theming-implementation). The wrapper pins the
 * dark tokens regardless of the visitor's OS theme; no toggle is exposed.
 * Analytics is cookie-less and mounted only here, never under /os (ADR-014).
 */
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div data-theme="dark" className="flex min-h-dvh flex-col bg-bg text-base text-fg antialiased md:text-lg">
      <a
        href="#site-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="site-main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <Analytics />
    </div>
  );
}
