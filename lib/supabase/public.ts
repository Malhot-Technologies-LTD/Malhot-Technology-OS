import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";

import { fetchWithTimeout } from "./fetch-timeout";
import type { Database } from "@/types/database";

/**
 * Anonymous, cookie-less client for the public website. Runs as `anon`, so RLS
 * shows it only what a visitor may see (published showcases and their photos).
 *
 * Reading no cookies is what keeps the marketing pages static. Every request is
 * cached by Next.js under `tags`, so a Server Action that changes the data calls
 * `updateTag()` with the same tag and the next visitor gets fresh pages. Only
 * 200 responses are cached; a failed read is retried on the next request.
 *
 * `revalidate` is a backstop for writes made outside the app (the SQL editor, a
 * script): they appear within the hour even though nothing called `updateTag`.
 */
export function createPublicClient(tags: string[]) {
  return createSupabaseClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: {
        fetch: (input, init) =>
          fetchWithTimeout(input, { ...init, cache: "force-cache", next: { tags, revalidate: 3600 } }),
      },
    },
  );
}
