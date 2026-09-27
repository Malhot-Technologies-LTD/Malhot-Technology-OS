import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { authorizeUrl } from "@/features/social/instagram/api";
import {
  CALLBACK_PATH,
  STATE_COOKIE,
  STATE_MAX_AGE,
  newStateCookie,
  redirectUri,
} from "@/features/social/instagram/oauth";
import { getAuthState } from "@/lib/auth/context";
import { serverEnv } from "@/lib/env";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

/**
 * Social → Accounts → "Connect Instagram": checks who is asking and which
 * account, then sends the browser to Instagram's login with a one-time state.
 */
export async function GET(request: NextRequest) {
  const back = (path: string) => NextResponse.redirect(new URL(path, request.url));
  const accountId = z.uuid().safeParse(request.nextUrl.searchParams.get("account"));
  if (!accountId.success) return back("/os/social/accounts");

  const state = await getAuthState();
  if (state.kind !== "member") return back("/login?next=%2Fos%2Fsocial%2Faccounts");
  if (!can(state.viewer, "social.manage")) return back("/os");

  const accountPage = `/os/social/accounts/${accountId.data}`;
  const { INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, SOCIAL_TOKEN_KEY } = serverEnv();
  if (!INSTAGRAM_APP_ID || !INSTAGRAM_APP_SECRET || !SOCIAL_TOKEN_KEY)
    return back(`${accountPage}?instagram=not_configured`);

  // RLS answers for the organisation and the duty; the platform check is ours.
  const supabase = await createClient();
  const { data: account } = await supabase
    .from("social_accounts")
    .select("id, platform")
    .eq("organization_id", state.viewer.organizationId)
    .eq("id", accountId.data)
    .maybeSingle();
  if (!account || account.platform !== "instagram") return back(`${accountPage}?instagram=not_instagram`);

  const { state: oauthState, value } = newStateCookie(account.id);
  const response = NextResponse.redirect(
    authorizeUrl({ appId: INSTAGRAM_APP_ID, redirectUri: redirectUri(), state: oauthState }),
  );
  response.cookies.set(STATE_COOKIE, value, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: CALLBACK_PATH,
    maxAge: STATE_MAX_AGE,
  });
  return response;
}
