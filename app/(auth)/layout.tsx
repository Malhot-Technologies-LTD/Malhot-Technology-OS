import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Centred card for login, password and invitation flows. Content is a server component per page; forms are client islands. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-bg-subtle">
      <a
        href="#auth-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <header className="flex h-14 items-center px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Malhot Technologies
        </Link>
      </header>
      <main id="auth-main" className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-s sm:p-8">{children}</div>
      </main>
    </div>
  );
}
