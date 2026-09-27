import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageBody, PageHeader } from "@/components/os/page-header";
import { Button } from "@/components/ui/button";
import { SocialTabs } from "@/features/social/components/social-tabs.client";
import { requireViewer } from "@/lib/auth/context";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: { template: "%s · Social", default: "Social" } };

/**
 * Social media (docs/features/social.md): org admins and members holding the
 * social media duty. Anyone else gets a 404 rather than a hint that it exists;
 * RLS refuses them the rows regardless.
 */
export default async function SocialLayout({ children }: LayoutProps<"/os/social">) {
  const viewer = await requireViewer();
  if (!can(viewer, "social.manage")) notFound();

  return (
    <PageBody>
      <PageHeader
        title="Social media"
        description={`Plan posts and run ${viewer.organization.name}'s accounts on every platform`}
        actions={
          <Button asChild>
            <Link href="/os/social/posts/new">
              <Plus aria-hidden="true" /> New post
            </Link>
          </Button>
        }
      />
      <div className="flex flex-col gap-6">
        <SocialTabs />
        {children}
      </div>
    </PageBody>
  );
}
