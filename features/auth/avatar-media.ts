import { publicEnv } from "@/lib/env";

import { AVATAR_PUBLIC_PREFIX } from "./avatar";

/**
 * Building a public avatar URL needs the project host, and reading `lib/env.ts`
 * throws when it is absent — so this is kept out of avatar.ts, whose helpers
 * stay pure and testable. Mirrors features/showcase/media.ts.
 */
export function avatarUrl(path: string): string {
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}${AVATAR_PUBLIC_PREFIX}${path}`;
}
