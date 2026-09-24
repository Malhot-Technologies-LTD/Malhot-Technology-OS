import { getAuthState } from "@/lib/auth/context";

/**
 * Who is signed in, for the public site's navbar.
 *
 * The site header wants to say "Dashboard" to someone who is already signed in
 * and "Sign in" to everyone else. That is the only reason it needs identity,
 * and it is not worth making the entire marketing site dynamic for: reading the
 * session in `app/(marketing)/layout.tsx` would opt every page underneath out
 * of prerendering and put a Supabase round trip in front of the homepage.
 *
 * So the pages stay static and the navbar asks here once after hydration. The
 * response is deliberately thin — a display name and nothing else. Anything
 * more would be a profile endpoint reachable from an unauthenticated origin,
 * and the navbar has no use for it.
 *
 * `no-store`, because the answer is per-user and a shared cache in front of
 * this would hand one person's name to the next visitor.
 */
export async function GET() {
  const state = await getAuthState();

  const user =
    state.kind === "member" ? { name: state.viewer.profile.fullName, email: state.viewer.email ?? "" } : null;

  return Response.json({ user }, { headers: { "Cache-Control": "no-store" } });
}
