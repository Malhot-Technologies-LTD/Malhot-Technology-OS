import { Analytics } from "@vercel/analytics/next";

import { Footer } from "@/components/site/layout/Footer";
import { Navbar } from "@/components/site/layout/Navbar";
import { Preloader } from "@/components/site/providers/Preloader";
import { SmoothScroll } from "@/components/site/providers/SmoothScroll";
import { ScrollProgress } from "@/components/site/ui/Atmosphere";
import { inter, sora } from "@/lib/fonts/site";

/**
 * The public website.
 *
 * A deep-navy, cinematic surface in its own two typefaces, kept apart from the
 * OS by `data-surface="site"` — the scope every rule in styles/site.css hangs
 * off. `data-theme="dark"` is pinned rather than inherited: the OS has a theme
 * toggle, the website does not, and a visitor who happens to have set the OS to
 * light must not get a half-lit marketing site.
 *
 * Nothing here reads the request, so every page underneath is prerendered. The
 * navbar asks `/api/site/session` after hydration for the one fact it needs —
 * see the note in that route before moving identity up to this level.
 *
 * Analytics is cookie-less and mounted only here, never under /os (ADR-014).
 */
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div
      data-theme="dark"
      data-surface="site"
      className={`${sora.variable} ${inter.variable} relative flex min-h-dvh flex-col bg-site-ink-deep font-site text-white antialiased`}
    >
      {/*
       * First in the DOM and first in the tab order, before the fixed header,
       * so the very first Tab on any page offers the way past the navigation.
       */}
      <a
        href="#site-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[120] focus:rounded-full focus:bg-white focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-navy-900"
      >
        Skip to content
      </a>

      <Preloader />
      <ScrollProgress />

      <SmoothScroll>
        <Navbar />
        <main id="site-main" className="flex-1">
          {children}
        </main>
        <Footer />
      </SmoothScroll>

      <Analytics />
    </div>
  );
}
