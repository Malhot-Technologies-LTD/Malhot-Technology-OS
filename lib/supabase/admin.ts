import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { publicEnv, requireServerEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Service-role client. Bypasses Row Level Security.
 *
 * Allowed callers are listed in docs/architecture/backend-architecture.md
 * (invitation acceptance, enquiry insert, webhooks, cron, bootstrap). Never import
 * this from a Server Action's main path or from anything under features/*
 * except the elevated functions documented there. Enforced by ESLint.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, requireServerEnv("SUPABASE_SECRET_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
