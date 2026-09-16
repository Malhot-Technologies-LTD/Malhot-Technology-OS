"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

export default function RootError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    logger.error("app.render_error", { digest: error.digest, message: error.message });
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      {error.digest ? <p className="font-mono text-sm text-fg-subtle">ref {error.digest}</p> : null}
      <Button type="button" onClick={retry}>
        Try again
      </Button>
    </main>
  );
}
