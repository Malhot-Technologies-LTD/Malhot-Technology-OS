import "server-only";

import { randomBytes, timingSafeEqual } from "node:crypto";

import { siteUrl } from "@/lib/env";

/**
 * The login round trip's bookkeeping. `state` ties Instagram's redirect back
 * to the browser that started it (an httpOnly cookie no other site can set or
 * read), which is what stops someone from attaching their own Instagram to our
 * account by sending a staff member a crafted callback link.
 */

export const STATE_COOKIE = "ig_oauth";
export const STATE_MAX_AGE = 600;
export const CALLBACK_PATH = "/api/integrations/instagram/callback";

/** Registered in the Meta app as the OAuth redirect URI; must match exactly. */
export function redirectUri(): string {
  return new URL(CALLBACK_PATH, siteUrl).toString();
}

/** `<state>.<accountId>`: what the connect route stores and the callback checks. */
export function newStateCookie(accountId: string): { state: string; value: string } {
  const state = randomBytes(24).toString("base64url");
  return { state, value: `${state}.${accountId}` };
}

/** The account id the login was for, when the returned state matches the cookie; otherwise null. */
export function checkState(cookieValue: string | undefined, returnedState: string | null): string | null {
  if (!cookieValue || !returnedState) return null;
  const [state, accountId] = cookieValue.split(".");
  if (!state || !accountId) return null;
  const expected = Buffer.from(state);
  const actual = Buffer.from(returnedState);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return accountId;
}
