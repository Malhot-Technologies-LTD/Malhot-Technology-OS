import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

/**
 * Everything except static assets, images and common public files.
 *
 * The extension group needs `\\.` and not `\.`: this is a JavaScript string,
 * not a regex literal, and `\.` is not a recognised escape so the backslash is
 * dropped before the matcher ever sees it. That left `.` meaning "any
 * character", which quietly excluded real routes — `/os/mysvg` matched the
 * asset pattern and was skipped, so no session refresh ran for it.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|txt|xml)$).*)"],
};
