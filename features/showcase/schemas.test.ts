import { describe, expect, it } from "vitest";

import { isShowcaseImagePath, showcaseImagePath, showcaseSchema, slugify, splitLines } from "./schemas";

const ORG = "11111111-1111-4111-8111-111111111111";
const PROJECT = "22222222-2222-4222-8222-222222222222";
const FILE = "33333333-3333-4333-8333-333333333333";

const valid = {
  projectId: PROJECT,
  title: "Agri Connect",
  slug: "agri-connect",
  category: "Web",
  scope: "",
  year: "2025",
  clientLabel: "",
  summary: "A marketplace for cooperatives.",
  overview: "",
  features: "",
  stack: "",
  liveUrl: "",
  published: true,
} as const;

describe("slugify", () => {
  it("turns a title into a web address", () => {
    expect(slugify("AGRI CONNECT — v2")).toBe("agri-connect-v2");
    expect(slugify("  Café Délice  ")).toBe("cafe-delice");
  });

  it("returns an empty string when nothing usable is left", () => {
    expect(slugify("—!!—")).toBe("");
  });

  it("never ends in a hyphen after truncation", () => {
    const slug = slugify(`${"a".repeat(79)} b`);
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("splitLines", () => {
  it("drops blanks and duplicates and trims each line", () => {
    expect(splitLines(" Next.js \n\nSupabase\r\nNext.js\n")).toEqual(["Next.js", "Supabase"]);
  });
});

describe("showcaseSchema", () => {
  it("accepts a minimal entry and normalises empty optionals to null", () => {
    const parsed = showcaseSchema.parse(valid);
    expect(parsed).toMatchObject({ scope: null, clientLabel: null, overview: null, liveUrl: null, year: 2025 });
    expect(parsed.features).toEqual([]);
  });

  it("requires a summary", () => {
    expect(showcaseSchema.safeParse({ ...valid, summary: "  " }).success).toBe(false);
  });

  it("rejects addresses the database would refuse", () => {
    for (const slug of ["Agri Connect", "agri--connect", "-agri", "agri_connect"]) {
      expect(showcaseSchema.safeParse({ ...valid, slug }).success).toBe(false);
    }
  });

  it("lower-cases the address", () => {
    expect(showcaseSchema.parse({ ...valid, slug: "Agri-Connect" }).slug).toBe("agri-connect");
  });

  it("only accepts https live links", () => {
    expect(showcaseSchema.safeParse({ ...valid, liveUrl: "http://example.com" }).success).toBe(false);
    expect(showcaseSchema.safeParse({ ...valid, liveUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(showcaseSchema.parse({ ...valid, liveUrl: "https://example.com" }).liveUrl).toBe("https://example.com");
  });

  it("rejects implausible years", () => {
    expect(showcaseSchema.safeParse({ ...valid, year: "25" }).success).toBe(false);
    expect(showcaseSchema.safeParse({ ...valid, year: "1999" }).success).toBe(false);
  });

  it("caps feature lists at 20 entries", () => {
    const features = Array.from({ length: 21 }, (_, i) => `Feature ${i}`).join("\n");
    expect(showcaseSchema.safeParse({ ...valid, features }).success).toBe(false);
  });
});

describe("showcase image paths", () => {
  it("accepts the path it builds", () => {
    const path = showcaseImagePath(ORG, PROJECT, FILE, "image/webp");
    expect(path).toBe(`${ORG}/showcase/${PROJECT}/${FILE}.webp`);
    expect(isShowcaseImagePath(path, ORG, PROJECT)).toBe(true);
  });

  it("refuses a file from another organisation or project", () => {
    const other = "44444444-4444-4444-8444-444444444444";
    expect(isShowcaseImagePath(showcaseImagePath(other, PROJECT, FILE, "image/png"), ORG, PROJECT)).toBe(false);
    expect(isShowcaseImagePath(showcaseImagePath(ORG, other, FILE, "image/png"), ORG, PROJECT)).toBe(false);
  });

  it("refuses traversal and unexpected extensions", () => {
    expect(isShowcaseImagePath(`${ORG}/showcase/${PROJECT}/../${FILE}.png`, ORG, PROJECT)).toBe(false);
    expect(isShowcaseImagePath(`${ORG}/showcase/${PROJECT}/${FILE}.svg`, ORG, PROJECT)).toBe(false);
    expect(isShowcaseImagePath(`${ORG}/showcase/${PROJECT}/${FILE}.png/extra`, ORG, PROJECT)).toBe(false);
  });
});
