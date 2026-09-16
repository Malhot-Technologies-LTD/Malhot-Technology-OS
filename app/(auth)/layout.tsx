import type { Metadata } from "next";
import Link from "next/link";

import { site } from "@/content/site";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Login, password and invitation flows. Styled as part of the website (dark
 * register, same wordmark) so the OS entry does not feel like a different product.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div data-theme="dark" className="flex min-h-dvh flex-col bg-bg text-fg antialiased">
      <a
        href="#auth-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <header className="flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="text-base font-semibold tracking-tight">
          {site.name}
        </Link>
        <Link href="/" className="text-sm text-fg-muted hover:text-fg">
          Back to website
        </Link>
      </header>
      <main id="auth-main" className="relative flex flex-1 items-center justify-center px-4 py-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(50% 40% at 50% 0%, color-mix(in oklch, var(--brand) 18%, transparent) 0%, transparent 70%)",
          }}
        />
        <div className="relative w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-m sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
