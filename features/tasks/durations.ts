/**
 * "3d 4h", "45m", "under a minute": a span of time the way a person would say
 * it, at most two units. Used for how long a task took to be picked up, how
 * long it has been in progress and how long it took end to end.
 */
export function formatSpan(ms: number): string {
  const span = Math.max(0, ms);
  const minutes = Math.floor(span / 60_000) % 60;
  const hours = Math.floor(span / 3_600_000) % 24;
  const days = Math.floor(span / 86_400_000);
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return "under a minute";
}

/** The span between two instants, or null when either is missing. */
export function spanBetween(from: string | null | undefined, to: string | null | undefined): number | null {
  if (!from || !to) return null;
  const start = Date.parse(from);
  const end = Date.parse(to);
  return Number.isNaN(start) || Number.isNaN(end) ? null : end - start;
}
