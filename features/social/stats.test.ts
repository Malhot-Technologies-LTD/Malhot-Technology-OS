import { describe, expect, it } from "vitest";

import { computeSocialStats, type SocialAccountRow, type SocialPostRow } from "./stats";

// Wednesday 7 October 2026, 12:00 in Kigali (UTC+2).
const NOW = Date.parse("2026-10-07T10:00:00Z");
const DAY = 86_400_000;
const at = (days: number) => new Date(NOW + days * DAY).toISOString();

const account = (id: string, patch: Partial<SocialAccountRow> = {}): SocialAccountRow => ({
  id,
  platform: "instagram",
  handle: id,
  profile_url: null,
  status: "active",
  followers: null,
  followers_updated_at: null,
  notes: null,
  ...patch,
});

let seq = 0;
const post = (patch: Partial<SocialPostRow>): SocialPostRow => ({
  id: `p${++seq}`,
  title: "Post",
  caption: null,
  format: "post",
  status: "idea",
  scheduled_at: null,
  published_at: null,
  pillar: null,
  asset_url: null,
  notes: null,
  created_at: at(-60),
  updated_at: at(-1),
  owner: null,
  channels: [],
  ...patch,
});

const IG = account("ig", { platform: "instagram", followers: 1200 });
const LI = account("li", { platform: "linkedin" });
const on = (...ids: string[]) => ids.map((account_id) => ({ account_id, published_url: null }));

describe("computeSocialStats", () => {
  it("counts what is booked for the coming week, and only scheduled posts", () => {
    const stats = computeSocialStats(
      [
        post({ status: "scheduled", scheduled_at: at(2) }),
        post({ status: "scheduled", scheduled_at: at(9) }), // beyond the week
        post({ status: "approved", scheduled_at: at(3) }), // dated but not booked
      ],
      [IG],
      NOW,
      "Africa/Kigali",
    );
    expect(stats.scheduledNext7).toBe(1);
    expect(stats.upcoming.map((row) => row.scheduled_at)).toEqual([at(2), at(3), at(9)]);
  });

  it("compares this month with last month on the reader's calendar", () => {
    const stats = computeSocialStats(
      [
        post({ status: "published", published_at: "2026-10-01T08:00:00Z" }),
        post({ status: "published", published_at: "2026-09-15T08:00:00Z" }),
        post({ status: "published", published_at: "2026-09-02T08:00:00Z" }),
        // 23:30 on 30 September in Kigali, though already October in UTC+3 and later.
        post({ status: "published", published_at: "2026-09-30T21:30:00Z" }),
      ],
      [],
      NOW,
      "Africa/Kigali",
    );
    expect(stats.publishedThisMonth).toBe(1);
    expect(stats.publishedLastMonth).toBe(3);
  });

  it("flags missed slots and approved posts without a date", () => {
    const missed = post({ status: "scheduled", scheduled_at: at(-1) });
    const undated = post({ status: "approved" });
    const fine = post({ status: "draft", scheduled_at: at(-2) }); // drafts are not promises yet
    const stats = computeSocialStats([missed, undated, fine], [], NOW, "UTC");
    expect(stats.attention).toEqual([
      { post: missed, reason: "overdue" },
      { post: undated, reason: "unscheduled" },
    ]);
  });

  it("buckets published posts into Monday weeks and platforms", () => {
    const stats = computeSocialStats(
      [
        post({ status: "published", published_at: at(-1), channels: on("ig", "li") }),
        post({ status: "published", published_at: at(-8), channels: on("ig") }),
        post({ status: "published", published_at: at(-40), channels: on("li") }), // outside 30 days
      ],
      [IG, LI],
      NOW,
      "UTC",
    );
    expect(stats.weeks).toHaveLength(8);
    expect(stats.weeks.at(-1)).toMatchObject({ published: 1 });
    expect(stats.weeks.at(-2)).toMatchObject({ published: 1 });
    expect(stats.byPlatform).toEqual([
      { platform: "instagram", count: 2 },
      { platform: "linkedin", count: 1 },
    ]);
  });

  it("calls an account quiet only when nothing went out recently and nothing is booked", () => {
    const tiktok = account("tt", { platform: "tiktok" });
    const paused = account("x", { platform: "x", status: "paused" });
    const stats = computeSocialStats(
      [
        post({ status: "published", published_at: at(-10), channels: on("ig") }),
        post({ status: "published", published_at: at(-2), channels: on("li") }),
        post({ status: "published", published_at: at(-20), channels: on("tt") }),
        post({ status: "scheduled", scheduled_at: at(1), channels: on("tt") }),
      ],
      [IG, LI, tiktok, paused],
      NOW,
      "UTC",
    );
    const byId = Object.fromEntries(stats.accounts.map((row) => [row.id, row]));
    expect(byId.ig).toMatchObject({ quiet: true, daysQuiet: 10, published30d: 1 });
    expect(byId.li).toMatchObject({ quiet: false, daysQuiet: 2 });
    expect(byId.tt).toMatchObject({ quiet: false, nextScheduledAt: at(1) });
    expect(byId.x).toMatchObject({ quiet: false, daysQuiet: null }); // paused accounts are not nagged
    expect(stats.quietAccounts).toBe(1);
    expect(stats.accounts[0]!.id).toBe("ig"); // quiet ones first
  });

  it("handles an empty plan", () => {
    const stats = computeSocialStats([], [], NOW, "UTC");
    expect(stats.publishedThisMonth).toBe(0);
    expect(stats.byStatus.every((row) => row.count === 0)).toBe(true);
    expect(stats.accounts).toEqual([]);
  });
});
