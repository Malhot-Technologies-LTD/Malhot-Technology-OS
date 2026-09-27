import type { Metadata } from "next";

import { ErrorState } from "@/components/os/error-state";
import { Panel } from "@/components/os/panel";
import { PostForm } from "@/features/social/components/post-form.client";
import { SocialSetupNotice } from "@/features/social/components/setup-notice";
import { pillarsOf } from "@/features/social/format";
import { listSocialAccounts, listSocialPosts } from "@/features/social/queries";
import { describeQueryFailure } from "@/lib/actions/db-errors";
import { requireViewer } from "@/lib/auth/context";

export const metadata: Metadata = { title: "New post" };

export default async function NewSocialPostPage({ searchParams }: PageProps<"/os/social/posts/new">) {
  const [viewer, query] = await Promise.all([requireViewer(), searchParams]);
  const [accounts, posts] = await Promise.all([
    listSocialAccounts(viewer.organizationId),
    listSocialPosts(viewer.organizationId),
  ]);
  if (accounts.missing || posts.missing) return <SocialSetupNotice />;
  const failure = accounts.error ?? posts.error;
  if (failure) return <ErrorState {...describeQueryFailure(failure)} />;

  // From the calendar's "plan a post on this day".
  const date = typeof query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? query.date : undefined;
  return (
    <Panel title="Plan a post" description="Only the working title is required; fill in the rest as it takes shape.">
      <PostForm
        accounts={accounts.data}
        defaultDate={date}
        pillars={pillarsOf(posts.data)}
        timeZone={viewer.profile.timezone || "UTC"}
      />
    </Panel>
  );
}
