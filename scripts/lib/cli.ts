import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

import type { Database } from "@/types/database";

/**
 * Shared plumbing for operational scripts (`npx tsx scripts/<name>.ts`).
 * Reads .env.local (or the file named by ENV_FILE) so the same script can be
 * pointed at staging or production by swapping the env file.
 */

export function loadEnv(): { supabaseUrl: string; secretKey: string; siteUrl: string } {
  loadDotenv({ path: process.env.ENV_FILE ?? ".env.local", quiet: true });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  if (!supabaseUrl || !secretKey) {
    fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set (see .env.example).");
  }
  return { supabaseUrl, secretKey, siteUrl };
}

export function adminClient(env: { supabaseUrl: string; secretKey: string }) {
  return createClient<Database>(env.supabaseUrl, env.secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Minimal `--key value` / `--flag` parser; enough for operational scripts, no dependency. */
export function parseArgs(argv: readonly string[]): Record<string, string | true> {
  const out: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg?.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

export function requireArg(args: Record<string, string | true>, key: string): string {
  const value = args[key];
  if (typeof value !== "string" || value.length === 0) fail(`Missing --${key}`);
  return value;
}

export function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

export function generatePassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789-_";
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
