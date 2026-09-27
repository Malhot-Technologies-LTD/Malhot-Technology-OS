import { DatabaseZap } from "lucide-react";

import { EmptyState } from "@/components/os/empty-state";

/** Shown in place of a Social page (or panel) until its migration is applied. */
export function SocialSetupNotice({ migration = "20260927150000_social_media.sql" }: { migration?: string }) {
  return (
    <EmptyState
      icon={DatabaseZap}
      title="Social media needs a one-time database update"
      description={`An admin needs to run supabase/migrations/${migration} in the Supabase SQL editor (or supabase db push). Then this fills in. Nothing else in the OS is affected.`}
    />
  );
}
