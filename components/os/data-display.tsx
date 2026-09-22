import { cn } from "@/lib/utils";

/**
 * The data display rules from docs/design/design-system.md#data-display-rules,
 * in one place so no page re-decides them:
 *
 *   - dates are `12 Mar` inside the current year, `12 Mar 2025` outside it
 *   - relative time only ever appears *beside* the absolute date, never alone
 *   - empty values render `—`, not blank
 *   - identifiers are mono and never clipped
 *   - progress always carries its numerator and denominator
 */

const SAME_YEAR = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const OTHER_YEAR = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export const EMPTY = "—";

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parses a value from a Postgres `date` or `timestamptz` column.
 *
 * `date` columns arrive as "2026-09-22", which `new Date()` reads as UTC
 * midnight. Reading that back with local getters shifts the day west of UTC —
 * a project due "22 Sep" would render "21 Sep" in New York. Date-only values
 * are therefore built as local calendar dates, which is what they mean:
 * a day on a calendar, not an instant.
 */
function parseDate(value: string): Date | null {
  const parts = DATE_ONLY.exec(value);
  const date = parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | null | undefined, today = new Date()): string {
  if (!value) return EMPTY;
  const date = parseDate(value);
  if (!date) return EMPTY;
  return date.getFullYear() === today.getFullYear() ? SAME_YEAR.format(date) : OTHER_YEAR.format(date);
}

/** Whole calendar days from today; negative is in the past. */
export function daysUntil(value: string, today = new Date()): number {
  const date = parseDate(value);
  if (!date) return 0;
  const midnight = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((midnight(date) - midnight(today)) / 86_400_000);
}

export function relativeDays(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "1 day overdue";
  if (days < 0) return `${Math.abs(days)} days overdue`;
  return `in ${days} days`;
}

type DueDateProps = {
  value: string | null | undefined;
  /** Past dates only read as overdue while the work is still open. */
  open?: boolean;
  /** Show the relative phrase next to the date. */
  relative?: boolean;
  className?: string;
};

export function DueDate({ value, open = true, relative = false, className }: DueDateProps) {
  if (!value) return <span className={cn("text-fg-subtle", className)}>{EMPTY}</span>;

  const days = daysUntil(value);
  const overdue = open && days < 0;
  const soon = open && days >= 0 && days <= 2;

  return (
    <span
      className={cn(
        "tabular-nums",
        overdue && "font-medium text-status-danger-fg",
        soon && "text-status-warning-fg",
        className,
      )}
    >
      {formatDate(value)}
      {relative ? <span className="ml-1.5 text-xs text-fg-muted">{relativeDays(days)}</span> : null}
      {overdue && !relative ? <span className="sr-only"> — {relativeDays(days)}</span> : null}
    </span>
  );
}

/** `MAL` / `MAL-42`: mono, bordered, never truncated. */
export function ProjectKey({ value, className }: { value: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-sm border border-border bg-bg-subtle px-1.5 font-mono text-xs text-fg-muted",
        className,
      )}
    >
      {value}
    </span>
  );
}

type ProgressProps = {
  done: number;
  total: number;
  label: string;
  className?: string;
};

/** Progress never shows a bare percentage — the counts are the point. */
export function ProgressBar({ done, total, label, className }: ProgressProps) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-fg-muted">{label}</span>
        <span className="tabular-nums">
          {done}/{total}
          {total > 0 ? <span className="ml-1.5 text-fg-muted">{percent}%</span> : null}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-sm bg-bg-subtle"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${label}: ${done} of ${total}`}
      >
        <div
          className="h-full rounded-sm bg-brand transition-[width] duration-[240ms]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/** Key/value rows for facts panels. Empty values fall back to `—`. */
export function KeyValueList({ items }: { items: readonly { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="flex flex-col gap-2 text-sm">
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline justify-between gap-3">
          <dt className="text-fg-muted">{item.label}</dt>
          <dd className="text-right">{item.value ?? EMPTY}</dd>
        </div>
      ))}
    </dl>
  );
}
