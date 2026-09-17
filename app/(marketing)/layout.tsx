import { Analytics } from "@vercel/analytics/next";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

/**
 * Public website: light, brand-forward register (data-surface="site" in
 * styles/tokens.css). No theme toggle; the OS keeps its own theming.
 * Analytics is cookie-less and mounted only here, never under /os (ADR-014).
 */
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div data-theme="light" data-surface="site" className="flex min-h-dvh flex-col bg-bg text-base text-fg antialiased">
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
