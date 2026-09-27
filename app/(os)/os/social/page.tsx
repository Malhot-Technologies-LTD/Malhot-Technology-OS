import { Plus, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/os/empty-state";
import { ErrorState } from "@/components/os/error-state";
import { Button } from "@/components/ui/button";
import { SocialOverview } from "@/features/social/components/overview";
import { SocialSetupNotice } from "@/features/social/components/setup-notice";
import { InstagramOverview } from "@/features/social/components/instagram-overview";
import {
  listConnections,
  listMediaStats,
  listSnapshots,
  listSocialAccounts,
  listSocialPosts,
} from "@/features/social/queries";
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

  const now = requestTime();
  const timeZone = viewer.profile.timezone || "UTC";
  // Synced figures, when any account is connected. Missing tables read as "none connected".
  const connections = await listConnections(viewer.organizationId);
  const connectedIds = connections.data.map((row) => row.account_id);
  const [snapshots, media] =
    connectedIds.length > 0
      ? await Promise.all([
          listSnapshots(viewer.organizationId, new Date(now - 31 * 86_400_000).toISOString().slice(0, 10)),
          listMediaStats(viewer.organizationId, new Date(now - 30 * 86_400_000).toISOString()),
        ])
      : [null, null];

  return (
    <div className="flex flex-col gap-10">
      <SocialOverview posts={posts.data} accounts={accounts.data} now={now} timeZone={timeZone} />
      {connectedIds.length > 0 ? (
        <InstagramOverview
          accounts={accounts.data}
          connectedIds={connectedIds}
          snapshots={snapshots?.data ?? []}
          media={media?.data ?? []}
          now={now}
          timeZone={timeZone}
        />
      ) : null}
    </div>
  );
}
