import "server-only";

import { createClient } from "@/lib/supabase/server";

export type InquiryRow = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string;
  budget_range: string | null;
  source_path: string | null;
  handled_at: string | null;
  created_at: string;
  handled_by: { full_name: string } | null;
};

/** Newest first; RLS returns rows only to organisation admins. */
export async function listInquiries(organizationId: string, limit = 50) {
  const supabase = await createClient();
  return supabase
    .from("inquiries")
    .select(
      "id, name, email, company, message, budget_range, source_path, handled_at, created_at, handled_by:profiles(full_name)",
    )
    .eq("organization_id", organizationId)
    .order("handled_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<InquiryRow[]>();
}
