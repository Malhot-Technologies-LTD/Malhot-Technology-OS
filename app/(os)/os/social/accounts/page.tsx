import { ExternalLink, Plus, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { formatDate } from "@/components/os/data-display";
import { EmptyState } from "@/components/os/empty-state";
import { ErrorState } from "@/components/os/error-state";
import { StatusPill } from "@/components/os/status-badge";
import { Button } from "@/components/ui/button";
import { PlatformBadge } from "@/features/social/components/platform-badge";
import { SocialSetupNotice } from "@/features/social/components/setup-notice";
import { compactNumber, quietFor } from "@/features/social/format";
import { listSocialAccounts, listSocialPosts } from "@/features/social/queries";
import { ACCOUNT_STATUS_META } from "@/features/social/schemas";
import { computeSocialStats } from "@/features/social/stats";
import { describeQueryFailure } from "@/lib/actions/db-errors";
import { requireViewer } from "@/lib/auth/context";
import { requestTime } from "@/lib/request-time";

export const metadata: Metadata = { title: "Accounts" };

/**
 * The company's accounts on every platform. The OS keeps the handle, link and
 * follower count; logins stay in the password manager.
 */
export default async function SocialAccountsPage() {
  const viewer = await requireViewer();
  const [accounts, posts] = await Promise.all([
    listSocialAccounts(viewer.organizationId),
    listSocialPosts(viewer.organizationId),
  ]);
  if (accounts.missing || posts.missing) return <SocialSetupNotice />;
  const failure = accounts.error ?? posts.error;
  if (failure) return <ErrorState {...describeQueryFailure(failure)} />;

  const addButton = (
    <Button asChild>
      <Link href="/os/social/accounts/new">
        <Plus aria-hidden="true" /> Add account
      </Link>
    </Button>
  );

  if (accounts.data.length === 0) {
    return (
      <EmptyState
        icon={UsersRound}
        title="No accounts yet"
        description="List every account the company runs, so posts can be planned for them and quiet ones stand out."
        action={addButton}
      />
    );
  }

  const { accounts: rows } = computeSocialStats(
    posts.data,
    accounts.data,
    requestTime(),
    viewer.profile.timezone || "UTC",
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">
          {rows.length} {rows.length === 1 ? "account" : "accounts"}. Passwords never go here: keep them in the company
          password manager.
        </p>
        {addButton}
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[48rem] text-sm">
          <thead className="border-b border-border bg-bg-subtle text-left text-xs text-fg-subtle">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Account
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Status
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">
                Followers
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">
                Posts, 30 days
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Last post
              </th>
              <th scope="col" className="px-4 py-2.5">
                <span className="sr-only">Profile</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((account) => (
              <tr key={account.id} className="hover:bg-bg-subtle/60">
                <td className="px-4 py-3">
                  <Link href={`/os/social/accounts/${account.id}`} className="hover:underline">
                    <PlatformBadge platform={account.platform} handle={account.handle} />
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {account.quiet ? (
                    <StatusPill tone="warning">Quiet</StatusPill>
                  ) : (
                    <StatusPill tone={ACCOUNT_STATUS_META[account.status].tone}>
                      {ACCOUNT_STATUS_META[account.status].label}
                    </StatusPill>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {account.followers === null ? (
                    <span className="text-fg-subtle">—</span>
                  ) : (
                    <span
                      title={
                        account.followers_updated_at ? `Updated ${formatDate(account.followers_updated_at)}` : undefined
                      }
                    >
                      {compactNumber(account.followers)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{account.published30d}</td>
                <td className="px-4 py-3 text-fg-muted">{quietFor(account.daysQuiet)}</td>
                <td className="px-4 py-3 text-right">
                  {account.profile_url ? (
                    <Button asChild variant="ghost" size="icon-sm">
                      <a
                        href={account.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open @${account.handle}`}
                      >
                        <ExternalLink aria-hidden="true" />
                      </a>
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
