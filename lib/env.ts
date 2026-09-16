import { z } from "zod";

/**
 * The only place `process.env` is read. Fails fast at boot with a readable
 * message when a required variable is missing (docs/engineering/environment-variables.md).
 *
 * Public variables are inlined by Next.js at build time and must be referenced
 * literally (`process.env.NEXT_PUBLIC_X`), which is why they are listed explicitly.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_VERCEL_ENV: z.enum(["production", "preview", "development"]).optional(),
  NEXT_PUBLIC_VERCEL_URL: z.string().optional(),
});

const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_SLUG: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_APP_WEBHOOK_SECRET: z.string().optional(),
  GITHUB_STATE_SECRET: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  INQUIRY_IP_SALT: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

function formatIssues(error: z.ZodError): string {
  return error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
}

const publicParsed = publicSchema.safeParse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
  NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
});

if (!publicParsed.success) {
  throw new Error(`Invalid public environment variables:\n${formatIssues(publicParsed.error)}`);
}

export const publicEnv = publicParsed.data;

/**
 * Canonical site origin. Explicit NEXT_PUBLIC_SITE_URL wins; on Vercel previews
 * fall back to the deployment URL; locally default to :3000.
 */
export const siteUrl: string =
  publicEnv.NEXT_PUBLIC_SITE_URL ??
  (publicEnv.NEXT_PUBLIC_VERCEL_URL ? `https://${publicEnv.NEXT_PUBLIC_VERCEL_URL}` : "http://localhost:3000");

let cachedServerEnv: z.infer<typeof serverSchema> | null = null;

/** Server-only variables. Call from server code only; throws on the client. */
export function serverEnv(): z.infer<typeof serverSchema> {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() was called in the browser");
  }
  if (cachedServerEnv) return cachedServerEnv;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid server environment variables:\n${formatIssues(parsed.error)}`);
  }
  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

/** Throws with a precise message when a server variable a feature depends on is absent. */
export function requireServerEnv<K extends keyof z.infer<typeof serverSchema>>(
  key: K,
): NonNullable<z.infer<typeof serverSchema>[K]> {
  const value = serverEnv()[key];
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing required environment variable ${key}. See docs/engineering/environment-variables.md`);
  }
  return value as NonNullable<z.infer<typeof serverSchema>[K]>;
}
