import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";

/**
 * Re-authenticates the signed-in user against their current password
 * (docs/architecture/authentication-architecture.md#changing-a-password).
 *
 * Deliberately built on a throwaway client: it uses the publishable key, never
 * persists a session and never touches cookies, so a successful check cannot
 * disturb the caller's own session. Rate limiting is Supabase Auth's.
 */
export async function verifyPassword(email: string, password: string): Promise<{ ok: boolean; code?: string }> {
  const supabase = createSupabaseClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    },
  );
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (!error) {
    // Drop the just-minted refresh token; it lives only in this client's memory.
    await supabase.auth.signOut({ scope: "local" });
    return { ok: true };
  }
  return { ok: false, code: error.code };
}
