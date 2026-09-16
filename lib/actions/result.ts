/**
 * Server Action result contract (docs/engineering/error-handling.md).
 * Actions never throw for expected failures; they return `fail(...)`.
 */

export type ActionErrorCode =
  | "validation"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "invalid_transition"
  | "invariant"
  | "rate_limited"
  | "external"
  | "unexpected";

export type ActionError = {
  code: ActionErrorCode;
  message: string;
  fieldErrors?: Record<string, string[]>;
  /** Short reference id shown to the user for unexpected errors. */
  ref?: string;
};

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: ActionError };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(
  code: ActionErrorCode,
  message: string,
  extra?: Pick<ActionError, "fieldErrors" | "ref">,
): ActionResult<T> {
  return { ok: false, error: { code, message, ...extra } };
}

const DEFAULT_MESSAGES: Record<ActionErrorCode, string> = {
  validation: "Some fields need attention.",
  unauthenticated: "You need to sign in to do that.",
  forbidden: "You do not have permission to do that.",
  not_found: "That item does not exist or was deleted.",
  conflict: "That conflicts with something that already exists.",
  invalid_transition: "That change is not allowed from the current state.",
  invariant: "That change would break a rule of the system.",
  rate_limited: "Too many attempts. Please wait a moment and try again.",
  external: "An external service did not respond. Please try again.",
  unexpected: "Something went wrong on our side. Please try again.",
};

export function defaultMessage(code: ActionErrorCode): string {
  return DEFAULT_MESSAGES[code];
}
