import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { safeNext } from "@/lib/auth/redirects";
import { siteUrl } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Single landing point for every Supabase redirect (docs/architecture/authentication-architecture.md).
 *
 * Two shapes arrive here:
 *  - `?code=…`                      PKCE exchange for flows this app started in the same browser
 *                                   (magic link, password reset) — and OAuth if it is ever enabled.
 *  - `?token_hash=…&type=…`         Links from the templates in supabase/templates/ (needed for
 *                                   admin-initiated invites, which have no PKCE verifier).
 * Supabase failures arrive as `?error=…&error_code=…&error_description=…`.
 */

const otpType = z.enum(["signup", "invite", "recovery", "magiclink", "email", "email_change"]);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNext(params.get("next"), siteUrl);

  const error = params.get("error");
  if (error) {
    return toLogin({
      error,
      error_code: params.get("error_code"),
      error_description: params.get("error_description"),
    });
  }

  const supabase = await createClient();

  const tokenHash = params.get("token_hash");
  const type = otpType.safeParse(params.get("type"));
  if (tokenHash && type.success) {
    const { error: verifyError } = await supabase.auth.verifyOtp({ type: type.data, token_hash: tokenHash });
    if (verifyError) {
      logger.info("auth.callback.verify_failed", { type: type.data, code: verifyError.code });
      return toLogin({ error: "exchange_failed", error_code: verifyError.code ?? null });
    }
    return NextResponse.redirect(new URL(next, siteUrl));
  }

  const code = params.get("code");
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      logger.info("auth.callback.exchange_failed", { code: exchangeError.code });
      return toLogin({ error: "exchange_failed", error_code: exchangeError.code ?? null });
    }
    return NextResponse.redirect(new URL(next, siteUrl));
  }

  return toLogin({ error: "missing_code" });
}

function toLogin(params: Record<string, string | null | undefined>) {
  const url = new URL("/login", siteUrl);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}
