/**
 * Human messages for Supabase Auth failures. Pure; unit-tested.
 * Codes: https://supabase.com/docs/guides/auth/debugging/error-codes
 */

const SIGNUP_DISABLED =
  "No Malhot account uses that email. Sign in with the email you were invited with, or ask an admin for an invitation.";

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: "That email and password combination is not right.",
  email_not_confirmed: "Confirm your email address first — check your inbox for the confirmation link.",
  user_not_found: SIGNUP_DISABLED,
  signup_disabled: SIGNUP_DISABLED,
  otp_expired: "That link has expired. Request a new one.",
  otp_disabled: "Email links are not available right now. Sign in with your password instead.",
  over_request_rate_limit: "Too many attempts. Wait a minute and try again.",
  over_email_send_rate_limit: "We recently sent an email to that address. Wait a minute before requesting another.",
  weak_password: "Choose a stronger password: at least 12 characters and not a commonly used one.",
  same_password: "The new password must be different from the current one.",
  session_expired: "Your session has expired. Sign in again.",
  session_not_found: "Your session has expired. Sign in again.",
  validation_failed: "Check the email address and try again.",
  email_address_invalid: "That does not look like a valid email address.",
  identity_already_exists: "That account is already linked to another user.",
  provider_disabled: "That sign-in method is not enabled.",
  bad_oauth_state: "The sign-in attempt could not be verified. Try again.",
  bad_oauth_callback: "The sign-in attempt could not be verified. Try again.",
  flow_state_expired: "That sign-in attempt timed out. Try again.",
  flow_state_not_found: "That sign-in attempt timed out. Try again.",
};

const GENERIC = "Sign-in failed. Try again, or ask an admin if it keeps happening.";

/** Message for an error returned by a supabase-js auth call. */
export function authErrorMessage(error: { code?: string | undefined; status?: number | undefined }): string {
  if (error.code && AUTH_MESSAGES[error.code]) return AUTH_MESSAGES[error.code];
  if (error.status === 429) return AUTH_MESSAGES.over_request_rate_limit as string;
  return GENERIC;
}

/**
 * Message for a failed redirect back from Supabase (`/auth/callback?error=…`).
 * Supabase sends `error`, `error_code` and `error_description`.
 */
export function callbackErrorMessage(params: {
  error?: string | null;
  errorCode?: string | null;
  errorDescription?: string | null;
}): string {
  if (params.errorCode && AUTH_MESSAGES[params.errorCode]) return AUTH_MESSAGES[params.errorCode];
  if (params.errorDescription?.toLowerCase().includes("signups not allowed")) return SIGNUP_DISABLED;
  if (params.error === "access_denied") return "That sign-in link was refused. Request a new one.";
  if (params.error === "exchange_failed") return "That sign-in link is invalid or was already used. Request a new one.";
  if (params.error === "missing_code") return "That sign-in link is incomplete. Request a new one.";
  if (params.error === "invalid_link") return "That link is invalid. Request a new one.";
  return GENERIC;
}
