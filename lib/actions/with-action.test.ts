import { redirect } from "next/navigation";
import { describe, expect, it, vi } from "vitest";

import { ok } from "@/lib/actions/result";
import { withAction } from "@/lib/actions/with-action";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

/**
 * `withAction` turns unexpected throws into a result the form can render. The
 * hazard is that Next.js uses *throwing* for control flow, so the catch must
 * let those signals past untouched.
 *
 * This is not hypothetical. `createProject` ends in `redirect()`; when that
 * signal was swallowed, the project was created and the person was still shown
 * "Something went wrong on our side. Please try again. (ref XXXX)" — a ref is
 * only ever attached here, never by a mapped database error, so that message is
 * the signature of this bug.
 *
 * The errors below are produced by calling the real Next APIs rather than by
 * hand-writing a `digest` string, so the test keeps testing the real contract
 * if Next changes the encoding.
 */
function captureRedirect(): unknown {
  try {
    redirect("/os/projects/MAL");
  } catch (error) {
    return error;
  }
  throw new Error("redirect() did not throw");
}

describe("withAction", () => {
  it("returns the action's own result untouched", async () => {
    const action = withAction("test.ok", async () => ok("done"));
    await expect(action()).resolves.toEqual({ ok: true, data: "done" });
  });

  it("lets a redirect signal through", async () => {
    const signal = captureRedirect();
    const action = withAction("test.redirect", async () => {
      throw signal;
    });
    await expect(action()).rejects.toBe(signal);
  });

  it("lets a redirect through even when something has wrapped it", async () => {
    // The regression: the previous implementation checked `error.digest` on the
    // thrown object only. A wrapper hides the digest, so the signal was
    // swallowed and a successful create reported an unexpected failure.
    //
    // What propagates is the *inner* signal, not the wrapper: unstable_rethrow
    // walks the `cause` chain and rethrows the bare error, which is the shape
    // Next's own machinery expects to receive.
    const signal = captureRedirect();
    const wrapped = new Error("Failed to execute server action", { cause: signal });
    const action = withAction("test.wrapped", async () => {
      throw wrapped;
    });
    await expect(action()).rejects.toBe(signal);
  });

  it("converts a genuine error into a failure with a reference", async () => {
    const action = withAction("test.boom", async () => {
      throw new Error("database exploded");
    });
    const result = await action();

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("unexpected");
    expect(result.error.ref).toMatch(/^[A-Z0-9]{1,8}$/);
    // The ref is echoed in the message so a person can quote it from the screen.
    expect(result.error.message).toContain(result.error.ref!);
    // Internal detail never reaches the user.
    expect(result.error.message).not.toContain("database exploded");
  });
});
