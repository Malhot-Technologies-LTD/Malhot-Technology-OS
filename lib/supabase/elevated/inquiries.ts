import "server-only";

import { mapDbError } from "@/lib/actions/db-errors";
import type { ActionError } from "@/lib/actions/result";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * Elevated: website visitors have no session, so the insert runs through the
 * admin client into `submit_inquiry()`, which applies the per-IP rate limit
 * atomically (docs/architecture/backend-architecture.md, elevated operations).
 */
export async function createInquiry(input: {
  name: string;
  email: string;
  company: string | null;
  message: string;
  budgetRange: string | null;
  sourcePath: string | null;
  ipHash: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: ActionError }> {
  const admin = createAdminClient();
  // Generated arg types are non-null `text`; Postgres accepts SQL NULL for the optional columns.
  const { data, error } = await admin.rpc("submit_inquiry", {
    p_name: input.name,
    p_email: input.email,
    p_company: input.company as string,
    p_message: input.message,
    p_budget_range: input.budgetRange as string,
    p_source_path: input.sourcePath as string,
    p_ip_hash: input.ipHash as string,
  });
  if (error) {
    const mapped = mapDbError(error);
    if (mapped.code !== "rate_limited")
      logger.error("inquiry.create_failed", { code: error.code, message: error.message });
    return { ok: false, error: mapped };
  }
  return { ok: true, id: data };
}
