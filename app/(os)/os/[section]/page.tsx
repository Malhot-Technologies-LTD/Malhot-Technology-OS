import { Construction } from "lucide-react";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/os/empty-state";
import { PLANNED_SECTIONS } from "@/components/os/nav";
import { PageBody, PageHeader } from "@/components/os/page-header";
import { requireViewer } from "@/lib/auth/context";

/**
 * Placeholder for navigation sections delivered in later phases
 * (docs/planning/implementation-phases.md). Static routes take precedence, so
 * each real page replaces its placeholder simply by existing.
 */
export default async function PlannedSectionPage({ params }: PageProps<"/os/[section]">) {
  const { section } = await params;
  const planned = PLANNED_SECTIONS[section];
  if (!planned) notFound();
  await requireViewer();

  return (
    <PageBody>
      <PageHeader title={planned.label} />
      <EmptyState
        icon={Construction}
        title={`${planned.label} is not built yet`}
        description={`This section is scheduled for phase ${planned.phase} of the build.`}
      />
    </PageBody>
  );
}
