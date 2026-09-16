import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Temporary landing page. The public website is Phase 2
 * (docs/product/public-website.md); this exists so `/` resolves and sign-out has a home.
 */
export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-[0.04em] text-fg-subtle uppercase">Malhot Technologies</p>
        <h1 className="text-3xl font-semibold tracking-tight">We design, build and ship software systems.</h1>
        <p className="text-fg-muted">Website coming soon.</p>
      </div>
      <Button asChild variant="outline">
        <Link href="/login">Team sign in</Link>
      </Button>
    </main>
  );
}
