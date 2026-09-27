import { NextResponse, type NextRequest } from "next/server";

import { exchangeCode, getProfile, InstagramError, toLongLived } from "@/features/social/instagram/api";
import { CALLBACK_PATH, STATE_COOKIE, checkState, redirectUri } from "@/features/social/instagram/oauth";
import { syncInstagram } from "@/features/social/instagram/sync";
import { getAuthState } from "@/lib/auth/context";
import { seal } from "@/lib/crypto/secret-box";
import { requireServerEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { can } from "@/lib/permissions";
import { getConnection, saveConnection } from "@/lib/supabase/elevated/social-connections";
import { createClient } from "@/lib/supabase/server";

// The first sync runs before the redirect so the page opens with figures on it.
export const maxDuration = 60;

/**
 * Where Instagram sends the browser after login. Verifies the state against
 * the cookie set by /connect, trades the code for a 60-day token, encrypts it,
 * stores it, runs the first sync and returns to the account's page with the
 * outcome in `?instagram=`.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const accountId = checkState(request.cookies.get(STATE_COOKIE)?.value, params.get("state"));

  const finish = (path: string) => {
    const response = NextResponse.redirect(new URL(path, request.url));
    response.cookies.set(STATE_COOKIE, "", { path: CALLBACK_PATH, maxAge: 0 });
    return response;
  };
  if (!accountId) return finish("/os/social/accounts?instagram=expired");
  const accountPage = `/os/social/accounts/${accountId}`;

  // The person said no on Instagram's screen.
  if (params.get("error") || !params.get("code")) return finish(`${accountPage}?instagram=denied`);

  const state = await getAuthState();
  if (state.kind !== "member" || !can(state.viewer, "social.manage")) return finish("/os");
  const viewer = state.viewer;

  const supabase = await createClient();
  const { data: account } = await supabase
    .from("social_accounts")
    .select("id, platform")
    .eq("organization_id", viewer.organizationId)
    .eq("id", accountId)
    .maybeSingle();
  if (!account || account.platform !== "instagram") return finish(`${accountPage}?instagram=not_instagram`);

  try {
    const appId = requireServerEnv("INSTAGRAM_APP_ID");
    const appSecret = requireServerEnv("INSTAGRAM_APP_SECRET");
    const key = requireServerEnv("SOCIAL_TOKEN_KEY");

    const short = await exchangeCode({ appId, appSecret, redirectUri: redirectUri(), code: params.get("code")! });
    const long = await toLongLived(appSecret, short.accessToken);
    const profile = await getProfile(long.accessToken);

    const saved = await saveConnection({
      organizationId: viewer.organizationId,
      accountId: account.id,
      externalUserId: profile.userId || short.userId,
      username: profile.username || null,
      sealedToken: seal(long.accessToken, key),
      expiresAt: long.expiresAt,
      scopes: short.permissions,
      connectedBy: viewer.userId,
    });
    if (!saved.ok) return finish(`${accountPage}?instagram=save_failed`);

    const connection = await getConnection(viewer.organizationId, account.id);
    const first = connection ? await syncInstagram(connection) : null;
    return finish(`${accountPage}?instagram=${first?.ok ? "connected" : "connected_sync_failed"}`);
  } catch (error) {
    if (!(error instanceof InstagramError)) logger.error("social.instagram_connect_failed", { error: String(error) });
    else logger.warn("social.instagram_connect_refused", { kind: error.kind, message: error.message });
    return finish(`${accountPage}?instagram=failed`);
  }
}
