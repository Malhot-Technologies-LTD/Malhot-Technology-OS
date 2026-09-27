import "server-only";

import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Elevated: platform connections and the figures synced from them
 * (docs/features/social.md#connected-accounts).
 *
 * Browser-facing roles cannot read tokens or write any of these tables
 * (20260927170000_social_connections.sql), so every write happens here, on the
 * server, after the caller has checked `social.manage` — or from the cron job,
 * which has no user at all. Callers pass the organisation explicitly and every
 * query is scoped by it: the service role bypasses RLS, so this file is the
 * only thing keeping organisations apart.
 */

export type StoredConnection = {
  id: string;
  organization_id: string;
  account_id: string;
  provider: "instagram";
  external_user_id: string;
  username: string | null;
  token_ciphertext: string;
  token_expires_at: string | null;
  token_issued_at: string;
};

const COLUMNS =
  "id, organization_id, account_id, provider, external_user_id, username, token_ciphertext, token_expires_at, token_issued_at";

export async function saveConnection(input: {
  organizationId: string;
  accountId: string;
  externalUserId: string;
  username: string | null;
  sealedToken: string;
  expiresAt: string | null;
  scopes: readonly string[];
  connectedBy: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin.from("social_connections").upsert(
    {
      organization_id: input.organizationId,
      account_id: input.accountId,
      provider: "instagram",
      external_user_id: input.externalUserId,
      username: input.username,
      token_ciphertext: input.sealedToken,
      token_expires_at: input.expiresAt,
      token_issued_at: now,
      scopes: [...input.scopes],
      connected_by: input.connectedBy,
      connected_at: now,
      last_sync_error: null,
    },
    { onConflict: "account_id" },
  );
  if (error) {
    logger.error("social.connection_save_failed", { code: error.code, message: error.message });
    return { ok: false, message: "The connection could not be saved." };
  }
  return { ok: true };
}

export async function getConnection(organizationId: string, accountId: string): Promise<StoredConnection | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("social_connections")
    .select(COLUMNS)
    .eq("organization_id", organizationId)
    .eq("account_id", accountId)
    .maybeSingle();
  if (error) logger.error("social.connection_read_failed", { code: error.code, message: error.message });
  return (data as StoredConnection | null) ?? null;
}

/** Every connection in every organisation, for the daily cron. */
export async function listAllConnections(): Promise<StoredConnection[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("social_connections").select(COLUMNS).order("last_synced_at", {
    ascending: true,
    nullsFirst: true,
  });
  if (error) {
    logger.error("social.connection_list_failed", { code: error.code, message: error.message });
    return [];
  }
  return (data as StoredConnection[] | null) ?? [];
}

export async function deleteConnection(organizationId: string, accountId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("social_connections")
    .delete()
    .eq("organization_id", organizationId)
    .eq("account_id", accountId);
  if (error) logger.error("social.connection_delete_failed", { code: error.code, message: error.message });
  return !error;
}

export async function storeRefreshedToken(connection: StoredConnection, sealedToken: string, expiresAt: string | null) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("social_connections")
    .update({ token_ciphertext: sealedToken, token_expires_at: expiresAt, token_issued_at: new Date().toISOString() })
    .eq("organization_id", connection.organization_id)
    .eq("id", connection.id);
  if (error) logger.error("social.token_store_failed", { code: error.code, message: error.message });
}

export type SnapshotRow = {
  day: string;
  followers?: number | null;
  follows?: number | null;
  media_count?: number | null;
  reach?: number | null;
  views?: number | null;
  accounts_engaged?: number | null;
  interactions?: number | null;
};

export type MediaStatRow = {
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
};

/**
 * Writes one sync's figures. Snapshot rows merge by day: the profile writes
 * today's follower count and the insights write yesterday's reach, and neither
 * overwrites the other's columns.
 */
export async function recordSync(
  connection: StoredConnection,
  result: {
    username: string | null;
    followers: number | null;
    snapshots: readonly SnapshotRow[];
    media: readonly MediaStatRow[];
  },
): Promise<string | null> {
  const admin = createAdminClient();
  const scope = { account_id: connection.account_id, organization_id: connection.organization_id };
  const now = new Date().toISOString();

  for (const snapshot of result.snapshots) {
    const { error } = await admin
      .from("social_account_snapshots")
      .upsert({ ...scope, ...snapshot, captured_at: now }, { onConflict: "account_id,day" });
    if (error) return `Saving the daily figures failed (${error.code}).`;
  }
  if (result.media.length > 0) {
    const { error } = await admin.from("social_media_stats").upsert(
      result.media.map((row) => ({ ...scope, ...row, synced_at: now })),
      { onConflict: "account_id,external_id" },
    );
    if (error) return `Saving post figures failed (${error.code}).`;
  }
  if (result.followers !== null || result.username) {
    const { error } = await admin
      .from("social_accounts")
      .update({
        ...(result.followers !== null ? { followers: result.followers, followers_updated_at: now } : {}),
        ...(result.username ? { handle: result.username } : {}),
      })
      .eq("organization_id", connection.organization_id)
      .eq("id", connection.account_id);
    // A renamed handle can collide with another listed account; the figures still count.
    if (error) logger.warn("social.account_update_failed", { code: error.code, message: error.message });
  }
  return null;
}

export async function markSynced(
  connection: StoredConnection,
  outcome: { error: string | null; username?: string | null },
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("social_connections")
    .update({
      last_sync_error: outcome.error,
      ...(outcome.error ? {} : { last_synced_at: new Date().toISOString() }),
      ...(outcome.username ? { username: outcome.username } : {}),
    })
    .eq("organization_id", connection.organization_id)
    .eq("id", connection.id);
  if (error) logger.error("social.mark_synced_failed", { code: error.code, message: error.message });
}
