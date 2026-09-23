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
 *
 * Each skeleton copies the real thing's measurements, not just its shape: the
 * header is 40px because the heading is, tiles are 148px because tiles are.
 * A skeleton that is roughly right is worse than none — the page still jumps,
 * it just jumps after a pause.
 */

function HeaderSkeleton({ withAside = false }: { withAside?: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-10 w-80" />
      </div>
      {withAside ? <Skeleton className="h-[104px] w-64 rounded-lg" /> : null}
    </div>
  );
}

/** Table with the same 48px rows the real table uses, so nothing shifts. */
export function TableSkeleton({ rows = 5, columns = 7 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex h-12 items-center gap-4 border-b border-border bg-bg-subtle px-5">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex h-12 items-center gap-4 border-b border-border px-5 last:border-b-0">
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
    <div className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-6 sm:p-7">
      <Skeleton className="h-5 w-40" />
      <div className="flex flex-col gap-2.5">
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
      <HeaderSkeleton />
      <TableSkeleton />
    </PageBody>
  );
}

export function ProjectOverviewSkeleton() {
  return (
    <PageBody>
      <HeaderSkeleton />
      <div className="flex gap-2">
        <Skeleton className="h-7 w-16 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
      <div className="grid gap-7 lg:grid-cols-3">
        <div className="flex flex-col gap-7 lg:col-span-2">
          <CardSkeleton lines={5} />
          <CardSkeleton lines={2} />
          <CardSkeleton lines={2} />
        </div>
        <div className="flex flex-col gap-7">
          <CardSkeleton lines={3} />
          <CardSkeleton lines={2} />
        </div>
      </div>
    </PageBody>
  );
}

/** Home: focus panel, tile row, then the two columns. */
export function DashboardSkeleton() {
  return (
    <PageBody>
      <HeaderSkeleton withAside />
      <Skeleton className="h-[212px] rounded-lg" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[148px] rounded-lg" />
        ))}
      </div>
      <div className="grid gap-7 lg:grid-cols-3">
        <div className="flex flex-col gap-7 lg:col-span-2">
          <CardSkeleton lines={5} />
        </div>
        <div className="flex flex-col gap-7">
          <CardSkeleton lines={3} />
          <CardSkeleton lines={3} />
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
