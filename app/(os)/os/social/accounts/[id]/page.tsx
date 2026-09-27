import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ErrorState } from "@/components/os/error-state";
import { Panel } from "@/components/os/panel";
import { AccountForm } from "@/features/social/components/account-form.client";
import { InstagramConnection, OutcomeBanner } from "@/features/social/components/instagram-connection";
import { PlatformBadge } from "@/features/social/components/platform-badge";
import { SocialSetupNotice } from "@/features/social/components/setup-notice";
import { getSocialAccount, listConnections, listMediaStats } from "@/features/social/queries";
import { describeQueryFailure } from "@/lib/actions/db-errors";
import { requireViewer } from "@/lib/auth/context";
import { serverEnv } from "@/lib/env";
import { requestTime } from "@/lib/request-time";

export const metadata: Metadata = { title: "Account" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = 86_400_000;

export default async function SocialAccountPage({ params, searchParams }: PageProps<"/os/social/accounts/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();
  const viewer = await requireViewer();
  const account = await getSocialAccount(viewer.organizationId, id);
  if (account.missing) return <SocialSetupNotice />;
  if (account.error) return <ErrorState {...describeQueryFailure(account.error)} />;
  if (!account.data) notFound();

  const now = requestTime();
  const isInstagram = account.data.platform === "instagram";
  // Before the connections migration runs these read as empty, and the panel offers to connect.
  const [connections, media] = isInstagram
    ? await Promise.all([
        listConnections(viewer.organizationId),
        listMediaStats(viewer.organizationId, new Date(now - 90 * DAY).toISOString()),
      ])
    : [null, null];
  const env = serverEnv();
  const configured = Boolean(env.INSTAGRAM_APP_ID && env.INSTAGRAM_APP_SECRET && env.SOCIAL_TOKEN_KEY);

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/os/social/accounts"
        className="inline-flex w-fit items-center gap-1 text-sm text-fg-muted hover:text-fg hover:underline"
      >
        <ChevronLeft className="size-4" aria-hidden="true" /> All accounts
      </Link>
      <OutcomeBanner
        outcome={typeof query.instagram === "string" ? query.instagram : undefined}
        step={typeof query.step === "string" ? query.step : undefined}
        detail={typeof query.detail === "string" ? query.detail : undefined}
      />
      {isInstagram ? (
        connections?.missing ? (
          <SocialSetupNotice migration="20260927170000_social_connections.sql" />
        ) : (
          <InstagramConnection
            accountId={account.data.id}
            handle={account.data.handle}
            connection={connections?.data.find((row) => row.account_id === account.data!.id) ?? null}
            media={(media?.data ?? []).filter((row) => row.account_id === account.data!.id)}
            configured={configured}
            timeZone={viewer.profile.timezone || "UTC"}
            now={now}
          />
        )
      ) : null}
      <Panel
        title="Edit account"
        action={<PlatformBadge platform={account.data.platform} handle={account.data.handle} />}
      >
        <AccountForm key={account.data.id} account={account.data} />
      </Panel>
    </div>
  );
}
