import { z } from "zod";

/**
 * Website showcase (Settings → Website). Shared by the forms (zodResolver) and
 * the Server Actions (re-parse). Mirrors the column constraints in
 * supabase/migrations/…_project_showcase.sql — the database is the backstop,
 * these are the readable messages.
 */

export const SHOWCASE_CATEGORIES = ["Web", "Mobile", "Design", "Marketing"] as const;
export type ShowcaseCategory = (typeof SHOWCASE_CATEGORIES)[number];

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const MAX_LIST_ITEMS = 20;

/** "AGRI CONNECT — v2" → "agri-connect-v2". Empty when nothing usable is left. */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

/** One entry per line, blanks and duplicates dropped. Used for features and technology. */
export function splitLines(value: string): string[] {
  const seen = new Set<string>();
  for (const line of value.split(/\r?\n/)) {
    const item = line.trim();
    if (item) seen.add(item);
  }
  return [...seen];
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters`)
    .transform((v) => (v === "" ? null : v));

const lineList = (label: string) =>
  z
    .string()
    .transform(splitLines)
    .refine((items) => items.length <= MAX_LIST_ITEMS, `List at most ${MAX_LIST_ITEMS} ${label}`)
    .refine((items) => items.every((item) => item.length <= 120), "Keep each line under 120 characters");

export const showcaseSchema = z.object({
  projectId: z.uuid(),
  title: z.string().trim().min(1, "Enter the name visitors will see").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Enter a web address")
    .max(80)
    .regex(SLUG_PATTERN, "Use lowercase letters, numbers and single hyphens"),
  category: z.enum(SHOWCASE_CATEGORIES),
  scope: optionalText(120),
  year: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d{4}$/.test(v) && Number(v) >= 2000 && Number(v) <= 2100), "Enter a year like 2025")
    .transform((v) => (v === "" ? null : Number(v))),
  clientLabel: optionalText(120),
  summary: z.string().trim().min(1, "Write one or two sentences for the project card").max(300),
  overview: optionalText(5000),
  features: lineList("features"),
  stack: lineList("technologies"),
  liveUrl: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === "" || (URL.canParse(v) && v.startsWith("https://")), "Enter a full https:// address")
    .transform((v) => (v === "" ? null : v)),
  published: z.boolean(),
});

export type ShowcaseInput = z.input<typeof showcaseSchema>;
export type ShowcaseOutput = z.output<typeof showcaseSchema>;

export const imageAltSchema = z
  .string()
  .trim()
  .min(1, "Describe the photo for people who cannot see it")
  .max(200, "Keep the description under 200 characters");

/** Accepted uploads. Must match `allowed_mime_types` on the site-media bucket. */
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGES = 12;

const EXTENSIONS: Record<(typeof IMAGE_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export function isAcceptedImageType(type: string): type is (typeof IMAGE_TYPES)[number] {
  return (IMAGE_TYPES as readonly string[]).includes(type);
}

/**
 * Where a project's photo is stored. The organisation comes first because the
 * bucket's write policy authorises on it; the project folder keeps one
 * project's files together; the random name makes the public URL unguessable.
 */
export function showcaseImagePath(
  organizationId: string,
  projectId: string,
  fileId: string,
  type: (typeof IMAGE_TYPES)[number],
) {
  return `${organizationId}/showcase/${projectId}/${fileId}.${EXTENSIONS[type]}`;
}

/** True when `path` is a file under this organisation's folder for this project. */
export function isShowcaseImagePath(path: string, organizationId: string, projectId: string): boolean {
  const pattern = new RegExp(`^${organizationId}/showcase/${projectId}/[0-9a-f-]{36}\\.(jpg|png|webp|avif)$`);
  return pattern.test(path);
}
