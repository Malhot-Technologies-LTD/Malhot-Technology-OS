"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapDbError } from "@/lib/actions/db-errors";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { validationFail } from "@/lib/actions/validation";
import { withAction } from "@/lib/actions/with-action";
import { requireViewer, type Viewer } from "@/lib/auth/context";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

import { deleteConnection, getConnection } from "@/lib/supabase/elevated/social-connections";

import { syncInstagram } from "./instagram/sync";
import { accountSchema, postSchema, POST_STATUSES, publishedLinkSchema } from "./schemas";

/**
 * Writes for /os/social. Each checks `social.manage` so the UI gets a clear
 * answer; RLS (can_manage_social) is what actually enforces it.
 */

async function socialViewer(): Promise<Viewer | null> {
  const viewer = await requireViewer();
  return can(viewer, "social.manage") ? viewer : null;
}

const NOT_ALLOWED = "Only admins and the social media manager can change social media.";

function dbFail<T>(error: Parameters<typeof mapDbError>[0]): ActionResult<T> {
  const mapped = mapDbError(error);
  return fail(mapped.code, mapped.message);
}

function refresh() {
  revalidatePath("/os/social", "layout");
}

/**
 * Replaces the post's channels with `accountIds`, keeping the live links of
 * channels that stay. RLS and the composite foreign keys reject accounts from
 * another organisation.
 */
async function setChannels(organizationId: string, postId: string, accountIds: readonly string[]) {
  const supabase = await createClient();
  const wanted = [...new Set(accountIds)];
  let query = supabase.from("social_post_channels").delete().eq("post_id", postId);
  if (wanted.length > 0) query = query.not("account_id", "in", `(${wanted.join(",")})`);
  const removed = await query;
  if (removed.error) return removed.error;
  if (wanted.length === 0) return null;
  const { error } = await supabase.from("social_post_channels").upsert(
    wanted.map((accountId) => ({ organization_id: organizationId, post_id: postId, account_id: accountId })),
    { onConflict: "post_id,account_id", ignoreDuplicates: true },
  );
  return error;
}

export const createSocialPost = withAction(
  "social.createPost",
  async (input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = postSchema.safeParse(input);
    if (!parsed.success) return validationFail(parsed.error);
    const viewer = await socialViewer();
    if (!viewer) return fail("forbidden", NOT_ALLOWED);

    const post = parsed.data;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("social_posts")
      .insert({
        organization_id: viewer.organizationId,
        title: post.title,
        caption: post.caption,
        format: post.format,
        status: post.status,
        scheduled_at: post.scheduledAt,
        pillar: post.pillar,
        asset_url: post.assetUrl,
        notes: post.notes,
        owner_id: viewer.userId,
        created_by: viewer.userId,
      })
      .select("id")
      .single();
    if (error) return dbFail(error);

    const channelError = await setChannels(viewer.organizationId, data.id, post.accountIds);
    if (channelError) return dbFail(channelError);
    refresh();
    return ok({ id: data.id });
  },
);

export const updateSocialPost = withAction(
  "social.updatePost",
  async (id: unknown, input: unknown): Promise<ActionResult> => {
    const postId = z.uuid().safeParse(id);
    if (!postId.success) return fail("validation", "Unknown post.");
    const parsed = postSchema.safeParse(input);
    if (!parsed.success) return validationFail(parsed.error);
    const viewer = await socialViewer();
    if (!viewer) return fail("forbidden", NOT_ALLOWED);

    const post = parsed.data;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("social_posts")
      .update({
        title: post.title,
        caption: post.caption,
        format: post.format,
        status: post.status,
        scheduled_at: post.scheduledAt,
        // Moving a post back out of "published" clears when it went out.
        ...(post.status === "published" ? {} : { published_at: null }),
        pillar: post.pillar,
        asset_url: post.assetUrl,
        notes: post.notes,
      })
      .eq("organization_id", viewer.organizationId)
      .eq("id", postId.data)
      .select("id");
    if (error) return dbFail(error);
    if (!data || data.length === 0) return fail("not_found", "That post no longer exists.");

    const channelError = await setChannels(viewer.organizationId, postId.data, post.accountIds);
    if (channelError) return dbFail(channelError);
    refresh();
    return ok(undefined);
  },
);

const statusSchema = z.object({ id: z.uuid(), status: z.enum(POST_STATUSES) });

/** Moves a post along the pipeline without opening the editor. */
export const setSocialPostStatus = withAction("social.setPostStatus", async (input: unknown): Promise<ActionResult> => {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const viewer = await socialViewer();
  if (!viewer) return fail("forbidden", NOT_ALLOWED);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("social_posts")
    .update({
      status: parsed.data.status,
      ...(parsed.data.status === "published" ? {} : { published_at: null }),
    })
    .eq("organization_id", viewer.organizationId)
    .eq("id", parsed.data.id)
    .select("id");
  if (error) {
    // The one rule a quick move can trip: scheduling needs a time.
    if (error.message.includes("social_posts_scheduled_has_time"))
      return fail("invalid_transition", "Give the post a date and time before scheduling it.");
    return dbFail(error);
  }
  if (!data || data.length === 0) return fail("not_found", "That post no longer exists.");
  refresh();
  return ok(undefined);
});

export const deleteSocialPost = withAction("social.deletePost", async (id: unknown): Promise<ActionResult> => {
  const postId = z.uuid().safeParse(id);
  if (!postId.success) return fail("validation", "Unknown post.");
  const viewer = await socialViewer();
  if (!viewer) return fail("forbidden", NOT_ALLOWED);

  const supabase = await createClient();
  const { error } = await supabase
    .from("social_posts")
    .delete()
    .eq("organization_id", viewer.organizationId)
    .eq("id", postId.data);
  if (error) return dbFail(error);
  refresh();
  return ok(undefined);
});

/** Records where a published post lives on one of its channels. */
export const setPublishedLink = withAction("social.setPublishedLink", async (input: unknown): Promise<ActionResult> => {
  const parsed = publishedLinkSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const viewer = await socialViewer();
  if (!viewer) return fail("forbidden", NOT_ALLOWED);

  const supabase = await createClient();
  const { error } = await supabase
    .from("social_post_channels")
    .update({ published_url: parsed.data.url })
    .eq("organization_id", viewer.organizationId)
    .eq("post_id", parsed.data.postId)
    .eq("account_id", parsed.data.accountId);
  if (error) return dbFail(error);
  refresh();
  return ok(undefined);
});

function accountRow(account: z.output<typeof accountSchema>, previousFollowers?: number | null) {
  return {
    platform: account.platform,
    handle: account.handle.replace(/^@/, ""),
    profile_url: account.profileUrl,
    status: account.status,
    followers: account.followers,
    // Stamped only when the number changes, so "updated 3 weeks ago" stays honest.
    ...(account.followers !== previousFollowers
      ? { followers_updated_at: account.followers === null ? null : new Date().toISOString() }
      : {}),
    notes: account.notes,
  };
}

export const createSocialAccount = withAction(
  "social.createAccount",
  async (input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = accountSchema.safeParse(input);
    if (!parsed.success) return validationFail(parsed.error);
    const viewer = await socialViewer();
    if (!viewer) return fail("forbidden", NOT_ALLOWED);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("social_accounts")
      .insert({
        organization_id: viewer.organizationId,
        created_by: viewer.userId,
        owner_id: viewer.userId,
        ...accountRow(parsed.data, undefined),
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") return fail("conflict", "That account is already listed.");
      return dbFail(error);
    }
    refresh();
    return ok({ id: data.id });
  },
);

export const updateSocialAccount = withAction(
  "social.updateAccount",
  async (id: unknown, input: unknown): Promise<ActionResult> => {
    const accountId = z.uuid().safeParse(id);
    if (!accountId.success) return fail("validation", "Unknown account.");
    const parsed = accountSchema.safeParse(input);
    if (!parsed.success) return validationFail(parsed.error);
    const viewer = await socialViewer();
    if (!viewer) return fail("forbidden", NOT_ALLOWED);

    const supabase = await createClient();
    const current = await supabase
      .from("social_accounts")
      .select("followers")
      .eq("organization_id", viewer.organizationId)
      .eq("id", accountId.data)
      .maybeSingle();
    if (current.error) return dbFail(current.error);
    if (!current.data) return fail("not_found", "That account no longer exists.");

    const { error } = await supabase
      .from("social_accounts")
      .update(accountRow(parsed.data, current.data.followers))
      .eq("organization_id", viewer.organizationId)
      .eq("id", accountId.data);
    if (error) {
      if (error.code === "23505") return fail("conflict", "That account is already listed.");
      return dbFail(error);
    }
    refresh();
    return ok(undefined);
  },
);

export const deleteSocialAccount = withAction("social.deleteAccount", async (id: unknown): Promise<ActionResult> => {
  const accountId = z.uuid().safeParse(id);
  if (!accountId.success) return fail("validation", "Unknown account.");
  const viewer = await socialViewer();
  if (!viewer) return fail("forbidden", NOT_ALLOWED);

  const supabase = await createClient();
  const { error } = await supabase
    .from("social_accounts")
    .delete()
    .eq("organization_id", viewer.organizationId)
    .eq("id", accountId.data);
  if (error) return dbFail(error);
  refresh();
  return ok(undefined);
});

const dutySchema = z.object({ userId: z.uuid(), enabled: z.boolean() });

/** Settings → Members: gives or takes away the social media duty. */
export const setSocialManager = withAction("social.setManager", async (input: unknown): Promise<ActionResult> => {
  const parsed = dutySchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const viewer = await requireViewer();
  if (!can(viewer, "org.manage")) return fail("forbidden", "Only organisation admins can change duties.");

  const supabase = await createClient();
  const { error } = parsed.data.enabled
    ? await supabase.from("member_duties").upsert(
        {
          organization_id: viewer.organizationId,
          user_id: parsed.data.userId,
          duty: "social_media",
          granted_by: viewer.userId,
        },
        { onConflict: "organization_id,user_id,duty", ignoreDuplicates: true },
      )
    : await supabase
        .from("member_duties")
        .delete()
        .eq("organization_id", viewer.organizationId)
        .eq("user_id", parsed.data.userId)
        .eq("duty", "social_media");
  if (error) return dbFail(error);
  revalidatePath("/os/settings/members");
  // The sidebar of the person concerned changes on their next navigation.
  revalidatePath("/os", "layout");
  return ok(undefined);
});

/** The account exists in the viewer's organisation and they may manage it (RLS decides). */
async function ownAccount(viewer: Viewer, accountId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("social_accounts")
    .select("id")
    .eq("organization_id", viewer.organizationId)
    .eq("id", accountId)
    .maybeSingle();
  return Boolean(data);
}

/** "Sync now" on a connected account, instead of waiting for the daily run. */
export const syncSocialAccountNow = withAction(
  "social.syncNow",
  async (id: unknown): Promise<ActionResult<{ posts: number }>> => {
    const accountId = z.uuid().safeParse(id);
    if (!accountId.success) return fail("validation", "Unknown account.");
    const viewer = await socialViewer();
    if (!viewer) return fail("forbidden", NOT_ALLOWED);
    if (!(await ownAccount(viewer, accountId.data))) return fail("not_found", "That account no longer exists.");

    const connection = await getConnection(viewer.organizationId, accountId.data);
    if (!connection) return fail("not_found", "This account is not connected.");
    const outcome = await syncInstagram(connection);
    refresh();
    return outcome.ok ? ok({ posts: outcome.posts }) : fail("external", outcome.message);
  },
);

/**
 * Forgets the stored token and stops syncing. Figures already synced stay.
 * Instagram keeps listing the app under the account's "Apps and websites"
 * until someone removes it there.
 */
export const disconnectSocialAccount = withAction("social.disconnect", async (id: unknown): Promise<ActionResult> => {
  const accountId = z.uuid().safeParse(id);
  if (!accountId.success) return fail("validation", "Unknown account.");
  const viewer = await socialViewer();
  if (!viewer) return fail("forbidden", NOT_ALLOWED);
  if (!(await ownAccount(viewer, accountId.data))) return fail("not_found", "That account no longer exists.");
  if (!(await deleteConnection(viewer.organizationId, accountId.data)))
    return fail("unexpected", "The connection could not be removed. Try again.");
  refresh();
  return ok(undefined);
});
