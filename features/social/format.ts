/** "Tue 6 Oct, 10:00" in the reader's timezone. */
export function slot(iso: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toUTCString();
  }
}

/** "3 days ago", "today", "never" — for how long an account has been quiet. */
export function quietFor(days: number | null): string {
  if (days === null) return "Never posted";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

/**
 * 12,400 → "12.4K". Written out rather than Intl's compact notation, whose
 * output differs between Node and browsers and so between server and client.
 */
export function compactNumber(value: number): string {
  const scaled = (divisor: number, suffix: string) => {
    const amount = value / divisor;
    return `${(amount < 10 ? Math.floor(amount * 10) / 10 : Math.floor(amount)).toString()}${suffix}`;
  };
  if (value >= 1_000_000) return scaled(1_000_000, "M");
  if (value >= 1_000) return scaled(1_000, "K");
  return String(value);
}

/** Pillars already in use, so the same campaign keeps one spelling. */
export function pillarsOf(posts: readonly { pillar: string | null }[]): string[] {
  return [...new Set(posts.map((post) => post.pillar).filter((pillar): pillar is string => Boolean(pillar)))];
}

/** How far `timeZone` is ahead of UTC at `instant`, in milliseconds. */
function offsetAt(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((entry) => entry.type === type)?.value);
  const wall = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
  return wall - Math.floor(instant / 1000) * 1000;
}

/**
 * An instant as the "YYYY-MM-DDTHH:mm" a datetime-local input shows, on the
 * reader's profile clock. Using the profile rather than the machine means the
 * server render, the browser and the calendar all agree.
 */
export function toWallTime(iso: string, timeZone: string): string {
  const instant = Date.parse(iso);
  return new Date(instant + offsetAt(instant, timeZone)).toISOString().slice(0, 16);
}

/** The reverse: what someone typed on their profile clock, as an instant. */
export function fromWallTime(wall: string, timeZone: string): string {
  const guess = Date.parse(`${wall}:00Z`);
  if (Number.isNaN(guess)) return wall;
  // Twice, so a wall time just across a daylight-saving change lands right.
  const first = guess - offsetAt(guess, timeZone);
  return new Date(guess - offsetAt(first, timeZone)).toISOString();
}
