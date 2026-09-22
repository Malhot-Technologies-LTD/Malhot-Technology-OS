import { Skeleton } from "@/components/ui/skeleton";

import { PageBody } from "./page-header";

/**
 * Loading skeletons for the OS routes.
 *
 * These exist because the OS reads from a hosted database on every page: when
 * that is slow — or unreachable, as during an outage — a page with no `loading`
 * boundary renders nothing at all until the request settles. A skeleton that
 * mirrors the real layout tells the person the page is working and stops the
 * content jumping when it arrives.
 */

function HeaderSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      {withAction ? <Skeleton className="h-9 w-28" /> : null}
    </div>
  );
}

/** Table with the same 40px rows the real table uses, so nothing shifts. */
export function TableSkeleton({ rows = 5, columns = 7 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="flex h-10 items-center gap-4 border-b border-border bg-bg-subtle px-4">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex h-10 items-center gap-4 border-b border-border px-4 last:border-b-0">
          {Array.from({ length: columns }, (_, col) => (
            <Skeleton key={col} className="h-3 flex-1" style={{ opacity: 1 - row * 0.12 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
      <Skeleton className="h-4 w-32" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className="h-3" style={{ width: `${90 - i * 15}%` }} />
        ))}
      </div>
    </div>
  );
}

export function ProjectListSkeleton() {
  return (
    <PageBody>
      <HeaderSkeleton withAction />
      <TableSkeleton />
    </PageBody>
  );
}

export function ProjectOverviewSkeleton() {
  return (
    <PageBody>
      <HeaderSkeleton withAction />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-12" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <CardSkeleton lines={5} />
          <CardSkeleton lines={2} />
          <CardSkeleton lines={2} />
        </div>
        <div className="flex flex-col gap-6">
          <CardSkeleton lines={3} />
          <CardSkeleton lines={2} />
        </div>
      </div>
    </PageBody>
  );
}

export function PageSkeleton() {
  return (
    <PageBody>
      <HeaderSkeleton />
      <CardSkeleton lines={4} />
    </PageBody>
  );
}
