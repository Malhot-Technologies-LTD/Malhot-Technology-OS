import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import type { ActionError } from "@/lib/actions/result";

/**
 * Maps a failed ActionResult back into React Hook Form: field errors land on
 * their fields, everything else on the form-level `root` error.
 */
export function applyActionError<T extends FieldValues>(setError: UseFormSetError<T>, error: ActionError): void {
  const fieldErrors = error.fieldErrors ?? {};
  let placed = false;
  for (const [field, messages] of Object.entries(fieldErrors)) {
    const message = messages[0];
    if (!message) continue;
    setError(field as Path<T>, { type: "server", message });
    placed = true;
  }
  if (!placed) setError("root", { type: "server", message: error.message });
}
