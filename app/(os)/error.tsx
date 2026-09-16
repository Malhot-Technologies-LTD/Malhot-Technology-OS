"use client";

import { useEffect } from "react";

import { EmptyState } from "@/components/os/empty-state";
import { PageBody } from "@/components/os/page-header";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

export default function OsError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    logger.error("os.render_error", { digest: error.digest, message: error.message });
  }, [error]);

  return (
    <PageBody>
      <EmptyState
        title="Something went wrong loading this page"
        description={error.digest ? `Try again. If it keeps happening, quote reference ${error.digest}.` : "Try again."}
        action={
          <Button type="button" onClick={retry}>
            Try again
          </Button>
        }
      />
    </PageBody>
  );
}
