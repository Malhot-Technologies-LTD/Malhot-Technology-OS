import Link from "next/link";

import { EmptyState } from "@/components/os/empty-state";
import { PageBody } from "@/components/os/page-header";
import { Button } from "@/components/ui/button";

export default function OsNotFound() {
  return (
    <PageBody>
      <EmptyState
        title="That page does not exist"
        description="It may have been moved or you may not have access to it."
        action={
          <Button asChild variant="outline">
            <Link href="/os">Back to home</Link>
          </Button>
        }
      />
    </PageBody>
  );
}
