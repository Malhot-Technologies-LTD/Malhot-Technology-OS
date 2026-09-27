import { weekStart } from "@/features/dashboard/stats";
import { dayKey } from "@/features/timeline/calendar";

import { POST_STATUSES, type AccountStatus, type Platform, type PostFormat, type PostStatus } from "./schemas";

/**
 * Social dashboard figures, from the rows the viewer can already read.
 *
 * Pure, and tested against a fixed clock. Instants are compared with `now`;
 * only "this month" needs a calendar, and it uses the reader's timezone, so a
 * post that went out at 23:30 in Kigali on the 31st counts for that month.
 */

export type SocialAccountRow = {
  id: string;
  platform: Platform;
  handle: string;
  profile_url: string | null;
  status: AccountStatus;
  followers: number | null;
  followers_updated_at: string | null;
  notes: string | null;
};

export type SocialPostRow = {
  id: string;
  title: string;
  caption: string | null;
  format: PostFormat;
  status: PostStatus;
  scheduled_at: string | null;
  published_at: string | null;
  pillar: string | null;
  asset_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  owner: { id: string; full_name: string } | null;
  channels: { account_id: string; published_url: string | null }[];
};

const DAY = 86_400_000;
export const TREND_WEEKS = 8;
/** An active account with nothing out for this long is flagged as gone quiet. */
export const QUIET_DAYS = 7;

export type AccountHealth = SocialAccountRow & {
  lastPublishedAt: string | null;
  nextScheduledAt: string | null;
  published30d: number;
  /** Whole days since the last post; null when it has never posted. */
  daysQuiet: number | null;
  quiet: boolean;
};

export type SocialStats = {
  scheduledNext7: number;
  publishedThisMonth: number;
  publishedLastMonth: number;
  awaitingApproval: number;
  ideas: number;
  activeAccounts: number;
  quietAccounts: number;
  byStatus: { status: PostStatus; count: number }[];
  weeks: { start: string; published: number }[];
  byPlatform: { platform: Platform; count: number }[];
  /** Dated and not yet out, soonest first, over the next 14 days. */
  upcoming: SocialPostRow[];
  /** Past their slot but not marked published, or approved with no slot at all. */
  attention: { post: SocialPostRow; reason: "overdue" | "unscheduled" }[];
  accounts: AccountHealth[];
};

const time = (value: string | null) => (value ? Date.parse(value) : Number.NaN);

export function computeSocialStats(
  posts: readonly SocialPostRow[],
  accounts: readonly SocialAccountRow[],
  now: number,
  timeZone: string,
): SocialStats {
  const published = posts.filter((post) => post.status === "published" && post.published_at);
  const unpublished = posts.filter((post) => post.status !== "published");

  const month = dayKey(now, timeZone).slice(0, 7);
  const lastMonthDate = new Date(`${month}-01T12:00:00Z`);
  lastMonthDate.setUTCMonth(lastMonthDate.getUTCMonth() - 1);
  const lastMonth = lastMonthDate.toISOString().slice(0, 7);
  const monthOf = (post: SocialPostRow) => dayKey(post.published_at!, timeZone).slice(0, 7);

  const thisWeek = weekStart(now);
  const weeks = Array.from({ length: TREND_WEEKS }, (_, index) => {
    const start = thisWeek - (TREND_WEEKS - 1 - index) * 7 * DAY;
    return {
      start: new Date(start).toISOString(),
      published: published.filter((post) => weekStart(time(post.published_at)) === start).length,
    };
  });

  const platformOf = new Map(accounts.map((account) => [account.id, account.platform]));
  const platformCounts = new Map<Platform, number>();
  for (const post of published) {
    if (time(post.published_at) < now - 30 * DAY) continue;
    for (const channel of post.channels) {
      const platform = platformOf.get(channel.account_id);
      if (platform) platformCounts.set(platform, (platformCounts.get(platform) ?? 0) + 1);
    }
  }

  const upcoming = unpublished
    .filter((post) => {
      const at = time(post.scheduled_at);
      return at >= now && at <= now + 14 * DAY;
    })
    .sort((a, b) => time(a.scheduled_at) - time(b.scheduled_at));

  const attention: SocialStats["attention"] = [
    ...unpublished
      .filter((post) => (post.status === "scheduled" || post.status === "approved") && time(post.scheduled_at) < now)
      .sort((a, b) => time(a.scheduled_at) - time(b.scheduled_at))
      .map((post) => ({ post, reason: "overdue" as const })),
    ...unpublished
      .filter((post) => post.status === "approved" && !post.scheduled_at)
      .map((post) => ({ post, reason: "unscheduled" as const })),
  ];

  const accountRows = accounts.map((account): AccountHealth => {
    const on = (post: SocialPostRow) => post.channels.some((channel) => channel.account_id === account.id);
    const out = published.filter(on);
    const last = out.reduce<number>(
      (latest, post) => Math.max(latest, time(post.published_at)),
      Number.NEGATIVE_INFINITY,
    );
    const lastAt = Number.isFinite(last) ? last : null;
    const next = unpublished
      .filter((post) => on(post) && time(post.scheduled_at) >= now)
      .reduce<number>((soonest, post) => Math.min(soonest, time(post.scheduled_at)), Number.POSITIVE_INFINITY);
    const daysQuiet = lastAt === null ? null : Math.floor((now - lastAt) / DAY);
    return {
      ...account,
      lastPublishedAt: lastAt === null ? null : new Date(lastAt).toISOString(),
      nextScheduledAt: Number.isFinite(next) ? new Date(next).toISOString() : null,
      published30d: out.filter((post) => time(post.published_at) >= now - 30 * DAY).length,
      daysQuiet,
      // Quiet only if nothing is on the way either: a gap already filled is not a problem.
      quiet: account.status === "active" && (daysQuiet === null || daysQuiet >= QUIET_DAYS) && !Number.isFinite(next),
    };
  });

  return {
    scheduledNext7: unpublished.filter((post) => {
      const at = time(post.scheduled_at);
      return post.status === "scheduled" && at >= now && at <= now + 7 * DAY;
    }).length,
    publishedThisMonth: published.filter((post) => monthOf(post) === month).length,
    publishedLastMonth: published.filter((post) => monthOf(post) === lastMonth).length,
    awaitingApproval: posts.filter((post) => post.status === "draft").length,
    ideas: posts.filter((post) => post.status === "idea").length,
    activeAccounts: accounts.filter((account) => account.status === "active").length,
    quietAccounts: accountRows.filter((account) => account.quiet).length,
    byStatus: POST_STATUSES.map((status) => ({
      status,
      count: posts.filter((post) => post.status === status).length,
    })),
    weeks,
    byPlatform: [...platformCounts.entries()]
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count),
    upcoming,
    attention,
    accounts: [...accountRows].sort(
      (a, b) =>
        Number(b.quiet) - Number(a.quiet) ||
        (b.followers ?? -1) - (a.followers ?? -1) ||
        a.handle.localeCompare(b.handle),
    ),
  };
}
