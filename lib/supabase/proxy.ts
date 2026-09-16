import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env";

/**
 * Refreshes the Supabase session cookie on every matched request and applies
 * cheap redirects. Authorisation is NOT decided here (docs/architecture/authentication-architecture.md).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getClaims validates the JWT locally (no network round-trip for a fresh token)
  // and refreshes it when expired, writing new cookies through setAll above.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);

  const { pathname, search } = request.nextUrl;
  const isOsRoute = pathname === "/os" || pathname.startsWith("/os/");
  const isLoginRoute = pathname === "/login";

  if (isOsRoute && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (isLoginRoute && isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/os";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
