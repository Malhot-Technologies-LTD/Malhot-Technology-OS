import { describe, expect, it } from "vitest";

import { CLIENT_JOURNEY } from "./client-journey";

describe("client journey", () => {
  const keys = CLIENT_JOURNEY.flatMap((stage) => stage.templates.map((template) => template.key));

  it("lists each template once", () => {
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("never offers internal or HR templates to a client", () => {
    for (const stage of CLIENT_JOURNEY)
      for (const template of stage.templates) expect(["HR & Recruitment", "Internal"]).not.toContain(template.category);
  });
});
