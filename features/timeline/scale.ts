/**
 * Arithmetic for the Gantt-style timelines: a time range, where a moment sits
 * in it as a percentage, and the tick marks along the top. Kept apart from the
 * markup so the maths can be tested without rendering anything.
 *
 * Date-only values ("2026-10-01") are placed at UTC midnight and ticks are
 * labelled in UTC, so a bar and the tick above it always agree on the day.
 */

const DAY = 86_400_000;

export type TimeRange = { start: number; end: number };

/** Parses a `date` or `timestamptz` column value to epoch ms; null for empty or invalid. */
export function toTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = /^\d{4}-\d{2}-\d{2}$/.test(value) ? Date.parse(`${value}T00:00:00Z`) : Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

/**
 * A range that contains every given moment and today, padded and snapped to
 * whole days, never shorter than four weeks: a timeline squeezed into three
 * days draws every bar full width and says nothing.
 */
export function timelineRange(moments: readonly (number | null)[], now: number, padDays = 5): TimeRange {
  const known = moments.filter((moment): moment is number => moment !== null);
  let start = Math.min(now, ...known) - padDays * DAY;
  let end = Math.max(now, ...known) + padDays * DAY;
  start = Math.floor(start / DAY) * DAY;
  end = Math.ceil(end / DAY) * DAY;
  const minimum = 28 * DAY;
  if (end - start < minimum) {
    const grow = (minimum - (end - start)) / 2;
    start = Math.floor((start - grow) / DAY) * DAY;
    end = start + minimum;
  }
  return { start, end };
}

/** Where `at` sits in the range, as a percentage clamped to 0–100. */
export function offset(range: TimeRange, at: number): number {
  const percent = ((at - range.start) / (range.end - range.start)) * 100;
  return Math.min(100, Math.max(0, percent));
}

/**
 * A bar from `from` to `to`, as left and width percentages. A bar shorter than
 * `minWidth` percent is widened so it stays visible and clickable.
 */
export function bar(range: TimeRange, from: number, to: number, minWidth = 0.8): { left: number; width: number } {
  const left = offset(range, Math.min(from, to));
  const right = offset(range, Math.max(from, to));
  const width = Math.max(minWidth, right - left);
  return { left: Math.min(left, 100 - width), width };
}

export type Tick = { at: number; label: string; major: boolean };

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const MONTH_YEAR = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const DAY_MONTH = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Weekly ticks (Mondays) for ranges up to about four months, monthly beyond
 * that. Month starts are major either way, so the eye can find its place.
 */
export function ticks(range: TimeRange): Tick[] {
  const spanDays = (range.end - range.start) / DAY;
  const result: Tick[] = [];

  if (spanDays <= 120) {
    const first = new Date(range.start);
    const weekday = (first.getUTCDay() + 6) % 7;
    let at = Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), first.getUTCDate()) + ((7 - weekday) % 7) * DAY;
    while (at <= range.end) {
      const date = new Date(at);
      const major = date.getUTCDate() <= 7;
      result.push({ at, label: DAY_MONTH.format(date), major });
      at += 7 * DAY;
    }
    return result;
  }

  const first = new Date(range.start);
  let year = first.getUTCFullYear();
  let month = first.getUTCMonth() + 1;
  for (;;) {
    if (month > 11) {
      month = 0;
      year += 1;
    }
    const at = Date.UTC(year, month, 1);
    if (at > range.end) break;
    const date = new Date(at);
    result.push({ at, label: month === 0 ? MONTH_YEAR.format(date) : MONTH.format(date), major: month === 0 });
    month += 1;
  }
  return result;
}
