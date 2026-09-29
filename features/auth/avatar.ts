/**
 * Where a profile photo lives and what one is allowed to be.
 *
 * Kept apart from features/showcase/media.ts on purpose rather than shared. The
 * two answer to different policies — a showcase photo belongs to an
 * organisation, an avatar belongs to one person — and the limits differ: 2MB
 * here against 10MB there, because this one is displayed at 36px and a phone
 * photo at full size would be paid for on every screen it appears on.
 */

export const AVATAR_BUCKET = "avatars";

/** Mirrors the bucket's allowed_mime_types; the database is the backstop. */
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export type AvatarType = (typeof AVATAR_TYPES)[number];

/** Mirrors the bucket's file_size_limit. */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const EXTENSIONS: Record<AvatarType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export function isAvatarType(type: string): type is AvatarType {
  return (AVATAR_TYPES as readonly string[]).includes(type);
}

/** What the file picker offers, so the browser filters before a person does. */
export const AVATAR_ACCEPT = AVATAR_TYPES.join(",");

/**
 * The user id leads because the bucket's write policy authorises on it. The
 * random name means replacing a photo writes a new object rather than
 * overwriting one, so a cached old avatar can never be served as the new one.
 */
export function avatarPath(userId: string, fileId: string, type: AvatarType): string {
  return `${userId}/${fileId}.${EXTENSIONS[type]}`;
}

/**
 * The tail every public avatar URL carries, whatever the project host is.
 *
 * A constant rather than something derived from the environment, so the helpers
 * below stay pure — `lib/env.ts` throws on import when the Supabase variables
 * are absent, and that would make these untestable. Building a URL needs the
 * host and lives in avatar-media.ts; reading one back does not.
 */
export const AVATAR_PUBLIC_PREFIX = `/storage/v1/object/public/${AVATAR_BUCKET}/`;

/** True when `path` is a file in this person's own folder. */
export function isOwnAvatarPath(path: string, userId: string): boolean {
  return new RegExp(`^${userId}/[0-9a-f-]{36}\\.(jpg|png|webp|avif)$`).test(path);
}

/**
 * The storage path behind a stored avatar URL, or null when it points somewhere
 * we do not own.
 *
 * Needed to delete the file a new photo replaces. `avatar_url` is not always
 * ours: the sign-up trigger fills it from an OAuth provider's `picture`, and
 * asking Storage to delete a googleusercontent URL would be nonsense. Returning
 * null is the signal to leave it alone.
 */
export function avatarPathFromUrl(url: string | null): string | null {
  if (!url) return null;
  const marker = url.indexOf(AVATAR_PUBLIC_PREFIX);
  if (marker === -1) return null;
  const path = url.slice(marker + AVATAR_PUBLIC_PREFIX.length);
  return path === "" ? null : path;
}
