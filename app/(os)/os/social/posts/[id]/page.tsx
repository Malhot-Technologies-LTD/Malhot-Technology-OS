import { ChevronLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ErrorState } from "@/components/os/error-state";
import { Panel } from "@/components/os/panel";
import { StatusPill } from "@/components/os/status-badge";
import { Button } from "@/components/ui/button";
import { AdvanceStatusButton, PublishedLinks } from "@/features/social/components/post-actions.client";
import { PostForm } from "@/features/social/components/post-form.client";
import { SocialSetupNotice } from "@/features/social/components/setup-notice";
import { pillarsOf, slot } from "@/features/social/format";
import { getSocialPost, listSocialAccounts, listSocialPosts } from "@/features/social/queries";
import { POST_STATUSES, POST_STATUS_META } from "@/features/social/schemas";
import { describeQueryFailure } from "@/lib/actions/db-errors";
import { requireViewer } from "@/lib/auth/context";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Post" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One post: where it is in the pipeline, the editor, and its live links once out. */
export default async function SocialPostPage({ params }: PageProps<"/os/social/posts/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const viewer = await requireViewer();
  const [post, accounts, posts] = await Promise.all([
    getSocialPost(viewer.organizationId, id),
    listSocialAccounts(viewer.organizationId),
    listSocialPosts(viewer.organizationId),
  ]);
  if (post.missing || accounts.missing) return <SocialSetupNotice />;
  const failure = post.error ?? accounts.error ?? posts.error;
  if (failure) return <ErrorState {...describeQueryFailure(failure)} />;
  if (!post.data) notFound();

  const current = post.data;
  const timeZone = viewer.profile.timezone || "UTC";
  const step = POST_STATUSES.indexOf(current.status);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Link
            href="/os/social/posts"
            className="inline-flex w-fit items-center gap-1 text-sm text-fg-muted hover:text-fg hover:underline"
          >
            <ChevronLeft className="size-4" aria-hidden="true" /> All posts
          </Link>
          <h2 className="text-2xl font-semibold tracking-tight">{current.title}</h2>
          <p className="flex flex-wrap items-center gap-2 text-[13px] text-fg-subtle">
            <StatusPill tone={POST_STATUS_META[current.status].tone}>
              {POST_STATUS_META[current.status].label}
            </StatusPill>
            {current.status === "published" && current.published_at
              ? `Went out ${slot(current.published_at, timeZone)}`
              : current.scheduled_at
                ? `Goes out ${slot(current.scheduled_at, timeZone)}`
                : "No date yet"}
            {current.owner ? ` · planned by ${current.owner.full_name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {current.asset_url ? (
            <Button asChild variant="outline">
              <a href={current.asset_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden="true" /> Open artwork
              </a>
            </Button>
          ) : null}
          <AdvanceStatusButton postId={current.id} status={current.status} />
        </div>
      </div>

      <ol aria-label="Pipeline" className="grid grid-cols-5 gap-1.5">
        {POST_STATUSES.map((status, index) => (
          <li key={status} className="flex flex-col gap-1.5">
            <span
              aria-hidden="true"
              className={cn("h-1.5 rounded-full", index <= step ? "bg-brand" : "bg-bg-subtle")}
            />
            <span
              className={cn("text-xs", index === step ? "font-medium text-fg" : "text-fg-subtle")}
              aria-current={index === step ? "step" : undefined}
            >
              {POST_STATUS_META[status].label}
            </span>
          </li>
        ))}
      </ol>

      {current.status === "published" && current.channels.length > 0 ? (
        <Panel title="Live links" description="Paste where the post went live on each channel.">
          <PublishedLinks postId={current.id} channels={current.channels} accounts={accounts.data} />
        </Panel>
      ) : null}

      <Panel title="Details">
        <PostForm
          key={current.updated_at}
          accounts={accounts.data}
          post={current}
          pillars={pillarsOf(posts.data)}
          timeZone={timeZone}
        />
      </Panel>
    </div>
  );
}
