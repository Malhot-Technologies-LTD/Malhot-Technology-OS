import { Analytics } from "@vercel/analytics/next";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { schibsted } from "@/lib/fonts/site";

/**
 * Public website: a light reading surface between dark "ink" bands
 * (data-surface="site" tokens in styles/tokens.css) in its own typeface. Every
 * page opens with an ink hero, so the header is dark on all of them. No theme
 * toggle; the OS is a separate surface. Analytics is cookie-less and mounted
 * only here, never under /os (ADR-014).
 */
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div
      data-theme="light"
      data-surface="site"
      className={`${schibsted.variable} flex min-h-dvh flex-col bg-bg font-site text-base text-fg antialiased selection:bg-brand selection:text-white`}
    >
      <a
        href="#site-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[60] focus:rounded-[3px] focus:bg-white focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-fg focus:shadow-l"
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
