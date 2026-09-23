import { describe, expect, it } from "vitest";

import { createProjectSchema, suggestProjectKey } from "./schemas";

const valid = {
  name: "Umoja Platform",
  key: "UMP",
  kind: "project" as const,
  description: "",
  clientName: "",
  priority: "medium" as const,
  startDate: "",
  targetEndDate: "",
};

describe("createProjectSchema", () => {
  it("accepts a minimal project and empties optional text to null", () => {
    const parsed = createProjectSchema.parse(valid);
    expect(parsed.description).toBeNull();
    expect(parsed.startDate).toBeNull();
  });

  it("upper-cases the key and rejects bad shapes", () => {
    expect(createProjectSchema.parse({ ...valid, key: "ump" }).key).toBe("UMP");
    expect(createProjectSchema.safeParse({ ...valid, key: "U" }).success).toBe(false);
    expect(createProjectSchema.safeParse({ ...valid, key: "TOOLONG" }).success).toBe(false);
    expect(createProjectSchema.safeParse({ ...valid, key: "UM1" }).success).toBe(false);
  });

  it("requires the target end date to follow the start date", () => {
    const bad = { ...valid, startDate: "2026-10-01", targetEndDate: "2026-09-01" };
    expect(createProjectSchema.safeParse(bad).success).toBe(false);
    const good = { ...valid, startDate: "2026-09-01", targetEndDate: "2026-10-01" };
    expect(createProjectSchema.safeParse(good).success).toBe(true);
  });

  it("allows one date without the other", () => {
    expect(createProjectSchema.safeParse({ ...valid, startDate: "2026-09-01" }).success).toBe(true);
    expect(createProjectSchema.safeParse({ ...valid, targetEndDate: "2026-09-01" }).success).toBe(true);
  });
});

describe("suggestProjectKey", () => {
  it("uses initials for multi-word names", () => {
    expect(suggestProjectKey("Malhot Technology OS")).toBe("MTO");
    expect(suggestProjectKey("Umoja Health Platform")).toBe("UHP");
  });

  it("uses the leading letters of a single word", () => {
    expect(suggestProjectKey("Umoja")).toBe("UMOJA");
  });

  it("caps at six letters", () => {
    expect(suggestProjectKey("Extraordinary")).toBe("EXTRAO");
    expect(suggestProjectKey("a b c d e f g h")).toBe("ABCDEF");
  });

  it("returns nothing when there are no letters", () => {
    expect(suggestProjectKey("2026 ---")).toBe("");
  });
});

describe("project kind and client", () => {
  it("defaults to an internal project with no client", () => {
    const parsed = createProjectSchema.parse(valid);
    expect(parsed.kind).toBe("project");
    expect(parsed.clientName).toBeNull();
  });

  it("accepts a job with a freely typed client name", () => {
    // The point of the change: the client need not exist yet.
    const parsed = createProjectSchema.parse({ ...valid, kind: "job", clientName: "Brand New Client Ltd" });
    expect(parsed.kind).toBe("job");
    expect(parsed.clientName).toBe("Brand New Client Ltd");
  });

  it("accepts a job whose client is not known yet", () => {
    expect(createProjectSchema.safeParse({ ...valid, kind: "job", clientName: "" }).success).toBe(true);
  });

  it("refuses a client on an internal project", () => {
    // Mirrors the projects_client_only_on_jobs check constraint.
    const result = createProjectSchema.safeParse({ ...valid, kind: "project", clientName: "Kivu Freight" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0].path).toEqual(["clientName"]);
  });

  it("rejects a kind outside the enum", () => {
    expect(createProjectSchema.safeParse({ ...valid, kind: "contract" }).success).toBe(false);
  });

  it("trims the client name so spacing cannot fork a client in two", () => {
    expect(createProjectSchema.parse({ ...valid, kind: "job", clientName: "  Kivu Freight  " }).clientName).toBe(
      "Kivu Freight",
    );
  });
});
