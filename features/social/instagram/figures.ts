import type { MediaStat, SnapshotRow } from "../queries";

/**
 * Charts and rankings from synced Instagram figures. Pure: the page passes in
 * rows and the clock.
 */

const DAY = 86_400_000;

export type DayPoint = { day: string; reach: number | null; gained: number | null };

/**
 * One point per UTC day for the last `days` days, across every connected
 * account: reach summed, and followers gained as today's count minus the
 * previous day's. A day with no figures is null (a gap), never a zero: "we did
 * not sync" is not "nobody saw anything".
 */
export function dailySeries(snapshots: readonly SnapshotRow[], now: number, days = 30): DayPoint[] {
  const byAccount = new Map<string, Map<string, SnapshotRow>>();
  for (const row of snapshots) {
    const rows = byAccount.get(row.account_id) ?? new Map<string, SnapshotRow>();
    rows.set(row.day, row);
    byAccount.set(row.account_id, rows);
  }
  const today = Date.parse(`${new Date(now).toISOString().slice(0, 10)}T00:00:00Z`);
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(today - (days - 1 - index) * DAY).toISOString().slice(0, 10);
    const previous = new Date(today - (days - index) * DAY).toISOString().slice(0, 10);
    let reach: number | null = null;
    let gained: number | null = null;
    for (const rows of byAccount.values()) {
      const current = rows.get(day);
      if (current?.reach != null) reach = (reach ?? 0) + current.reach;
      const before = rows.get(previous);
      if (current?.followers != null && before?.followers != null)
        gained = (gained ?? 0) + (current.followers - before.followers);
    }
    return { day, reach, gained };
  });
}

/** How a post did, in one number to rank by: reach when Instagram gives it, else interactions. */
export function score(stat: Pick<MediaStat, "reach" | "interactions" | "likes" | "comments">): number {
  return stat.reach ?? stat.interactions ?? (stat.likes ?? 0) + (stat.comments ?? 0);
}

export function topPosts(stats: readonly MediaStat[], now: number, days = 30, limit = 5): MediaStat[] {
  return stats
    .filter((stat) => stat.posted_at !== null && now - Date.parse(stat.posted_at) <= days * DAY)
    .sort((a, b) => score(b) - score(a))
    .slice(0, limit);
}

/** Share of people reached who liked, commented, saved or shared. Null when reach is unknown. */
export function engagementRate(stat: Pick<MediaStat, "reach" | "interactions">): number | null {
  if (!stat.reach || stat.interactions == null) return null;
  return stat.interactions / stat.reach;
}
