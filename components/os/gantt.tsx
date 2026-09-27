import Link from "next/link";

import { bar, offset, ticks as makeTicks, type TimeRange } from "@/features/timeline/scale";
import { cn } from "@/lib/utils";

export type GanttTone = "brand" | "success" | "review" | "neutral" | "danger" | "warning";

export type GanttRow =
  | {
      kind: "bar";
      id: string;
      label: string;
      sublabel?: string;
      href?: string;
      from: number;
      to: number;
      tone: GanttTone;
      /** Read aloud and shown on hover: the dates and state in words. */
      description: string;
      /** A bar whose end is an estimate (no deadline yet) is drawn open-ended. */
      openEnded?: boolean;
      /** Fraction filled, 0–1, drawn inside the bar. */
      progress?: number;
      markers?: readonly { at: number; label: string; done: boolean }[];
    }
  | {
      kind: "milestone";
      id: string;
      label: string;
      sublabel?: string;
      href?: string;
      at: number;
      done: boolean;
      description: string;
    };

export type GanttSection = { id: string; label?: string; rows: readonly GanttRow[] };

const BAR_TONE: Record<GanttTone, string> = {
  brand: "bg-brand/85 border-brand",
  success: "bg-status-success-bg border-status-success-border",
  review: "bg-status-review-bg border-status-review-border",
  neutral: "bg-bg-subtle border-border-strong",
  danger: "bg-status-danger-bg border-status-danger-fg",
  warning: "bg-status-warning-bg border-status-warning-border",
};

const DAY_MONTH = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * A Gantt-style chart: a label column on the left, time running right, today
 * as a line. Server-rendered markup with no client state; each bar is a link
 * with its dates in words, so nothing depends on seeing the geometry.
 *
 * Scrolls sideways below ~64rem rather than squashing, because a timeline
 * compressed to a phone's width turns every bar into a dot.
 */
export function Gantt({
  range,
  now,
  sections,
  caption,
}: {
  range: TimeRange;
  now: number;
  sections: readonly GanttSection[];
  caption: string;
}) {
  const scale = makeTicks(range);
  const today = offset(range, now);
  const showToday = now >= range.start && now <= range.end;

  return (
    <figure className="overflow-x-auto rounded-lg border border-border bg-surface">
      <figcaption className="sr-only">{caption}</figcaption>
      <div className="min-w-[64rem]">
        <div className="sticky top-0 z-20 grid grid-cols-[16rem_minmax(0,1fr)] border-b border-border bg-bg-subtle text-xs text-fg-subtle">
          <div className="border-r border-border px-4 py-2.5 font-medium">Item</div>
          <div className="relative h-9" aria-hidden="true">
            {scale.map((tick) => (
              <span
                key={tick.at}
                className={cn(
                  "absolute top-0 flex h-full items-center pl-1.5 whitespace-nowrap",
                  tick.major && "font-semibold text-fg-muted",
                )}
                style={{ left: `${offset(range, tick.at)}%` }}
              >
                {tick.label}
              </span>
            ))}
            {showToday ? (
              <span
                className="absolute top-1 z-10 -translate-x-1/2 rounded-full bg-status-danger-fg px-1.5 py-0.5 text-[10px] font-semibold text-white"
                style={{ left: `${today}%` }}
              >
                Today
              </span>
            ) : null}
          </div>
        </div>

        <div className="relative">
          {/* Gridlines and the today line sit behind every row. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 left-64">
            {scale.map((tick) => (
              <span
                key={tick.at}
                className={cn(
                  "absolute inset-y-0 border-l",
                  tick.major ? "border-border-strong/60" : "border-border/70",
                )}
                style={{ left: `${offset(range, tick.at)}%` }}
              />
            ))}
            {showToday ? (
              <span
                className="absolute inset-y-0 z-10 border-l-2 border-status-danger-fg/70"
                style={{ left: `${today}%` }}
              />
            ) : null}
          </div>

          {sections.map((section) => (
            <div key={section.id} role="group" aria-label={section.label ?? caption}>
              {section.label ? (
                <div className="relative grid grid-cols-[16rem_minmax(0,1fr)] border-b border-border bg-bg-subtle/70">
                  <div className="border-r border-border px-4 py-1.5 text-xs font-semibold tracking-[0.04em] text-fg-muted uppercase">
                    {section.label}
                  </div>
                  <div />
                </div>
              ) : null}
              <ul>
                {section.rows.map((row) => (
                  <Row key={row.id} row={row} range={range} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </figure>
  );
}

function Row({ row, range }: { row: GanttRow; range: TimeRange }) {
  const label = (
    <div className="flex min-w-0 flex-col justify-center border-r border-border px-4 py-2">
      {row.href ? (
        <Link href={row.href} className="truncate text-sm font-medium hover:underline" title={row.label}>
          {row.label}
        </Link>
      ) : (
        <span className="truncate text-sm font-medium" title={row.label}>
          {row.label}
        </span>
      )}
      {row.sublabel ? <span className="truncate text-xs text-fg-subtle">{row.sublabel}</span> : null}
    </div>
  );

  if (row.kind === "milestone") {
    const left = offset(range, row.at);
    return (
      <li className="relative grid min-h-12 grid-cols-[16rem_minmax(0,1fr)] border-b border-border last:border-b-0">
        {label}
        <div className="relative">
          <span
            className="group absolute top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2"
            style={{ left: `${left}%` }}
          >
            <span
              role="img"
              aria-label={row.description}
              title={row.description}
              className={cn(
                "block size-3.5 rotate-45 rounded-[2px] border-2",
                row.done ? "border-status-success-fg bg-status-success-fg" : "border-brand bg-surface",
              )}
            />
            <span className="pointer-events-none text-xs whitespace-nowrap text-fg-muted">
              {DAY_MONTH.format(new Date(row.at))}
            </span>
          </span>
        </div>
      </li>
    );
  }

  const geometry = bar(range, row.from, row.to);
  return (
    <li className="relative grid min-h-12 grid-cols-[16rem_minmax(0,1fr)] border-b border-border last:border-b-0">
      {label}
      <div className="relative">
        <span
          role="img"
          aria-label={row.description}
          title={row.description}
          className={cn(
            "absolute top-1/2 z-10 h-5 -translate-y-1/2 overflow-hidden rounded-md border",
            BAR_TONE[row.tone],
            row.openEnded && "border-dashed [mask-image:linear-gradient(to_right,black_70%,transparent)]",
          )}
          style={{ left: `${geometry.left}%`, width: `${geometry.width}%` }}
        >
          {row.progress !== undefined ? (
            <span className="block h-full bg-brand/80" style={{ width: `${Math.round(row.progress * 100)}%` }} />
          ) : null}
        </span>
        {row.markers?.map((marker) => (
          <span
            key={`${marker.label}-${marker.at}`}
            role="img"
            aria-label={`${marker.label}, ${DAY_MONTH.format(new Date(marker.at))}${marker.done ? ", reached" : ""}`}
            title={`${marker.label} · ${DAY_MONTH.format(new Date(marker.at))}`}
            className={cn(
              "absolute top-1/2 z-20 block size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] border-2",
              marker.done ? "border-status-success-fg bg-status-success-fg" : "border-brand bg-surface",
            )}
            style={{ left: `${offset(range, marker.at)}%` }}
          />
        ))}
      </div>
    </li>
  );
}
