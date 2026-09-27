import { Plus, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/os/empty-state";
import { ErrorState } from "@/components/os/error-state";
import { Button } from "@/components/ui/button";
import { SocialOverview } from "@/features/social/components/overview";
import { SocialSetupNotice } from "@/features/social/components/setup-notice";
import { listSocialAccounts, listSocialPosts } from "@/features/social/queries";
import { describeQueryFailure } from "@/lib/actions/db-errors";
import { requireViewer } from "@/lib/auth/context";
import { requestTime } from "@/lib/request-time";

export const metadata: Metadata = { title: "Overview" };

/** Social → Overview: loads the rows, then SocialOverview draws the dashboard. */
export default async function SocialOverviewPage() {
  const viewer = await requireViewer();
  const [posts, accounts] = await Promise.all([
    listSocialPosts(viewer.organizationId),
    listSocialAccounts(viewer.organizationId),
  ]);
  if (posts.missing || accounts.missing) return <SocialSetupNotice />;
  const failure = posts.error ?? accounts.error;
  if (failure) return <ErrorState {...describeQueryFailure(failure)} />;

  if (posts.data.length === 0 && accounts.data.length === 0) {
    return (
      <EmptyState
        icon={UsersRound}
        title="Start with the company's accounts"
        description="Add each account Malhot runs (Instagram, LinkedIn, X, TikTok…). Then plan posts for them on the calendar, and this page tracks what goes out."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href="/os/social/accounts/new">
                <Plus aria-hidden="true" /> Add an account
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/os/social/posts/new">Plan a post</Link>
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <SocialOverview
      posts={posts.data}
      accounts={accounts.data}
      now={requestTime()}
      timeZone={viewer.profile.timezone || "UTC"}
    />
  );
}
