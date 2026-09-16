import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/os/empty-state";
import { PageBody, PageHeader } from "@/components/os/page-header";
import { Button } from "@/components/ui/button";
import { requireViewer } from "@/lib/auth/context";

export const metadata: Metadata = { title: "Home" };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Dashboard shell. Widgets arrive with their features (docs/features/dashboard.md). */
export default async function DashboardPage({ searchParams }: PageProps<"/os">) {
  const [viewer, params] = await Promise.all([requireViewer(), searchParams]);
  const justJoined = first(params.welcome) === "1";
  const firstName = viewer.profile.fullName.split(" ")[0];
  const greeting = firstName ? `Welcome, ${firstName}` : "Welcome";

  return (
    <PageBody>
      <PageHeader
        title={justJoined ? `${greeting} to ${viewer.organization.name}` : greeting}
        description={
          justJoined ? "You are in. Take a minute to complete your profile so teammates recognise you." : undefined
        }
        actions={
          justJoined || !viewer.profile.fullName ? (
            <Button asChild>
              <Link href="/os/settings/profile">Complete profile</Link>
            </Button>
          ) : undefined
        }
      />
      <EmptyState
        icon={LayoutDashboard}
        title="Nothing needs your attention yet"
        description="Projects, tasks and notifications will appear here as the team starts working."
      />
    </PageBody>
  );
}
