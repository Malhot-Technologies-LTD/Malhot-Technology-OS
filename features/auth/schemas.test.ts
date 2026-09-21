import { describe, expect, it } from "vitest";

import { changePasswordSchema, PASSWORD_MIN_LENGTH } from "./schemas";

const valid = {
  currentPassword: "old-password-1",
  password: "new-password-2",
  confirmPassword: "new-password-2",
};

function fieldErrors(input: Record<string, string>): Record<string, string[] | undefined> {
  const parsed = changePasswordSchema.safeParse(input);
  return parsed.success ? {} : parsed.error.flatten().fieldErrors;
}

describe("changePasswordSchema", () => {
  it("accepts a confirmed new password", () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it("requires the current password", () => {
    expect(fieldErrors({ ...valid, currentPassword: "" }).currentPassword).toBeDefined();
  });

  it("enforces the minimum length", () => {
    expect(fieldErrors({ ...valid, password: "a".repeat(PASSWORD_MIN_LENGTH - 1) }).password).toBeDefined();
  });

  it("rejects a mismatched confirmation", () => {
    expect(fieldErrors({ ...valid, confirmPassword: "something-else" }).confirmPassword).toBeDefined();
  });

  it("rejects reusing the current password", () => {
    const errors = fieldErrors({
      currentPassword: "same-password-12",
      password: "same-password-12",
      confirmPassword: "same-password-12",
    });
    expect(errors.password).toBeDefined();
  });
});
