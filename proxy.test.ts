import { beforeAll, describe, expect, it, vi } from "vitest";

/**
 * The matcher is a JavaScript *string*, not a regex literal, so every backslash
 * has to survive one round of string escaping before it reaches the matcher.
 * `\.` is not a recognised escape: JS silently drops the backslash and the
 * pattern ends up with `.` meaning "any character". That is how `/os/mysvg`
 * came to match the image-extension group and skip the session refresh.
 *
 * These assertions pin both halves: real routes run the proxy, real assets do
 * not, and a path that merely *ends in the letters* of an extension is a route.
 *
 * `proxy.ts` pulls in the Supabase client, which validates env at module load,
 * so the import is deferred until after the variables are stubbed. The values
 * are never used — nothing here makes a request.
 */
let matcher: RegExp;
let pattern: string;

beforeAll(async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://stub.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "stub-key");
  const { config } = await import("./proxy");
  pattern = config.matcher[0];
  matcher = new RegExp(`^${pattern}$`);
});

describe("proxy matcher", () => {
  it("keeps a literal dot before the extension group", () => {
    // The bug: "\\." collapsing to "." so any character matched.
    expect(pattern).toContain("\\.");
  });

  it.each([
    "/",
    "/login",
    "/os",
    "/os/projects",
    "/os/projects/new",
    "/os/projects/MAL",
    "/os/settings/members",
    "/contact",
    // Ends with the letters of an extension but has no dot: still a route.
    "/os/mysvg",
    "/logopng",
  ])("runs on %s", (path) => {
    expect(matcher.test(path)).toBe(true);
  });

  it.each([
    "/favicon.ico",
    "/logo.svg",
    "/hero.png",
    "/photo.jpeg",
    "/robots.txt",
    "/sitemap.xml",
    "/fonts/geist.woff2",
    "/_next/static/chunks/main.js",
    "/_next/image",
  ])("skips %s", (path) => {
    expect(matcher.test(path)).toBe(false);
  });
});
