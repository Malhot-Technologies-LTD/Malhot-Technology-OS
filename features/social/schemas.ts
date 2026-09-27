import { z } from "zod";

/**
 * Social media planning (docs/features/social.md). The vocabularies here are
 * mirrored by CHECK constraints in 20260927150000_social_media.sql; the two
 * must agree.
 */

export const PLATFORMS = [
  "instagram",
  "facebook",
  "linkedin",
  "x",
  "tiktok",
  "youtube",
  "threads",
  "whatsapp",
  "other",
] as const;
export type Platform = (typeof PLATFORMS)[number];

/** Names and brand colours. The colour is a small swatch beside the name, never the only signal. */
export const PLATFORM_META: Record<Platform, { label: string; color: string }> = {
  instagram: { label: "Instagram", color: "#E1306C" },
  facebook: { label: "Facebook", color: "#1877F2" },
  linkedin: { label: "LinkedIn", color: "#0A66C2" },
  x: { label: "X", color: "#111111" },
  tiktok: { label: "TikTok", color: "#25F4EE" },
  youtube: { label: "YouTube", color: "#FF0000" },
  threads: { label: "Threads", color: "#6B7280" },
  whatsapp: { label: "WhatsApp", color: "#25D366" },
  other: { label: "Other", color: "#94A3B8" },
};

export const ACCOUNT_STATUSES = ["active", "paused", "planned"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];
export const ACCOUNT_STATUS_META: Record<AccountStatus, { label: string; tone: "success" | "warning" | "neutral" }> = {
  active: { label: "Active", tone: "success" },
  paused: { label: "Paused", tone: "warning" },
  planned: { label: "Planned", tone: "neutral" },
};

export const POST_STATUSES = ["idea", "draft", "approved", "scheduled", "published"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];
export const POST_STATUS_META: Record<
  PostStatus,
  { label: string; tone: "neutral" | "info" | "review" | "progress" | "success"; hint: string }
> = {
  idea: { label: "Idea", tone: "neutral", hint: "Worth making, not started" },
  draft: { label: "Draft", tone: "info", hint: "Being written or designed" },
  approved: { label: "Approved", tone: "review", hint: "Signed off, waiting for a slot" },
  scheduled: { label: "Scheduled", tone: "progress", hint: "Has a date and time to go out" },
  published: { label: "Published", tone: "success", hint: "Live on its channels" },
};

export const POST_FORMATS = ["post", "carousel", "reel", "story", "video", "article", "thread"] as const;
export type PostFormat = (typeof POST_FORMATS)[number];
export const POST_FORMAT_LABEL: Record<PostFormat, string> = {
  post: "Post",
  carousel: "Carousel",
  reel: "Reel / short",
  story: "Story",
  video: "Video",
  article: "Article",
  thread: "Thread",
};

/** Forms send "" for an empty field; other callers may leave it out. Both mean "none". */
const blank = (value: unknown) => value ?? "";

const optionalText = (max: number) =>
  z.preprocess(
    blank,
    z
      .string()
      .trim()
      .max(max)
      .transform((value) => (value === "" ? null : value)),
  );

const optionalHttps = (max: number) =>
  z.preprocess(
    blank,
    z
      .string()
      .trim()
      .max(max)
      .refine((value) => value === "" || /^https:\/\/\S+$/.test(value), { message: "Use a full https:// link" })
      .transform((value) => (value === "" ? null : value)),
  );

/**
 * Times arrive as instants: the browser converts what the person typed in its
 * own clock before sending, because the server's clock is not theirs.
 */
const optionalInstant = z.preprocess(
  blank,
  z
    .string()
    .trim()
    .refine((value) => value === "" || !Number.isNaN(Date.parse(value)), { message: "Enter a valid date and time" })
    .transform((value) => (value === "" ? null : new Date(value).toISOString())),
);

export const postSchema = z
  .object({
    title: z.string().trim().min(1, "Give the post a working title").max(120),
    caption: optionalText(5000),
    format: z.enum(POST_FORMATS).default("post"),
    status: z.enum(POST_STATUSES).default("idea"),
    scheduledAt: optionalInstant,
    pillar: optionalText(60),
    assetUrl: optionalHttps(500),
    notes: optionalText(2000),
    accountIds: z.array(z.uuid()).max(20).default([]),
  })
  .refine((post) => post.status !== "scheduled" || post.scheduledAt !== null, {
    message: "A scheduled post needs a date and time",
    path: ["scheduledAt"],
  });
export type PostInput = z.input<typeof postSchema>;

export const publishedLinkSchema = z.object({
  postId: z.uuid(),
  accountId: z.uuid(),
  url: optionalHttps(500),
});

export const accountSchema = z.object({
  platform: z.enum(PLATFORMS),
  handle: z.string().trim().min(1, "Enter the handle or page name").max(80),
  profileUrl: optionalHttps(300),
  status: z.enum(ACCOUNT_STATUSES).default("active"),
  followers: z.preprocess(
    blank,
    z
      .string()
      .trim()
      .refine((value) => value === "" || /^\d{1,10}$/.test(value.replace(/[, ]/g, "")), {
        message: "Followers is a whole number",
      })
      .transform((value) => (value === "" ? null : Number(value.replace(/[, ]/g, "")))),
  ),
  notes: optionalText(2000),
});
export type AccountInput = z.input<typeof accountSchema>;

/** Next step along the pipeline, for the one-click "move on" button. */
export function nextStatus(status: PostStatus): PostStatus | null {
  const index = POST_STATUSES.indexOf(status);
  return index >= 0 && index < POST_STATUSES.length - 1 ? POST_STATUSES[index + 1]! : null;
}
