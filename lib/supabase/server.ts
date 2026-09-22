import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { publicEnv } from "@/lib/env";

import { fetchWithTimeout } from "./fetch-timeout";
import type { Database } from "@/types/database";

/**
 * User-scoped Supabase client for Server Components, Server Actions and
 * Route Handlers. Runs with the caller's session, so Row Level Security applies.
 *
 * Cookie writes are attempted; Server Components cannot set cookies, which is
 * fine because proxy.ts refreshes the session before rendering.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      // Without this a hosted-project outage blocks the render for ~22s.
      global: { fetch: fetchWithTimeout },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component: cookies are read-only there.
          }
        },
      },
    },
  );
}
