import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import { isSchemaDrift } from "@/lib/actions/db-errors";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

import type { SocialAccountRow, SocialPostRow } from "./stats";

/**
 * Reads for /os/social. RLS limits every row to org admins and social media
 * managers; pages check `social.manage` first so nobody else reaches them.
 *
 * `missing` means the social migration has not been applied yet. Pages show a
 * "database update needed" notice for it instead of an error.
 */
export type SocialResult<T> = { data: T; error: PostgrestError | null; missing: boolean };

function settle<T>(result: { data: T | null; error: PostgrestError | null }, empty: T): SocialResult<T> {
  if (result.error) {
    const missing = isSchemaDrift(result.error);
    if (!missing) logger.error("social.read_failed", { code: result.error.code, message: result.error.message });
    return { data: empty, error: missing ? null : result.error, missing };
  }
  return { data: result.data ?? empty, error: null, missing: false };
}

const ACCOUNT_COLUMNS = "id, platform, handle, profile_url, status, followers, followers_updated_at, notes";
const POST_COLUMNS =
  "id, title, caption, format, status, scheduled_at, published_at, pillar, asset_url, notes, created_at, updated_at, owner:profiles!social_posts_owner_id_fkey(id, full_name), channels:social_post_channels(account_id, published_url)";

export async function listSocialAccounts(organizationId: string): Promise<SocialResult<SocialAccountRow[]>> {
  const supabase = await createClient();
  const result = await supabase
    .from("social_accounts")
    .select(ACCOUNT_COLUMNS)
    .eq("organization_id", organizationId)
    .order("platform")
    .order("handle")
    .returns<SocialAccountRow[]>();
  return settle(result, []);
}

/**
 * Every post, newest plan first. A company plans a few posts a day at most, so
 * a cap of 1,000 covers well over a year; the dashboard only looks at the last
 * eight weeks and the next two.
 */
export async function listSocialPosts(organizationId: string): Promise<SocialResult<SocialPostRow[]>> {
  const supabase = await createClient();
  const result = await supabase
    .from("social_posts")
    .select(POST_COLUMNS)
    .eq("organization_id", organizationId)
    .order("scheduled_at", { ascending: false, nullsFirst: true })
    .order("created_at", { ascending: false })
    .limit(1000)
    .returns<SocialPostRow[]>();
  return settle(result, []);
}

export async function getSocialPost(organizationId: string, id: string): Promise<SocialResult<SocialPostRow | null>> {
  const supabase = await createClient();
  const result = await supabase
    .from("social_posts")
    .select(POST_COLUMNS)
    .eq("organization_id", organizationId)
    .eq("id", id)
    .returns<SocialPostRow[]>()
    .maybeSingle();
  return settle(result, null);
}

export async function getSocialAccount(
  organizationId: string,
  id: string,
): Promise<SocialResult<SocialAccountRow | null>> {
  const supabase = await createClient();
  const result = await supabase
    .from("social_accounts")
    .select(ACCOUNT_COLUMNS)
    .eq("organization_id", organizationId)
    .eq("id", id)
    .returns<SocialAccountRow[]>()
    .maybeSingle();
  return settle(result, null);
}

/**
 * Who holds the social media duty, by user id. Null when the duties table does
 * not exist yet, so Settings can hide a switch that could not save.
 */
export async function listSocialManagers(organizationId: string): Promise<Set<string> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("member_duties")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("duty", "social_media");
  if (error) {
    if (isSchemaDrift(error)) return null;
    logger.warn("social.managers_failed", { message: error.message });
  }
  return new Set((data ?? []).map((row) => row.user_id));
}

export type ConnectionStatus = {
  account_id: string;
  provider: "instagram";
  username: string | null;
  token_expires_at: string | null;
  connected_at: string;
  last_synced_at: string | null;
  last_sync_error: string | null;
};

// Every column but the token, which the database will not give this client anyway.
const CONNECTION_COLUMNS =
  "account_id, provider, username, token_expires_at, connected_at, last_synced_at, last_sync_error";

export async function listConnections(organizationId: string): Promise<SocialResult<ConnectionStatus[]>> {
  const supabase = await createClient();
  const result = await supabase
    .from("social_connections")
    .select(CONNECTION_COLUMNS)
    .eq("organization_id", organizationId)
    .returns<ConnectionStatus[]>();
  return settle(result, []);
}

export type SnapshotRow = {
  account_id: string;
  day: string;
  followers: number | null;
  reach: number | null;
  views: number | null;
  accounts_engaged: number | null;
  interactions: number | null;
};

/** Daily figures from `sinceDay` ("YYYY-MM-DD") on, oldest first. */
export async function listSnapshots(organizationId: string, sinceDay: string): Promise<SocialResult<SnapshotRow[]>> {
  const supabase = await createClient();
  const result = await supabase
    .from("social_account_snapshots")
    .select("account_id, day, followers, reach, views, accounts_engaged, interactions")
    .eq("organization_id", organizationId)
    .gte("day", sinceDay)
    .order("day")
    .returns<SnapshotRow[]>();
  return settle(result, []);
}

export type MediaStat = {
  account_id: string;
  external_id: string;
  permalink: string | null;
  caption: string | null;
  media_type: string | null;
  product_type: string | null;
  posted_at: string | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  shares: number | null;
  reach: number | null;
  views: number | null;
  interactions: number | null;
  synced_at: string;
};

export async function listMediaStats(organizationId: string, sinceIso: string): Promise<SocialResult<MediaStat[]>> {
  const supabase = await createClient();
  const result = await supabase
    .from("social_media_stats")
    .select(
      "account_id, external_id, permalink, caption, media_type, product_type, posted_at, likes, comments, saves, shares, reach, views, interactions, synced_at",
    )
    .eq("organization_id", organizationId)
    .gte("posted_at", sinceIso)
    .order("posted_at", { ascending: false })
    .limit(200)
    .returns<MediaStat[]>();
  return settle(result, []);
}
