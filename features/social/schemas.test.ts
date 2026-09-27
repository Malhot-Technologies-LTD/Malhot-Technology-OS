import { describe, expect, it } from "vitest";

import { accountSchema, nextStatus, postSchema } from "./schemas";

describe("postSchema", () => {
  it("accepts a bare idea with only a title", () => {
    const parsed = postSchema.parse({ title: "Team photo Friday", caption: "", scheduledAt: "", assetUrl: "" });
    expect(parsed).toMatchObject({ status: "idea", format: "post", caption: null, scheduledAt: null, accountIds: [] });
  });

  it("refuses to schedule a post without a time", () => {
    const result = postSchema.safeParse({ title: "Launch", status: "scheduled", scheduledAt: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["scheduledAt"]);
  });

  it("keeps instants as ISO and asset links https only", () => {
    const parsed = postSchema.parse({ title: "Launch", scheduledAt: "2026-10-06T08:00:00.000Z" });
    expect(parsed.scheduledAt).toBe("2026-10-06T08:00:00.000Z");
    expect(postSchema.safeParse({ title: "x", assetUrl: "http://canva.com/x" }).success).toBe(false);
    expect(postSchema.safeParse({ title: "x", assetUrl: "javascript:alert(1)" }).success).toBe(false);
  });

  it("rejects channels that are not ids", () => {
    expect(postSchema.safeParse({ title: "x", accountIds: ["instagram"] }).success).toBe(false);
  });
});

describe("accountSchema", () => {
  it("reads follower counts written with separators", () => {
    const parsed = accountSchema.parse({
      platform: "instagram",
      handle: "malhottech",
      profileUrl: "",
      followers: "12,400",
      notes: "",
    });
    expect(parsed.followers).toBe(12400);
    expect(
      accountSchema.parse({ platform: "x", handle: "m", profileUrl: "", followers: "", notes: "" }).followers,
    ).toBeNull();
  });

  it("rejects unknown platforms and fractional followers", () => {
    expect(
      accountSchema.safeParse({ platform: "myspace", handle: "m", profileUrl: "", followers: "", notes: "" }).success,
    ).toBe(false);
    expect(
      accountSchema.safeParse({ platform: "x", handle: "m", profileUrl: "", followers: "1.5", notes: "" }).success,
    ).toBe(false);
  });
});

describe("nextStatus", () => {
  it("walks the pipeline and stops at published", () => {
    expect(nextStatus("idea")).toBe("draft");
    expect(nextStatus("scheduled")).toBe("published");
    expect(nextStatus("published")).toBeNull();
  });
});
