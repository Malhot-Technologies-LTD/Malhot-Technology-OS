import { describe, expect, it } from "vitest";

import { authErrorMessage, callbackErrorMessage } from "./auth-errors";

describe("authErrorMessage", () => {
  it("maps known codes", () => {
    expect(authErrorMessage({ code: "invalid_credentials" })).toMatch(/not right/);
    expect(authErrorMessage({ code: "weak_password" })).toMatch(/12 characters/);
  });

  it("treats unknown users like disabled sign-up (invite-only)", () => {
    expect(authErrorMessage({ code: "user_not_found" })).toMatch(/invited/);
    expect(authErrorMessage({ code: "signup_disabled" })).toMatch(/invited/);
  });

  it("uses status 429 when no code is present", () => {
    expect(authErrorMessage({ status: 429 })).toMatch(/Too many attempts/);
  });

  it("falls back to a generic message", () => {
    expect(authErrorMessage({ code: "something_new" })).toMatch(/Sign-in failed/);
    expect(authErrorMessage({})).toMatch(/Sign-in failed/);
  });
});

describe("callbackErrorMessage", () => {
  it("prefers error_code", () => {
    expect(callbackErrorMessage({ error: "access_denied", errorCode: "otp_expired" })).toMatch(/expired/);
  });

  it("recognises sign-in attempts for an unknown email", () => {
    expect(
      callbackErrorMessage({ error: "access_denied", errorDescription: "Signups not allowed for this instance" }),
    ).toMatch(/invited/);
  });

  it("explains refusals and our own callback failures", () => {
    expect(callbackErrorMessage({ error: "access_denied" })).toMatch(/refused/);
    expect(callbackErrorMessage({ error: "exchange_failed" })).toMatch(/already used/);
    expect(callbackErrorMessage({ error: "missing_code" })).toMatch(/incomplete/);
  });
});
