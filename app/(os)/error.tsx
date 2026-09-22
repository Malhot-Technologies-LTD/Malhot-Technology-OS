"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/os/error-state";
import { PageBody } from "@/components/os/page-header";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

/** Route-level boundary for the OS. Distinguishes "we cannot reach the data" from a code fault. */
export default function OsError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    logger.error("os.render_error", { digest: error.digest, message: error.message });
  }, [error]);

  const unreachable = /timed out|fetch failed|network|ECONNRESET|522/i.test(error.message);

  return (
    <PageBody>
      <ErrorState
        title={unreachable ? "The database is not responding" : "This page could not be loaded"}
        description={
          unreachable
            ? "Your data is safe — the connection to Supabase timed out. Try again in a moment; if it persists, check the project's status in the Supabase dashboard."
            : "Something went wrong while building this page. Trying again usually clears it."
        }
        reference={error.digest}
        action={
          <Button type="button" onClick={retry}>
            Try again
          </Button>
        }
      />
    </PageBody>
  );
}
