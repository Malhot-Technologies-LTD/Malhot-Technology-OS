import { ListChecks } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/os/empty-state";
import { ErrorState } from "@/components/os/error-state";
import { StatusPill } from "@/components/os/status-badge";
import { PlatformBadge } from "@/features/social/components/platform-badge";
import { SocialSetupNotice } from "@/features/social/components/setup-notice";
import { slot } from "@/features/social/format";
import { listSocialAccounts, listSocialPosts } from "@/features/social/queries";
import { POST_FORMAT_LABEL, POST_STATUSES, POST_STATUS_META, type PostStatus } from "@/features/social/schemas";
import { describeQueryFailure } from "@/lib/actions/db-errors";
import { requireViewer } from "@/lib/auth/context";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Posts" };

/** Every post, filtered by where it is in the pipeline. */
export default async function SocialPostsPage({ searchParams }: PageProps<"/os/social/posts">) {
  const [viewer, query] = await Promise.all([requireViewer(), searchParams]);
  const [posts, accounts] = await Promise.all([
    listSocialPosts(viewer.organizationId),
    listSocialAccounts(viewer.organizationId),
  ]);
  if (posts.missing || accounts.missing) return <SocialSetupNotice />;
  const failure = posts.error ?? accounts.error;
  if (failure) return <ErrorState {...describeQueryFailure(failure)} />;

  const filter = POST_STATUSES.find((status) => status === query.status) ?? null;
  const shown = filter ? posts.data.filter((post) => post.status === filter) : posts.data;
  const count = (status: PostStatus) => posts.data.filter((post) => post.status === status).length;
  const timeZone = viewer.profile.timezone || "UTC";
  const byId = new Map(accounts.data.map((account) => [account.id, account]));

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Filter by status" className="flex flex-wrap gap-1.5">
        {[null, ...POST_STATUSES].map((status) => {
          const active = status === filter;
          return (
            <Link
              key={status ?? "all"}
              href={status ? `/os/social/posts?status=${status}` : "/os/social/posts"}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors",
                active
                  ? "border-fg bg-fg text-bg"
                  : "border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg",
              )}
            >
              {status ? POST_STATUS_META[status].label : "All"}
              <span className="tabular-nums opacity-70">{status ? count(status) : posts.data.length}</span>
            </Link>
          );
        })}
      </nav>

      {shown.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={filter ? `No ${POST_STATUS_META[filter].label.toLowerCase()} posts` : "No posts yet"}
          description="Plan a post with New post, or from a day on the calendar."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="border-b border-border bg-bg-subtle text-left text-xs text-fg-subtle">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Post
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Goes out
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Channels
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((post) => (
                <tr key={post.id} className="relative hover:bg-bg-subtle/60">
                  <td className="max-w-[26rem] px-4 py-3">
                    <Link
                      href={`/os/social/posts/${post.id}`}
                      className="block truncate font-medium after:absolute after:inset-0 hover:underline"
                    >
                      {post.title}
                    </Link>
                    <span className="block truncate text-xs text-fg-subtle">
                      {POST_FORMAT_LABEL[post.format]}
                      {post.pillar ? ` · ${post.pillar}` : ""}
                      {post.caption ? ` · ${post.caption}` : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill tone={POST_STATUS_META[post.status].tone}>
                      {POST_STATUS_META[post.status].label}
                    </StatusPill>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-fg-muted">
                    {post.status === "published" && post.published_at
                      ? slot(post.published_at, timeZone)
                      : post.scheduled_at
                        ? slot(post.scheduled_at, timeZone)
                        : "Not dated"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex flex-col gap-1">
                      {post.channels.length === 0 ? (
                        <span className="text-fg-subtle">—</span>
                      ) : (
                        post.channels.map((channel) => {
                          const account = byId.get(channel.account_id);
                          return account ? (
                            <PlatformBadge
                              key={channel.account_id}
                              platform={account.platform}
                              handle={account.handle}
                            />
                          ) : null;
                        })
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
