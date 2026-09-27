import { describe, expect, it } from "vitest";

import { parseTaskRef, taskHref } from "./links";

describe("task references", () => {
  it("builds the task page address", () => {
    expect(taskHref("MAL", 42)).toBe("/os/tasks/MAL-42");
  });

  it("parses references case-insensitively", () => {
    expect(parseTaskRef("mal-42")).toEqual({ key: "MAL", seq: 42 });
  });

  it("rejects anything that is not KEY-number", () => {
    for (const ref of ["MAL", "42", "M-1", "TOOLONGKEY-1", "MAL-", "MAL-4x", "MAL-1-2"]) {
      expect(parseTaskRef(ref)).toBeNull();
    }
  });
});
