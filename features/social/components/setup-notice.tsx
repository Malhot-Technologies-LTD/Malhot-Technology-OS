import { DatabaseZap } from "lucide-react";

import { EmptyState } from "@/components/os/empty-state";

/** Shown in place of a Social page until the social media migration is applied. */
export function SocialSetupNotice() {
  return (
    <EmptyState
      icon={DatabaseZap}
      title="Social media needs a one-time database update"
      description="An admin needs to run supabase/migrations/20260927150000_social_media.sql in the Supabase SQL editor (or supabase db push). Then this page fills in. Nothing else in the OS is affected."
    />
  );
}
