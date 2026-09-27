import { describe, expect, it } from "vitest";

import {
  authorizeUrl,
  classifyError,
  cleanCode,
  normalisePermalink,
  parseInsightValues,
  parseLongToken,
  parseMediaList,
  parseProfile,
  parseShortToken,
} from "./api";

describe("login", () => {
  it("asks for read-only scopes and carries the state", () => {
    const url = new URL(authorizeUrl({ appId: "123", redirectUri: "https://os.test/cb", state: "s1" }));
    expect(url.origin + url.pathname).toBe("https://www.instagram.com/oauth/authorize");
    expect(url.searchParams.get("scope")).toBe("instagram_business_basic,instagram_business_manage_insights");
    expect(url.searchParams.get("state")).toBe("s1");
    expect(url.searchParams.get("response_type")).toBe("code");
  });

  it("strips the #_ Instagram appends to the code", () => {
    expect(cleanCode("AQBx#_")).toBe("AQBx");
    expect(cleanCode("AQBx")).toBe("AQBx");
  });

  it("reads the short-lived token in either response shape", () => {
    expect(parseShortToken({ access_token: "t", user_id: 178, permissions: "a,b" })).toEqual({
      accessToken: "t",
      userId: "178",
      permissions: ["a", "b"],
    });
    expect(parseShortToken({ data: [{ access_token: "t", user_id: "9", permissions: ["x"] }] }).permissions).toEqual([
      "x",
    ]);
    expect(() => parseShortToken({ error_message: "nope" })).toThrow();
  });

  it("turns expires_in into an expiry instant", () => {
    const now = Date.parse("2026-10-07T00:00:00Z");
    expect(parseLongToken({ access_token: "L", token_type: "bearer", expires_in: 5184000 }, now)).toEqual({
      accessToken: "L",
      expiresAt: "2026-12-06T00:00:00.000Z",
    });
  });
});

describe("errors", () => {
  it("tells a lost login from rate limiting from anything else", () => {
    expect(classifyError(400, { error: { code: 190, type: "OAuthException", message: "expired" } }).kind).toBe("auth");
    expect(classifyError(400, { error: { code: 4 } }).kind).toBe("rate_limited");
    expect(classifyError(400, { error: { code: 100, message: "metric" } }).kind).toBe("unsupported");
    expect(classifyError(500, null).kind).toBe("other");
  });
});

describe("reading figures", () => {
  it("reads the profile, rejecting nonsense counts", () => {
    expect(
      parseProfile({
        user_id: "178",
        username: "malhottech",
        followers_count: 1240,
        follows_count: -1,
        media_count: 88,
      }),
    ).toEqual({ userId: "178", username: "malhottech", followers: 1240, follows: null, mediaCount: 88 });
  });

  it("reads both total_value and values[] insight shapes", () => {
    const values = parseInsightValues({
      data: [
        { name: "reach", total_value: { value: 530 } },
        { name: "saved", values: [{ value: 12 }] },
        { name: "views" },
      ],
    });
    expect(Object.fromEntries(values)).toEqual({ reach: 530, saved: 12 });
  });

  it("reads media and skips malformed entries", () => {
    const media = parseMediaList({
      data: [
        {
          id: "1",
          caption: "Launch day",
          media_type: "CAROUSEL_ALBUM",
          media_product_type: "FEED",
          permalink: "https://www.instagram.com/p/Cx1/",
          timestamp: "2026-10-06T08:00:00+0000",
          like_count: 40,
          comments_count: 3,
        },
        { caption: "no id" },
      ],
    });
    expect(media).toEqual([
      {
        id: "1",
        caption: "Launch day",
        mediaType: "CAROUSEL_ALBUM",
        productType: "FEED",
        permalink: "https://www.instagram.com/p/Cx1/",
        postedAt: "2026-10-06T08:00:00.000Z",
        likes: 40,
        comments: 3,
      },
    ]);
  });
});

describe("normalisePermalink", () => {
  it("matches the same post however the link was copied", () => {
    const forms = [
      "https://www.instagram.com/p/Cx1AbC/",
      "https://instagram.com/p/Cx1AbC",
      "https://www.instagram.com/reel/Cx1AbC/?igsh=abc",
      "https://www.instagram.com/malhottech/p/Cx1AbC/",
    ];
    expect(new Set(forms.map(normalisePermalink))).toEqual(new Set(["instagram:Cx1AbC"]));
  });

  it("keeps shortcodes case-sensitive and ignores other sites", () => {
    expect(normalisePermalink("https://www.instagram.com/p/cx1abc/")).not.toBe(
      normalisePermalink("https://www.instagram.com/p/Cx1AbC/"),
    );
    expect(normalisePermalink("https://evil.test/p/Cx1AbC/")).toBeNull();
    expect(normalisePermalink("not a url")).toBeNull();
  });
});
