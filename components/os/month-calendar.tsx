import { ChevronLeft, ChevronRight, Flag } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { CalendarDay } from "@/features/timeline/calendar";
import { cn } from "@/lib/utils";

export type CalendarItem = {
  id: string;
  label: string;
  href: string;
  kind: "task" | "milestone" | "marker";
  tone: "neutral" | "brand" | "success" | "danger" | "review";
  /** Short prefix such as a task reference. */
  prefix?: string;
};

const ITEM_TONE: Record<CalendarItem["tone"], string> = {
  neutral: "border-l-border-strong bg-bg-subtle",
  brand: "border-l-brand bg-brand-subtle",
  success: "border-l-status-success-fg bg-status-success-bg text-fg-muted line-through",
  danger: "border-l-status-danger-fg bg-status-danger-bg",
  review: "border-l-status-review-fg bg-status-review-bg",
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const VISIBLE_PER_DAY = 3;
const LONG_DAY = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/**
 * A month of deadlines. A grid on wide screens; on a phone the same items
 * become an agenda of only the days that have something on them, because a
 * seven-column grid at 390px leaves each day about the width of its number.
 */
export function MonthCalendar({
  title,
  days,
  items,
  today,
  prevHref,
  nextHref,
  todayHref,
  addFor,
}: {
  title: string;
  days: readonly CalendarDay[];
  items: ReadonlyMap<string, readonly CalendarItem[]>;
  today: string;
  prevHref: string;
  nextHref: string;
  todayHref: string;
  /** An "add on this day" control, when the reader may add. */
  addFor?: (day: string) => ReactNode;
}) {
  const agenda = days.filter((day) => day.inMonth && (items.get(day.key)?.length ?? 0) > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <div className="flex items-center gap-1.5">
          <Button asChild variant="outline" size="icon-sm">
            <Link href={prevHref} aria-label="Previous month">
              <ChevronLeft aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={todayHref}>Today</Link>
          </Button>
          <Button asChild variant="outline" size="icon-sm">
            <Link href={nextHref} aria-label="Next month">
              <ChevronRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-border bg-surface md:block">
        <div
          className="grid grid-cols-7 border-b border-border bg-bg-subtle text-xs font-medium text-fg-subtle"
          aria-hidden="true"
        >
          {WEEKDAYS.map((weekday) => (
            <div key={weekday} className="px-3 py-2">
              {weekday}
            </div>
          ))}
        </div>
        <ol className="grid grid-cols-7">
          {days.map((day, index) => {
            const dayItems = items.get(day.key) ?? [];
            const isToday = day.key === today;
            return (
              <li
                key={day.key}
                aria-label={LONG_DAY.format(new Date(`${day.key}T00:00:00Z`))}
                className={cn(
                  "group relative flex min-h-32 flex-col gap-1 border-border p-1.5",
                  index % 7 !== 6 && "border-r",
                  index < 35 && "border-b",
                  !day.inMonth && "bg-bg-subtle/60",
                  day.weekend && day.inMonth && "bg-bg-subtle/30",
                )}
              >
                <div className="flex items-center justify-between px-1">
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                      isToday
                        ? "bg-brand font-semibold text-brand-solid-fg"
                        : day.inMonth
                          ? "text-fg-muted"
                          : "text-fg-subtle/70",
                    )}
                  >
                    {day.day}
                  </span>
                  {addFor && day.inMonth ? (
                    <span className="opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                      {addFor(day.key)}
                    </span>
                  ) : null}
                </div>
                <ul className="flex flex-col gap-1">
                  {dayItems.slice(0, VISIBLE_PER_DAY).map((item) => (
                    <li key={item.id}>
                      <ItemLink item={item} />
                    </li>
                  ))}
                </ul>
                {dayItems.length > VISIBLE_PER_DAY ? (
                  <details className="text-xs">
                    <summary className="cursor-pointer px-1 text-fg-muted hover:text-fg">
                      +{dayItems.length - VISIBLE_PER_DAY} more
                    </summary>
                    <ul className="absolute inset-x-1 z-20 mt-1 flex flex-col gap-1 rounded-md border border-border bg-surface-raised p-1.5 shadow-m">
                      {dayItems.slice(VISIBLE_PER_DAY).map((item) => (
                        <li key={item.id}>
                          <ItemLink item={item} />
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="flex flex-col gap-4 md:hidden">
        {agenda.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface px-4 py-6 text-center text-sm text-fg-muted">
            Nothing due this month.
          </p>
        ) : (
          agenda.map((day) => (
            <section key={day.key} className="rounded-lg border border-border bg-surface p-3">
              <h3 className={cn("mb-2 text-sm font-semibold", day.key === today && "text-brand")}>
                {LONG_DAY.format(new Date(`${day.key}T00:00:00Z`))}
              </h3>
              <ul className="flex flex-col gap-1.5">
                {(items.get(day.key) ?? []).map((item) => (
                  <li key={item.id}>
                    <ItemLink item={item} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

function ItemLink({ item }: { item: CalendarItem }) {
  if (item.kind !== "task") {
    return (
      <Link
        href={item.href}
        title={item.label}
        className="flex items-center gap-1.5 rounded-sm px-1.5 py-1 text-xs font-medium text-fg hover:bg-bg-subtle"
      >
        <Flag
          className={cn("size-3.5 shrink-0", item.tone === "success" ? "text-status-success-fg" : "text-brand")}
          aria-hidden="true"
        />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  }
  return (
    <Link
      href={item.href}
      title={item.prefix ? `${item.prefix} ${item.label}` : item.label}
      className={cn(
        "block truncate rounded-sm border-l-2 px-1.5 py-1 text-xs hover:brightness-95",
        ITEM_TONE[item.tone],
      )}
    >
      {item.prefix ? (
        <span className="mr-1 font-mono text-[10px] text-fg-subtle no-underline">{item.prefix}</span>
      ) : null}
      {item.label}
    </Link>
  );
}
