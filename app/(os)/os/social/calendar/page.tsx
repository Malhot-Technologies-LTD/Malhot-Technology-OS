import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ErrorState } from "@/components/os/error-state";
import { MonthCalendar, type CalendarItem } from "@/components/os/month-calendar";
import { SocialSetupNotice } from "@/features/social/components/setup-notice";
import { listSocialAccounts, listSocialPosts } from "@/features/social/queries";
import { PLATFORM_META, type PostStatus } from "@/features/social/schemas";
import { dayKey, monthGrid, monthParam, parseMonth } from "@/features/timeline/calendar";
import { describeQueryFailure } from "@/lib/actions/db-errors";
import { requireViewer } from "@/lib/auth/context";
import { requestTime } from "@/lib/request-time";

export const metadata: Metadata = { title: "Calendar" };

const TONE: Record<PostStatus, CalendarItem["tone"]> = {
  idea: "neutral",
  draft: "neutral",
  approved: "review",
  scheduled: "brand",
  published: "success",
};
const MONTH_TITLE = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

/**
 * The content calendar: every dated post on the day it goes (or went) out, in
 * the reader's timezone. Hovering a day offers "plan a post" for that date.
 */
export default async function SocialCalendarPage({ searchParams }: PageProps<"/os/social/calendar">) {
  const [viewer, query] = await Promise.all([requireViewer(), searchParams]);
  const [posts, accounts] = await Promise.all([
    listSocialPosts(viewer.organizationId),
    listSocialAccounts(viewer.organizationId),
  ]);
  if (posts.missing || accounts.missing) return <SocialSetupNotice />;
  const failure = posts.error ?? accounts.error;
  if (failure) return <ErrorState {...describeQueryFailure(failure)} />;

  const timeZone = viewer.profile.timezone || "UTC";
  const today = dayKey(requestTime(), timeZone);
  const current = parseMonth(typeof query.month === "string" ? query.month : null) ?? {
    year: Number(today.slice(0, 4)),
    month: Number(today.slice(5, 7)) - 1,
  };
  const platformOf = new Map(accounts.data.map((account) => [account.id, account.platform]));
  const clock = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone });

  const items = new Map<string, CalendarItem[]>();
  for (const post of posts.data) {
    const at = post.status === "published" ? (post.published_at ?? post.scheduled_at) : post.scheduled_at;
    if (!at) continue;
    const key = dayKey(at, timeZone);
    const platforms = [...new Set(post.channels.map((channel) => platformOf.get(channel.account_id)))]
      .filter((platform) => platform !== undefined)
      .map((platform) => PLATFORM_META[platform].label);
    const list = items.get(key) ?? [];
    list.push({
      id: post.id,
      label: platforms.length > 0 ? `${post.title} (${platforms.join(", ")})` : post.title,
      href: `/os/social/posts/${post.id}`,
      kind: "task",
      tone: TONE[post.status],
      prefix: clock.format(new Date(at)),
    });
    items.set(key, list);
  }

  const href = (year: number, month: number) => `/os/social/calendar?month=${monthParam(year, month)}`;

  return (
    <MonthCalendar
      title={MONTH_TITLE.format(new Date(Date.UTC(current.year, current.month, 1)))}
      days={monthGrid(current.year, current.month)}
      items={items}
      today={today}
      prevHref={href(current.year, current.month - 1)}
      nextHref={href(current.year, current.month + 1)}
      todayHref="/os/social/calendar"
      addFor={(day) => (
        <Link
          href={`/os/social/posts/new?date=${day}`}
          aria-label={`Plan a post on ${day}`}
          className="flex size-6 items-center justify-center rounded-sm text-fg-subtle hover:bg-bg-subtle hover:text-fg"
        >
          <Plus className="size-3.5" aria-hidden="true" />
        </Link>
      )}
    />
  );
}
