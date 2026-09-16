import "server-only";

import { isRedirectError } from "next/dist/client/components/redirect-error";

import { type ActionResult, defaultMessage } from "@/lib/actions/result";
import { logger } from "@/lib/logger";

function shortRef(): string {
  // 8-char base32-ish reference for support lookups; not a secret.
  return Math.random().toString(32).slice(2, 10).toUpperCase();
}

/**
 * Wraps a Server Action so unexpected throws become `fail('unexpected')` with a
 * reference id, while Next.js redirect() signals propagate untouched.
 */
export function withAction<Args extends unknown[], T>(
  name: string,
  fn: (...args: Args) => Promise<ActionResult<T>>,
): (...args: Args) => Promise<ActionResult<T>> {
  return async (...args: Args) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (isRedirectError(error)) throw error;
      const ref = shortRef();
      logger.error("action.unexpected", { action: name, ref, error: serialiseError(error) });
      return { ok: false, error: { code: "unexpected", message: `${defaultMessage("unexpected")} (ref ${ref})`, ref } };
    }
  };
}

function serialiseError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) return { name: error.name, message: error.message, stack: error.stack };
  return { value: String(error) };
}
