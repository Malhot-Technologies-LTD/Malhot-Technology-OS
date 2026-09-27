import { Eye, Heart, TrendingUp, UsersRound } from "lucide-react";
import Link from "next/link";

import { ColumnChart } from "@/components/os/charts";
import { EmptyState } from "@/components/os/empty-state";
import { StatRow, StatTile } from "@/components/os/metrics";
import { Panel } from "@/components/os/panel";

import { compactNumber, slot } from "../format";
import { dailySeries, engagementRate, topPosts } from "../instagram/figures";
import type { MediaStat, SnapshotRow } from "../queries";
import type { SocialAccountRow } from "../stats";

const dayLabel = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const number = new Intl.NumberFormat("en-GB");

/**
 * Figures synced from connected Instagram accounts: how many follow, how many
 * were reached, and which posts did best. Everything here comes from
 * Instagram; the planning figures above come from the OS.
 */
export function InstagramOverview({
  accounts,
  connectedIds,
  snapshots,
  media,
  now,
  timeZone,
}: {
  accounts: readonly SocialAccountRow[];
  connectedIds: readonly string[];
  snapshots: readonly SnapshotRow[];
  media: readonly MediaStat[];
  now: number;
  timeZone: string;
}) {
  const connected = accounts.filter((account) => connectedIds.includes(account.id));
  const followers = connected.reduce<number | null>(
    (sum, account) => (account.followers === null ? sum : (sum ?? 0) + account.followers),
    null,
  );
  const series = dailySeries(snapshots, now, 30);
  // Instagram reports a day's reach the next morning, so the chart ends yesterday.
  const reachSeries = dailySeries(snapshots, now - 86_400_000, 30);
  const gained = series.reduce<number | null>(
    (sum, point) => (point.gained === null ? sum : (sum ?? 0) + point.gained),
    null,
  );
  const reach7 = reachSeries
    .slice(-7)
    .reduce<number | null>((sum, point) => (point.reach === null ? sum : (sum ?? 0) + point.reach), null);
  const recent = media.filter((stat) => stat.posted_at && now - Date.parse(stat.posted_at) <= 30 * 86_400_000);
  const rates = recent.map(engagementRate).filter((rate): rate is number => rate !== null);
  const averageRate = rates.length ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length : null;
  const best = topPosts(media, now, 30, 5);
  const handleOf = new Map(accounts.map((account) => [account.id, account.handle]));

  return (
    <section aria-labelledby="instagram-heading" className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="instagram-heading" className="text-lg font-semibold tracking-tight">
          Instagram
        </h2>
        <span className="text-xs text-fg-subtle">
          {connected.map((account) => `@${account.handle}`).join(", ")} · synced daily
        </span>
      </div>

      <StatRow>
        <StatTile
          label="Followers"
          value={followers === null ? "—" : compactNumber(followers)}
          hint={followers === null ? "Not synced yet" : `${number.format(followers)} in total`}
          icon={UsersRound}
          tone="brand"
        />
        <StatTile
          label="Gained, 30 days"
          value={gained === null ? "—" : `${gained > 0 ? "+" : ""}${number.format(gained)}`}
          hint={gained === null ? "Needs two days of syncs" : "net new followers"}
          icon={TrendingUp}
          tone={gained === null ? "neutral" : gained >= 0 ? "success" : "danger"}
        />
        <StatTile
          label="Reach, 7 days"
          value={reach7 === null ? "—" : compactNumber(reach7)}
          hint="accounts reached per day, added up"
          icon={Eye}
        />
        <StatTile
          label="Engagement"
          value={averageRate === null ? "—" : `${(averageRate * 100).toFixed(1)}%`}
          hint={`average of ${rates.length} ${rates.length === 1 ? "post" : "posts"}, 30 days`}
          icon={Heart}
        />
      </StatRow>

      <div className="grid gap-5 xl:grid-cols-5">
        <Panel
          title="Reach per day"
          description="30 days to yesterday, all connected accounts"
          className="xl:col-span-2"
        >
          {reachSeries.every((point) => point.reach === null) ? (
            <EmptyState
              variant="well"
              title="No daily figures yet"
              description="Instagram reports each day's reach the next morning; the daily sync picks it up."
            />
          ) : (
            <ColumnChart
              caption="Accounts reached per day, last 30 days"
              valueHeading="Reach"
              labelHeading="Day"
              data={reachSeries.map((point, index) => {
                const date = new Date(`${point.day}T00:00:00Z`);
                return {
                  key: point.day,
                  label: dayLabel.format(date),
                  // Every seventh day, counted back from today, so the latest is always labelled.
                  axisLabel: (reachSeries.length - 1 - index) % 7 === 0 ? dayLabel.format(date) : "",
                  value: point.reach ?? 0,
                  tooltip:
                    point.reach === null
                      ? `${dayLabel.format(date)}: no figures`
                      : `${dayLabel.format(date)}: ${number.format(point.reach)} reached${point.gained === null ? "" : `, ${point.gained >= 0 ? "+" : ""}${point.gained} followers`}`,
                };
              })}
            />
          )}
        </Panel>

        <Panel title="Best posts" description="Last 30 days, by reach" className="xl:col-span-3">
          {best.length === 0 ? (
            <EmptyState
              variant="well"
              title="No posts in the last 30 days"
              description="Posts appear after the next sync."
            />
          ) : (
            <ol className="-my-1 flex flex-col divide-y divide-border">
              {best.map((post, index) => {
                const rate = engagementRate(post);
                return (
                  <li key={`${post.account_id}-${post.external_id}`} className="flex items-center gap-3 py-2.5">
                    <span className="w-5 shrink-0 text-sm text-fg-subtle tabular-nums">{index + 1}</span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      {post.permalink ? (
                        <Link
                          href={post.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-sm font-medium hover:underline"
                        >
                          {post.caption?.split("\n")[0] || "Untitled post"}
                        </Link>
                      ) : (
                        <span className="truncate text-sm font-medium">{post.caption || "Untitled post"}</span>
                      )}
                      <span className="truncate text-xs text-fg-subtle">
                        @{handleOf.get(post.account_id) ?? "instagram"}
                        {post.posted_at ? ` · ${slot(post.posted_at, timeZone)}` : ""}
                        {post.product_type === "REELS" ? " · Reel" : ""}
                      </span>
                    </div>
                    <dl className="flex shrink-0 gap-4 text-right text-xs tabular-nums">
                      <div>
                        <dt className="text-fg-subtle">Reach</dt>
                        <dd className="text-sm font-medium">{post.reach === null ? "—" : compactNumber(post.reach)}</dd>
                      </div>
                      <div className="hidden sm:block">
                        <dt className="text-fg-subtle">Likes</dt>
                        <dd className="text-sm">{post.likes === null ? "—" : compactNumber(post.likes)}</dd>
                      </div>
                      <div className="hidden sm:block">
                        <dt className="text-fg-subtle">Eng.</dt>
                        <dd className="text-sm">{rate === null ? "—" : `${(rate * 100).toFixed(1)}%`}</dd>
                      </div>
                    </dl>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>
      </div>
    </section>
  );
}
