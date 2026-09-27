import { AlertTriangle, CalendarClock, CheckCircle2, PenLine, UsersRound } from "lucide-react";
import Link from "next/link";

import { BarList, ColumnChart } from "@/components/os/charts";
import { EmptyState } from "@/components/os/empty-state";
import { StatRow, StatTile } from "@/components/os/metrics";
import { Panel, PanelLink } from "@/components/os/panel";
import { StatusPill } from "@/components/os/status-badge";
import { Button } from "@/components/ui/button";
import { PlatformBadge } from "./platform-badge";
import { compactNumber, quietFor, slot } from "../format";
import { ACCOUNT_STATUS_META, PLATFORM_META, POST_FORMAT_LABEL, POST_STATUS_META } from "../schemas";
import { computeSocialStats, QUIET_DAYS, type SocialAccountRow, type SocialPostRow, type SocialStats } from "../stats";

/**
 * The social media manager's dashboard: what is going out, what is stuck, and
 * which accounts have gone quiet. Figures first, then the lists to act on.
 * Rendered from rows, so it works with any data source (page or fixture).
 */
const weekLabel = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const shortWeekLabel = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "numeric", timeZone: "UTC" });

export function SocialOverview({
  posts,
  accounts,
  now,
  timeZone,
}: {
  posts: readonly SocialPostRow[];
  accounts: readonly SocialAccountRow[];
  now: number;
  timeZone: string;
}) {
  const stats = computeSocialStats(posts, accounts, now, timeZone);
  const change = stats.publishedThisMonth - stats.publishedLastMonth;

  return (
    <div className="flex flex-col gap-6">
      <StatRow>
        <StatTile
          label="Next 7 days"
          value={stats.scheduledNext7}
          hint={stats.scheduledNext7 === 0 ? "Nothing scheduled" : "Scheduled to go out"}
          icon={CalendarClock}
          tone={stats.scheduledNext7 === 0 ? "warning" : "brand"}
          href="/os/social/calendar"
        />
        <StatTile
          label="Published"
          value={stats.publishedThisMonth}
          delta={{
            text: change === 0 ? "±0" : change > 0 ? `+${change}` : `${change}`,
            direction: change > 0 ? "good" : change < 0 ? "bad" : "flat",
          }}
          hint="this month, vs last"
          icon={CheckCircle2}
          tone="success"
        />
        <StatTile
          label="To approve"
          value={stats.awaitingApproval}
          hint={`${stats.ideas} ${stats.ideas === 1 ? "idea" : "ideas"} in the bank`}
          icon={PenLine}
          href="/os/social/posts?status=draft"
        />
        <StatTile
          label="At risk"
          value={stats.attention.length}
          hint={stats.attention.length === 0 ? "Everything on track" : "Missed, or no date"}
          icon={AlertTriangle}
          tone={stats.attention.length > 0 ? "danger" : "neutral"}
        />
        <StatTile
          label="Accounts"
          value={stats.activeAccounts}
          hint={stats.quietAccounts > 0 ? `active, ${stats.quietAccounts} gone quiet` : "active, all posting"}
          icon={UsersRound}
          tone={stats.quietAccounts > 0 ? "warning" : "neutral"}
          href="/os/social/accounts"
        />
      </StatRow>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel
          title="Posts published per week"
          description="Last 8 weeks, weeks starting Monday"
          className="xl:col-span-2"
        >
          <ColumnChart
            caption="Posts published per week, last 8 weeks"
            valueHeading="Published"
            data={stats.weeks.map((week) => {
              const label = weekLabel.format(new Date(week.start));
              return {
                key: week.start,
                label,
                shortLabel: shortWeekLabel.format(new Date(week.start)),
                value: week.published,
                tooltip: `Week of ${label}: ${week.published} published`,
              };
            })}
          />
        </Panel>
        <Panel title="Where posts went out" description="Published in the last 30 days, per platform">
          {stats.byPlatform.length === 0 ? (
            <EmptyState
              variant="well"
              title="Nothing published yet"
              description="Mark posts published and pick their channels to see the spread."
            />
          ) : (
            <BarList
              caption="Posts published per platform, last 30 days"
              labelHeading="Platform"
              valueHeading="Posts"
              data={stats.byPlatform.map((row) => ({
                key: row.platform,
                label: PLATFORM_META[row.platform].label,
                value: row.count,
              }))}
            />
          )}
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Coming up"
          description="The next 14 days"
          action={<PanelLink href="/os/social/calendar">Calendar</PanelLink>}
        >
          {stats.upcoming.length === 0 ? (
            <EmptyState
              variant="well"
              icon={CalendarClock}
              title="Nothing planned for the next two weeks"
              description="Give posts a date to fill the calendar."
            />
          ) : (
            <PostList posts={stats.upcoming} timeZone={timeZone} accounts={accounts} />
          )}
        </Panel>
        <Panel title="Needs attention" description="Past their slot but not marked published, or approved with no date">
          {stats.attention.length === 0 ? (
            <EmptyState
              variant="well"
              icon={CheckCircle2}
              title="Nothing slipping"
              description="Missed slots and approved posts without a date show here."
            />
          ) : (
            <ul className="-my-1 flex flex-col divide-y divide-border">
              {stats.attention.slice(0, 8).map(({ post, reason }) => (
                <li key={post.id} className="relative flex items-center gap-3 py-2.5">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Link
                      href={`/os/social/posts/${post.id}`}
                      className="truncate text-sm font-medium after:absolute after:inset-0 hover:underline"
                    >
                      {post.title}
                    </Link>
                    <span className="truncate text-xs text-fg-subtle">
                      {reason === "overdue" && post.scheduled_at
                        ? `Was due ${slot(post.scheduled_at, timeZone)}`
                        : "Approved, no date yet"}
                    </span>
                  </div>
                  <StatusPill tone={reason === "overdue" ? "danger" : "warning"}>
                    {reason === "overdue" ? "Missed" : "No date"}
                  </StatusPill>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        title="Accounts"
        description={`Quiet means active with nothing out for ${QUIET_DAYS} days and nothing booked`}
        action={<PanelLink href="/os/social/accounts">Manage accounts</PanelLink>}
      >
        {stats.accounts.length === 0 ? (
          <EmptyState
            variant="well"
            title="No accounts yet"
            description="Add the company's accounts to track them here."
            action={
              <Button asChild size="sm">
                <Link href="/os/social/accounts/new">Add an account</Link>
              </Button>
            }
          />
        ) : (
          <AccountTable accounts={stats.accounts} timeZone={timeZone} />
        )}
      </Panel>
    </div>
  );
}

function PostList({
  posts,
  timeZone,
  accounts,
}: {
  posts: readonly SocialPostRow[];
  timeZone: string;
  accounts: readonly SocialAccountRow[];
}) {
  return (
    <ul className="-my-1 flex flex-col divide-y divide-border">
      {posts.slice(0, 8).map((post) => {
        const platforms = [
          ...new Set(
            post.channels
              .map((channel) => accounts.find((account) => account.id === channel.account_id)?.platform)
              .filter((platform) => platform !== undefined),
          ),
        ];
        return (
          <li key={post.id} className="relative flex items-center gap-3 py-2.5">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Link
                href={`/os/social/posts/${post.id}`}
                className="truncate text-sm font-medium after:absolute after:inset-0 hover:underline"
              >
                {post.title}
              </Link>
              <span className="truncate text-xs text-fg-subtle">
                {post.scheduled_at ? slot(post.scheduled_at, timeZone) : ""} · {POST_FORMAT_LABEL[post.format]}
                {platforms.length > 0
                  ? ` · ${platforms.map((platform) => PLATFORM_META[platform].label).join(", ")}`
                  : ""}
              </span>
            </div>
            <StatusPill tone={POST_STATUS_META[post.status].tone}>{POST_STATUS_META[post.status].label}</StatusPill>
          </li>
        );
      })}
    </ul>
  );
}

function AccountTable({ accounts, timeZone }: { accounts: SocialStats["accounts"]; timeZone: string }) {
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[44rem] text-sm">
        <thead>
          <tr className="text-left text-xs text-fg-subtle">
            <th scope="col" className="px-1 pb-2 font-medium">
              Account
            </th>
            <th scope="col" className="px-1 pb-2 font-medium">
              Status
            </th>
            <th scope="col" className="px-1 pb-2 text-right font-medium">
              Followers
            </th>
            <th scope="col" className="px-1 pb-2 text-right font-medium">
              Posts, 30 days
            </th>
            <th scope="col" className="px-1 pb-2 font-medium">
              Last post
            </th>
            <th scope="col" className="px-1 pb-2 font-medium">
              Next post
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {accounts.map((account) => (
            <tr key={account.id}>
              <td className="px-1 py-2.5">
                <Link href={`/os/social/accounts/${account.id}`} className="hover:underline">
                  <PlatformBadge platform={account.platform} handle={account.handle} />
                </Link>
              </td>
              <td className="px-1 py-2.5">
                {account.quiet ? (
                  <StatusPill tone="warning">Quiet</StatusPill>
                ) : (
                  <StatusPill tone={ACCOUNT_STATUS_META[account.status].tone}>
                    {ACCOUNT_STATUS_META[account.status].label}
                  </StatusPill>
                )}
              </td>
              <td className="px-1 py-2.5 text-right tabular-nums">
                {account.followers === null ? (
                  <span className="text-fg-subtle">—</span>
                ) : (
                  compactNumber(account.followers)
                )}
              </td>
              <td className="px-1 py-2.5 text-right tabular-nums">{account.published30d}</td>
              <td
                className={
                  account.quiet ? "px-1 py-2.5 font-medium text-status-warning-fg" : "px-1 py-2.5 text-fg-muted"
                }
              >
                {quietFor(account.daysQuiet)}
              </td>
              <td className="px-1 py-2.5 text-fg-muted">
                {account.nextScheduledAt ? slot(account.nextScheduledAt, timeZone) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
