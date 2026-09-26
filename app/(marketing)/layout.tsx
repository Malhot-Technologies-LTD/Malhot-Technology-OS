import { Analytics } from "@vercel/analytics/next";

import { Footer } from "@/components/site/layout/Footer";
import { Navbar } from "@/components/site/layout/Navbar";
import { inter, sora } from "@/lib/fonts/site";

/**
 * The public website.
 *
 * A light, corporate surface in its own two typefaces, kept apart from the OS
 * by `data-surface="site"`: the scope every rule in styles/site.css and the
 * site tokens in styles/tokens.css hang off. `data-theme="light"` is pinned
 * rather than inherited: the OS has a theme toggle, the website does not.
 *
 * No preloader, page transitions or scroll hijacking. Pages render as plain
 * documents and the browser scrolls them.
 *
 * Nothing here reads the request, so every page underneath is prerendered. The
 * navbar asks `/api/site/session` after hydration for the one fact it needs;
 * see the note in that route before moving identity up to this level.
 *
 * Analytics is cookie-less and mounted only here, never under /os (ADR-014).
 */
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div
      data-theme="light"
      data-surface="site"
      className={`${sora.variable} ${inter.variable} flex min-h-dvh flex-col bg-bg font-site text-fg antialiased`}
    >
      {/* First in the tab order, so the first Tab on any page offers the way past the navigation. */}
      <a
        href="#site-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[60] focus:rounded-[var(--radius-m)] focus:bg-white focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-fg focus:shadow-[var(--shadow-m)]"
      >
        Skip to content
      </a>

      <Navbar />
      <main id="site-main" className="flex-1">
        {children}
      </main>
      <Footer />

      <Analytics />
    </div>
  );
}
