import { describe, expect, it } from "vitest";

import type { MediaStat, SnapshotRow } from "../queries";
import { dailySeries, engagementRate, topPosts } from "./figures";

const NOW = Date.parse("2026-10-07T10:00:00Z");

const snap = (account_id: string, day: string, patch: Partial<SnapshotRow>): SnapshotRow => ({
  account_id,
  day,
  followers: null,
  reach: null,
  views: null,
  accounts_engaged: null,
  interactions: null,
  ...patch,
});

describe("dailySeries", () => {
  it("sums reach across accounts and derives followers gained day over day", () => {
    const series = dailySeries(
      [
        snap("a", "2026-10-05", { followers: 100 }),
        snap("a", "2026-10-06", { followers: 104, reach: 300 }),
        snap("b", "2026-10-06", { reach: 50 }),
        snap("a", "2026-10-07", { followers: 103 }),
      ],
      NOW,
      3,
    );
    expect(series).toEqual([
      { day: "2026-10-05", reach: null, gained: null },
      { day: "2026-10-06", reach: 350, gained: 4 },
      { day: "2026-10-07", reach: null, gained: -1 },
    ]);
  });

  it("leaves gaps where there was no sync, rather than inventing zeros", () => {
    const series = dailySeries([snap("a", "2026-10-07", { followers: 10 })], NOW, 2);
    expect(series.every((point) => point.gained === null)).toBe(true);
  });
});

const stat = (id: string, patch: Partial<MediaStat>): MediaStat => ({
  account_id: "a",
  external_id: id,
  permalink: null,
  caption: null,
  media_type: "IMAGE",
  product_type: "FEED",
  posted_at: "2026-10-01T09:00:00Z",
  likes: null,
  comments: null,
  saves: null,
  shares: null,
  reach: null,
  views: null,
  interactions: null,
  synced_at: "2026-10-07T03:00:00Z",
  ...patch,
});

describe("topPosts", () => {
  it("ranks recent posts by reach, falling back to interactions", () => {
    const ranked = topPosts(
      [
        stat("low", { reach: 100 }),
        stat("high", { reach: 900 }),
        stat("no-reach", { likes: 40, comments: 10 }),
        stat("old", { reach: 5000, posted_at: "2026-08-01T09:00:00Z" }),
      ],
      NOW,
    );
    expect(ranked.map((row) => row.external_id)).toEqual(["high", "low", "no-reach"]);
  });

  it("computes engagement only when reach is known", () => {
    expect(engagementRate({ reach: 200, interactions: 30 })).toBe(0.15);
    expect(engagementRate({ reach: null, interactions: 30 })).toBeNull();
    expect(engagementRate({ reach: 0, interactions: 0 })).toBeNull();
  });
});
