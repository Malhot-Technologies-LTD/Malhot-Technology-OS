/**
 * The Instagram API with Instagram Login (graph.instagram.com), as far as the
 * Social section needs it: log in, keep the token alive, and read the
 * account's and its posts' figures. Read-only; nothing here posts.
 *
 * Endpoints and metric names follow Meta's reference as of API v25.0
 * (2026-09): `impressions` is gone (replaced by `views`), account metrics need
 * `metric_type=total_value`, and follower-count breakdowns need 100+ followers,
 * which is why followers come from the profile's `followers_count` instead.
 *
 * Parsing is kept apart from fetching so it can be tested against recorded
 * responses without the network.
 */

export const API_VERSION = "v25.0";
export const SCOPES = ["instagram_business_basic", "instagram_business_manage_insights"] as const;

const GRAPH = "https://graph.instagram.com";
const TIMEOUT_MS = 15_000;

export type InstagramErrorKind = "auth" | "rate_limited" | "unsupported" | "other";

export class InstagramError extends Error {
  constructor(
    message: string,
    readonly kind: InstagramErrorKind,
  ) {
    super(message);
    this.name = "InstagramError";
  }
}

type GraphErrorBody = { error?: { message?: string; type?: string; code?: number; error_subcode?: number } };

/** Meta's error codes, in the words the page shows. */
export function classifyError(status: number, body: unknown): InstagramError {
  const error = (body as GraphErrorBody | null)?.error;
  const code = error?.code;
  if (code === 190 || error?.type === "OAuthException" || status === 401)
    return new InstagramError("Instagram asked to reconnect: the access was revoked or has expired.", "auth");
  if (code === 4 || code === 17 || code === 32 || code === 613 || status === 429)
    return new InstagramError("Instagram is limiting requests for now; the next sync will catch up.", "rate_limited");
  if (code === 100)
    return new InstagramError(error?.message ?? "Instagram does not offer that figure here.", "unsupported");
  return new InstagramError(error?.message ?? `Instagram answered ${status}.`, "other");
}

async function call<T>(url: URL, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    throw new InstagramError(timedOut ? "Instagram did not answer in time." : "Could not reach Instagram.", "other");
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok || (body as GraphErrorBody | null)?.error) throw classifyError(response.status, body);
  return body as T;
}

function graph(path: string, params: Record<string, string>): URL {
  const url = new URL(`${GRAPH}/${API_VERSION}/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url;
}

// Login ------------------------------------------------------------------------

export function authorizeUrl(input: { appId: string; redirectUri: string; state: string }): string {
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", input.appId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES.join(","));
  url.searchParams.set("state", input.state);
  return url.toString();
}

/** Instagram appends "#_" to the code in the redirect; it is not part of the code. */
export function cleanCode(code: string): string {
  return code.replace(/#_$/, "");
}

export type ShortToken = { accessToken: string; userId: string; permissions: string[] };

/** The token response comes flat or wrapped in `data[]` depending on the app's setup; accept both. */
export function parseShortToken(body: unknown): ShortToken {
  const raw = (body as { data?: unknown[] })?.data?.[0] ?? body;
  const record = raw as { access_token?: unknown; user_id?: unknown; permissions?: unknown };
  if (typeof record.access_token !== "string" || record.user_id === undefined)
    throw new InstagramError("Instagram returned no access token.", "other");
  const permissions = Array.isArray(record.permissions)
    ? record.permissions.map(String)
    : typeof record.permissions === "string"
      ? record.permissions.split(",").map((scope) => scope.trim())
      : [];
  return { accessToken: record.access_token, userId: String(record.user_id), permissions };
}

export async function exchangeCode(input: {
  appId: string;
  appSecret: string;
  redirectUri: string;
  code: string;
}): Promise<ShortToken> {
  const form = new URLSearchParams({
    client_id: input.appId,
    client_secret: input.appSecret,
    grant_type: "authorization_code",
    redirect_uri: input.redirectUri,
    code: cleanCode(input.code),
  });
  const body = await call<unknown>(new URL("https://api.instagram.com/oauth/access_token"), {
    method: "POST",
    body: form,
  });
  return parseShortToken(body);
}

export type LongToken = { accessToken: string; expiresAt: string | null };

export function parseLongToken(body: unknown, now: number): LongToken {
  const record = body as { access_token?: unknown; expires_in?: unknown };
  if (typeof record.access_token !== "string") throw new InstagramError("Instagram returned no access token.", "other");
  const seconds = typeof record.expires_in === "number" ? record.expires_in : null;
  return { accessToken: record.access_token, expiresAt: seconds ? new Date(now + seconds * 1000).toISOString() : null };
}

/** Short-lived (1 hour) → long-lived (60 days). */
export async function toLongLived(appSecret: string, shortToken: string, now = Date.now()): Promise<LongToken> {
  const url = new URL(`${GRAPH}/access_token`);
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("access_token", shortToken);
  return parseLongToken(await call<unknown>(url), now);
}

/** Another 60 days. Instagram only allows it once the token is a day old and still valid. */
export async function refreshToken(token: string, now = Date.now()): Promise<LongToken> {
  const url = new URL(`${GRAPH}/refresh_access_token`);
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", token);
  return parseLongToken(await call<unknown>(url), now);
}

// Reading ----------------------------------------------------------------------

export type Profile = {
  userId: string;
  username: string;
  followers: number | null;
  follows: number | null;
  mediaCount: number | null;
};

const count = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value) : null;

export function parseProfile(body: unknown): Profile {
  const record = body as Record<string, unknown>;
  return {
    userId: String(record.user_id ?? record.id ?? ""),
    username: typeof record.username === "string" ? record.username : "",
    followers: count(record.followers_count),
    follows: count(record.follows_count),
    mediaCount: count(record.media_count),
  };
}

export async function getProfile(token: string): Promise<Profile> {
  return parseProfile(
    await call<unknown>(
      graph("me", { fields: "user_id,username,followers_count,follows_count,media_count", access_token: token }),
    ),
  );
}

export type DayInsights = {
  reach: number | null;
  views: number | null;
  accountsEngaged: number | null;
  interactions: number | null;
};

/** Account metrics come back as `{ name, total_value: { value } }` with metric_type=total_value. */
export function parseInsightValues(body: unknown): Map<string, number> {
  const values = new Map<string, number>();
  for (const entry of (body as { data?: unknown[] })?.data ?? []) {
    const metric = entry as { name?: unknown; total_value?: { value?: unknown }; values?: { value?: unknown }[] };
    const value = count(metric.total_value?.value ?? metric.values?.[0]?.value);
    if (typeof metric.name === "string" && value !== null) values.set(metric.name, value);
  }
  return values;
}

/** One UTC day's account-wide figures. */
export async function getDayInsights(token: string, dayStart: number): Promise<DayInsights> {
  const values = parseInsightValues(
    await call<unknown>(
      graph("me/insights", {
        metric: "reach,views,accounts_engaged,total_interactions",
        period: "day",
        metric_type: "total_value",
        since: String(Math.floor(dayStart / 1000)),
        until: String(Math.floor(dayStart / 1000) + 86_400),
        access_token: token,
      }),
    ),
  );
  return {
    reach: values.get("reach") ?? null,
    views: values.get("views") ?? null,
    accountsEngaged: values.get("accounts_engaged") ?? null,
    interactions: values.get("total_interactions") ?? null,
  };
}

export type Media = {
  id: string;
  caption: string | null;
  mediaType: string | null;
  productType: string | null;
  permalink: string | null;
  postedAt: string | null;
  likes: number | null;
  comments: number | null;
};

export function parseMediaList(body: unknown): Media[] {
  return ((body as { data?: unknown[] })?.data ?? []).flatMap((entry) => {
    const media = entry as Record<string, unknown>;
    if (typeof media.id !== "string") return [];
    return [
      {
        id: media.id,
        caption: typeof media.caption === "string" ? media.caption.slice(0, 2200) : null,
        mediaType: typeof media.media_type === "string" ? media.media_type : null,
        productType: typeof media.media_product_type === "string" ? media.media_product_type : null,
        permalink: typeof media.permalink === "string" ? media.permalink : null,
        postedAt: typeof media.timestamp === "string" ? new Date(media.timestamp).toISOString() : null,
        likes: count(media.like_count),
        comments: count(media.comments_count),
      },
    ];
  });
}

/** The most recent posts, newest first. Stories are not listed here by Instagram. */
export async function getRecentMedia(token: string, limit = 50): Promise<Media[]> {
  return parseMediaList(
    await call<unknown>(
      graph("me/media", {
        fields: "id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count",
        limit: String(limit),
        access_token: token,
      }),
    ),
  );
}

export type MediaInsights = {
  reach: number | null;
  views: number | null;
  saves: number | null;
  shares: number | null;
  interactions: number | null;
};

/** Figures supported by both feed posts and reels. */
export async function getMediaInsights(token: string, mediaId: string): Promise<MediaInsights> {
  const values = parseInsightValues(
    await call<unknown>(
      graph(`${mediaId}/insights`, { metric: "reach,views,saved,shares,total_interactions", access_token: token }),
    ),
  );
  return {
    reach: values.get("reach") ?? null,
    views: values.get("views") ?? null,
    saves: values.get("saved") ?? null,
    shares: values.get("shares") ?? null,
    interactions: values.get("total_interactions") ?? null,
  };
}

/**
 * The same post can be linked as instagram.com/p/X, www.instagram.com/reel/X/,
 * with a username in front or with tracking parameters. They all share the
 * shortcode, which is case-sensitive, so that is what links are compared by.
 */
export function normalisePermalink(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!/(^|\.)instagram\.com$/i.test(parsed.hostname)) return null;
    const match = /\/(?:p|reels?|tv)\/([A-Za-z0-9_-]+)/.exec(parsed.pathname);
    return match ? `instagram:${match[1]}` : null;
  } catch {
    return null;
  }
}
