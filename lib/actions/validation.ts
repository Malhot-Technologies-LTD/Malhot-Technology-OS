import { z } from "zod";

import { type ActionResult, defaultMessage } from "@/lib/actions/result";

/** Converts a Zod failure into `fail('validation')` with per-field messages the form can map back. */
export function validationFail<T = never>(error: z.ZodError): ActionResult<T> {
  const { fieldErrors, formErrors } = z.flattenError(error);
  const cleaned: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(fieldErrors as Record<string, string[] | undefined>)) {
    if (messages && messages.length > 0) cleaned[field] = messages;
  }
  return {
    ok: false,
    error: {
      code: "validation",
      message: formErrors[0] ?? defaultMessage("validation"),
      fieldErrors: cleaned,
    },
  };
}
