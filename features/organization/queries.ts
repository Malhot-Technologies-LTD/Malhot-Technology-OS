import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { OrgRole } from "@/types/domain";

export type MemberRow = {
  user_id: string;
  role: OrgRole;
  joined_at: string;
  profile: { full_name: string; title: string | null; avatar_url: string | null } | null;
};

/** Everyone in the organisation. RLS shows members only to other members. */
export async function listMembers(organizationId: string) {
  const supabase = await createClient();
  return (
    supabase
      .from("organization_members")
      // The foreign key is named even though organization_members reaches
      // profiles only once today. Naming it costs nothing and survives the day
      // someone adds an invited_by; an ambiguous embed fails the whole query.
      .select(
        "user_id, role, joined_at, profile:profiles!organization_members_user_id_fkey(full_name, title, avatar_url)",
      )
      .eq("organization_id", organizationId)
      .order("joined_at")
      .returns<MemberRow[]>()
  );
}
