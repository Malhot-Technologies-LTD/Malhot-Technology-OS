import "server-only";

import { open, seal } from "@/lib/crypto/secret-box";
import { requireServerEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  markSynced,
  recordSync,
  storeRefreshedToken,
  type MediaStatRow,
  type SnapshotRow,
  type StoredConnection,
} from "@/lib/supabase/elevated/social-connections";

import {
  getDayInsights,
  getMediaInsights,
  getProfile,
  getRecentMedia,
  InstagramError,
  refreshToken,
  type MediaInsights,
} from "./api";

const DAY = 86_400_000;
/** Refresh when this close to expiry. Daily syncs make that a routine, never a race. */
const REFRESH_WITHIN = 14 * DAY;
/** Instagram refuses to refresh a token younger than a day. */
const MIN_TOKEN_AGE = DAY;
/** Figures for posts older than this rarely move; skipping them keeps a sync to a few dozen calls. */
const INSIGHTS_WINDOW = 90 * DAY;
const MAX_MEDIA = 50;

export type SyncOutcome = { ok: true; posts: number } | { ok: false; message: string; reconnect: boolean };

const utcDay = (instant: number) => new Date(instant).toISOString().slice(0, 10);
const startOfUtcDay = (instant: number) => Date.parse(`${utcDay(instant)}T00:00:00Z`);

/** Whether the stored token should be renewed before it is used. */
export function shouldRefresh(connection: Pick<StoredConnection, "token_expires_at" | "token_issued_at">, now: number) {
  if (!connection.token_expires_at) return false;
  const expires = Date.parse(connection.token_expires_at);
  const issued = Date.parse(connection.token_issued_at);
  return expires - now < REFRESH_WITHIN && expires > now && now - issued >= MIN_TOKEN_AGE;
}

/**
 * Pulls the account's figures into the OS: today's follower count, yesterday's
 * reach/views/engagement, and the latest posts with their numbers. Any single
 * figure Instagram declines (small accounts, new metrics) is left empty rather
 * than failing the whole sync.
 */
export async function syncInstagram(connection: StoredConnection, now = Date.now()): Promise<SyncOutcome> {
  try {
    const key = requireServerEnv("SOCIAL_TOKEN_KEY");
    let token = open(connection.token_ciphertext, key);

    if (shouldRefresh(connection, now)) {
      const renewed = await refreshToken(token, now);
      token = renewed.accessToken;
      await storeRefreshedToken(connection, seal(token, key), renewed.expiresAt);
    }

    const profile = await getProfile(token);
    const snapshots: SnapshotRow[] = [
      { day: utcDay(now), followers: profile.followers, follows: profile.follows, media_count: profile.mediaCount },
    ];

    const yesterday = startOfUtcDay(now) - DAY;
    const insights = await optional(() => getDayInsights(token, yesterday));
    if (insights) {
      snapshots.push({
        day: utcDay(yesterday),
        reach: insights.reach,
        views: insights.views,
        accounts_engaged: insights.accountsEngaged,
        interactions: insights.interactions,
      });
    }

    const media = await getRecentMedia(token, MAX_MEDIA);
    const rows: MediaStatRow[] = [];
    for (const item of media) {
      const recent = item.postedAt !== null && now - Date.parse(item.postedAt) <= INSIGHTS_WINDOW;
      const figures: MediaInsights | null = recent ? await optional(() => getMediaInsights(token, item.id)) : null;
      rows.push({
        external_id: item.id,
        permalink: item.permalink,
        caption: item.caption,
        media_type: item.mediaType,
        product_type: item.productType,
        posted_at: item.postedAt,
        likes: item.likes,
        comments: item.comments,
        saves: figures?.saves ?? null,
        shares: figures?.shares ?? null,
        reach: figures?.reach ?? null,
        views: figures?.views ?? null,
        interactions: figures?.interactions ?? null,
      });
    }

    const saveError = await recordSync(connection, {
      username: profile.username || null,
      followers: profile.followers,
      snapshots,
      media: rows,
    });
    await markSynced(connection, { error: saveError, username: profile.username || null });
    return saveError ? { ok: false, message: saveError, reconnect: false } : { ok: true, posts: rows.length };
  } catch (error) {
    const reconnect = error instanceof InstagramError && error.kind === "auth";
    const message = error instanceof InstagramError ? error.message : "The sync failed unexpectedly.";
    if (!(error instanceof InstagramError)) logger.error("social.instagram_sync_failed", { error: String(error) });
    await markSynced(connection, { error: message });
    return { ok: false, message, reconnect };
  }
}

/** A figure Instagram may decline for this account; anything but a lost login is not worth failing over. */
async function optional<T>(read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch (error) {
    if (error instanceof InstagramError && (error.kind === "auth" || error.kind === "rate_limited")) throw error;
    return null;
  }
}
