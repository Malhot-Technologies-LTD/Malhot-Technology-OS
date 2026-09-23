import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { OrgRole, ProjectRole } from "@/types/domain";

/**
 * Viewer context, resolved once per request (docs/architecture/authorization.md#viewer-context).
 * Roles are never read from the JWT; membership is looked up per request so
 * removing a member takes effect immediately.
 */
export type Viewer = {
  userId: string;
  email: string | null;
  organizationId: string;
  orgRole: OrgRole;
  organization: { id: string; name: string; slug: string };
  profile: { fullName: string; avatarUrl: string | null; title: string | null; timezone: string };
  /**
   * Every project role this person holds. Read here rather than in a second
   * query because `claims.sub` is known before any of these run, so it costs a
   * slot in an existing parallel batch instead of a whole round trip on every
   * page in the OS. The sidebar uses it to decide which sections to show.
   */
  projectRoles: readonly ProjectRole[];
};

export type AuthState =
  | { kind: "anonymous" }
  /** Signed in but not a member of any organisation: show the "no access" screen. */
  | { kind: "no_access"; userId: string; email: string | null }
  | { kind: "member"; viewer: Viewer };

export const getAuthState = cache(async (): Promise<AuthState> => {
  const supabase = await createClient();
  // getClaims verifies the JWT signature locally (JWKS cached) — no auth server round-trip.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return { kind: "anonymous" };

  const userId = claims.sub;
  const email = typeof claims.email === "string" ? claims.email : null;

  const [profileResult, membershipResult, projectRolesResult] = await Promise.all([
    supabase.from("profiles").select("full_name, avatar_url, title, timezone").eq("id", userId).maybeSingle(),
    supabase
      .from("organization_members")
      .select("role, organization:organizations!inner(id, name, slug)")
      .eq("user_id", userId)
      .order("joined_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase.from("project_members").select("role").eq("user_id", userId),
  ]);

  const membership = membershipResult.data;
  const profile = profileResult.data;
  if (!membership || !profile) return { kind: "no_access", userId, email };

  return {
    kind: "member",
    viewer: {
      userId,
      email,
      organizationId: membership.organization.id,
      orgRole: membership.role,
      organization: membership.organization,
      profile: {
        fullName: profile.full_name,
        avatarUrl: profile.avatar_url,
        title: profile.title,
        timezone: profile.timezone,
      },
      // A failed read costs two optional sidebar sections, never the page.
      projectRoles: (projectRolesResult.data ?? []).map((row) => row.role as ProjectRole),
    },
  };
});

/**
 * For pages and Server Actions under /os. Anonymous callers are sent to login;
 * authenticated non-members are sent to /os, where the layout renders the
 * "no organisation access" state.
 */
export async function requireViewer(): Promise<Viewer> {
  const state = await getAuthState();
  if (state.kind === "anonymous") redirect("/login");
  if (state.kind === "no_access") redirect("/os");
  return state.viewer;
}
