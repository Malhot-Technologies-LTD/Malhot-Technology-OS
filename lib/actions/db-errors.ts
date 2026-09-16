import type { PostgrestError } from "@supabase/supabase-js";

import { type ActionError, type ActionErrorCode, defaultMessage } from "@/lib/actions/result";

/** Friendly messages for unique constraints, keyed by constraint name. */
const UNIQUE_MESSAGES: Record<string, string> = {
  organizations_slug_key: "That organisation URL is already in use.",
  organization_members_organization_id_user_id_key: "That person is already a member.",
  invitations_pending_email_idx: "An invitation for that email is already pending.",
  clients_organization_id_name_key: "A client with that name already exists.",
};

const MALHOT_PREFIX = "MALHOT:";

/**
 * Maps a PostgrestError to an ActionError. Trigger-raised errors carry
 * `MALHOT:<code>:<detail>`; the detail is written for humans and is shown as-is.
 */
export function mapDbError(error: PostgrestError): ActionError {
  if (error.message.startsWith(MALHOT_PREFIX)) {
    const [, code, ...rest] = error.message.split(":");
    const detail = rest.join(":").trim();
    const mapped: ActionErrorCode =
      code === "forbidden" || code === "invalid_transition" || code === "invariant" ? code : "invariant";
    return { code: mapped, message: detail || defaultMessage(mapped) };
  }

  switch (error.code) {
    case "23505": {
      const constraint = /constraint "([^"]+)"/.exec(error.message)?.[1] ?? "";
      return { code: "conflict", message: UNIQUE_MESSAGES[constraint] ?? defaultMessage("conflict") };
    }
    case "23503":
      return { code: "validation", message: "A referenced item no longer exists." };
    case "23514":
      return { code: "validation", message: "One of the values is out of range." };
    case "42501":
      return { code: "forbidden", message: defaultMessage("forbidden") };
    case "PGRST116":
      // .single() found no rows: either it does not exist or RLS hid it. Do not disclose which.
      return { code: "not_found", message: defaultMessage("not_found") };
    default:
      return { code: "unexpected", message: defaultMessage("unexpected") };
  }
}
