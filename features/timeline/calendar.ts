/**
 * Month grids for the calendar views.
 *
 * Days are keyed "YYYY-MM-DD" in the viewer's own timezone, read from their
 * profile: a task due at 23:30 in Kigali belongs on that day for someone in
 * Kigali, whatever the server's clock says.
 */

export type CalendarDay = { key: string; day: number; inMonth: boolean; weekend: boolean };

/** The month `YYYY-MM` from a search param, or null when it is not one. */
export function parseMonth(value: string | undefined | null): { year: number; month: number } | null {
  const match = value ? /^(\d{4})-(\d{2})$/.exec(value) : null;
  if (!match) return null;
  const month = Number(match[2]) - 1;
  if (month < 0 || month > 11) return null;
  return { year: Number(match[1]), month };
}

export function monthParam(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Six Monday-first weeks covering the month, so the grid never changes height. */
export function monthGrid(year: number, month: number): CalendarDay[] {
  const first = Date.UTC(year, month, 1);
  const lead = (new Date(first).getUTCDay() + 6) % 7;
  const days: CalendarDay[] = [];
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(first + (index - lead) * 86_400_000);
    const weekday = (date.getUTCDay() + 6) % 7;
    days.push({
      key: date.toISOString().slice(0, 10),
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month,
      weekend: weekday >= 5,
    });
  }
  return days;
}

/** The calendar day an instant falls on in `timeZone`, as "YYYY-MM-DD". */
export function dayKey(at: string | number, timeZone: string): string {
  const date = typeof at === "number" ? new Date(at) : new Date(at);
  try {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
      date,
    );
  } catch {
    return date.toISOString().slice(0, 10);
  }
}
