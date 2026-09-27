import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ErrorState } from "@/components/os/error-state";
import { Panel } from "@/components/os/panel";
import { AccountForm } from "@/features/social/components/account-form.client";
import { PlatformBadge } from "@/features/social/components/platform-badge";
import { SocialSetupNotice } from "@/features/social/components/setup-notice";
import { getSocialAccount } from "@/features/social/queries";
import { describeQueryFailure } from "@/lib/actions/db-errors";
import { requireViewer } from "@/lib/auth/context";

export const metadata: Metadata = { title: "Account" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SocialAccountPage({ params }: PageProps<"/os/social/accounts/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const viewer = await requireViewer();
  const account = await getSocialAccount(viewer.organizationId, id);
  if (account.missing) return <SocialSetupNotice />;
  if (account.error) return <ErrorState {...describeQueryFailure(account.error)} />;
  if (!account.data) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/os/social/accounts"
        className="inline-flex w-fit items-center gap-1 text-sm text-fg-muted hover:text-fg hover:underline"
      >
        <ChevronLeft className="size-4" aria-hidden="true" /> All accounts
      </Link>
      <Panel
        title="Edit account"
        action={<PlatformBadge platform={account.data.platform} handle={account.data.handle} />}
      >
        <AccountForm key={account.data.id} account={account.data} />
      </Panel>
    </div>
  );
}
