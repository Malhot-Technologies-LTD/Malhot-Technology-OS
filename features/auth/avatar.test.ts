import { describe, expect, it } from "vitest";

import { AVATAR_PUBLIC_PREFIX, avatarPath, avatarPathFromUrl, isAvatarType, isOwnAvatarPath } from "./avatar";

/** Stands in for avatar-media's avatarUrl, which needs an environment these tests have no reason to load. */
const hosted = (path: string) => `https://abcdefghijklmnopqrst.supabase.co${AVATAR_PUBLIC_PREFIX}${path}`;

const USER = "8f4a1f6e-1b3c-4d5e-9a7b-2c8d0e1f3a4b";
const FILE = "5c1d8b2a-9f3e-4a7c-8b1d-6e2f0a4c9d13";

describe("avatarPath", () => {
  it("puts the photo in its owner's folder, which is what the write policy reads", () => {
    expect(avatarPath(USER, FILE, "image/jpeg")).toBe(`${USER}/${FILE}.jpg`);
  });

  it("names the file by type, not by whatever the phone called it", () => {
    expect(avatarPath(USER, FILE, "image/png")).toMatch(/\.png$/);
    expect(avatarPath(USER, FILE, "image/webp")).toMatch(/\.webp$/);
    expect(avatarPath(USER, FILE, "image/avif")).toMatch(/\.avif$/);
  });
});

describe("isAvatarType", () => {
  it("accepts what the bucket accepts", () => {
    expect(isAvatarType("image/jpeg")).toBe(true);
    expect(isAvatarType("image/webp")).toBe(true);
  });

  it("refuses everything else, including images the bucket will not take", () => {
    expect(isAvatarType("image/gif")).toBe(false);
    expect(isAvatarType("image/svg+xml")).toBe(false);
    expect(isAvatarType("application/pdf")).toBe(false);
    expect(isAvatarType("")).toBe(false);
  });
});

describe("isOwnAvatarPath", () => {
  it("recognises a path in this person's folder", () => {
    expect(isOwnAvatarPath(avatarPath(USER, FILE, "image/jpeg"), USER)).toBe(true);
  });

  /* The check that matters: a path naming someone else's folder must not pass. */
  it("refuses another person's folder", () => {
    const other = "1111aaaa-2222-3333-4444-555566667777";
    expect(isOwnAvatarPath(avatarPath(other, FILE, "image/jpeg"), USER)).toBe(false);
  });

  it("refuses an attempt to climb out of the folder", () => {
    expect(isOwnAvatarPath(`${USER}/../${FILE}.jpg`, USER)).toBe(false);
    expect(isOwnAvatarPath(`${USER}/nested/${FILE}.jpg`, USER)).toBe(false);
  });

  it("refuses an extension the bucket would not store", () => {
    expect(isOwnAvatarPath(`${USER}/${FILE}.svg`, USER)).toBe(false);
    expect(isOwnAvatarPath(`${USER}/${FILE}`, USER)).toBe(false);
  });
});

describe("avatarPathFromUrl", () => {
  it("finds the file behind one of our own URLs, so the old photo can be deleted", () => {
    const path = avatarPath(USER, FILE, "image/jpeg");
    expect(avatarPathFromUrl(hosted(path))).toBe(path);
  });

  /*
   * The case that would otherwise throw at a provider. Sign-up copies an OAuth
   * `picture` into the same column, and that file is not ours to remove.
   */
  it("says nothing to delete for a photo hosted somewhere else", () => {
    expect(avatarPathFromUrl("https://lh3.googleusercontent.com/a/ACg8ocK")).toBeNull();
  });

  it("says nothing to delete when there was never a photo", () => {
    expect(avatarPathFromUrl(null)).toBeNull();
    expect(avatarPathFromUrl("")).toBeNull();
  });

  it("says nothing to delete for a URL that stops at the bucket", () => {
    expect(avatarPathFromUrl(hosted(""))).toBeNull();
  });
});
