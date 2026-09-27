import { timingSafeEqual } from "node:crypto";

import { syncInstagram } from "@/features/social/instagram/sync";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { listAllConnections } from "@/lib/supabase/elevated/social-connections";

// Within the Hobby plan limit; a sync is ~15 seconds per account.
export const maxDuration = 60;

/**
 * Daily sync of every connected social account (vercel.json: 03:00 UTC, which
 * is 05:00 in Kigali, so yesterday's figures are in before the working day).
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; anything else is
 * refused, and without the secret configured the route does nothing.
 */
export async function GET(request: Request) {
  const secret = serverEnv().CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  const authorised =
    Boolean(secret) && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!authorised) return Response.json({ error: "unauthorised" }, { status: 401 });

  const connections = await listAllConnections();
  const results: { account: string; ok: boolean; message?: string }[] = [];
  // One at a time: a handful of accounts, and Instagram rate-limits per account.
  for (const connection of connections) {
    const outcome = await syncInstagram(connection);
    results.push({
      account: connection.account_id,
      ok: outcome.ok,
      ...(outcome.ok ? {} : { message: outcome.message }),
    });
  }
  logger.info("social.cron_sync", { total: results.length, failed: results.filter((row) => !row.ok).length });
  return Response.json({ synced: results }, { headers: { "Cache-Control": "no-store" } });
}
