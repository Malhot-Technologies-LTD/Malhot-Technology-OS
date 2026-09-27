import { describe, expect, it } from "vitest";

import {
  ancestry,
  canManageItem,
  checkFolderName,
  companyFilePath,
  descendantIds,
  folderPaths,
  isCompanyFilePath,
  moveTargets,
  type FolderRow,
} from "./tree";

function folder(id: string, parent: string | null, name: string, restricted = false): FolderRow {
  return { id, parent_id: parent, name, restricted, created_by: "u1", created_at: "", updated_at: "" };
}

// Clients ─ Umoja ─ Contracts;  HR (restricted);  archive 2 / archive 10 to check numeric ordering
const folders = [
  folder("c", null, "Clients"),
  folder("u", "c", "Umoja"),
  folder("k", "u", "Contracts"),
  folder("h", null, "HR", true),
  folder("a10", null, "archive 10"),
  folder("a2", null, "archive 2"),
];

describe("folder tree", () => {
  it("walks from the top down to a folder", () => {
    expect(ancestry(folders, "k").map((row) => row.name)).toEqual(["Clients", "Umoja", "Contracts"]);
    expect(ancestry(folders, null)).toEqual([]);
  });

  it("survives a cycle instead of looping", () => {
    const cyclic = [folder("x", "y", "X"), folder("y", "x", "Y")];
    expect(ancestry(cyclic, "x").length).toBe(2);
    expect(descendantIds(cyclic, "x")).toEqual(new Set(["y"]));
  });

  it("finds everything below a folder", () => {
    expect(descendantIds(folders, "c")).toEqual(new Set(["u", "k"]));
    expect(descendantIds(folders, "k").size).toBe(0);
  });

  it("lists full paths depth-first in natural name order", () => {
    expect(folderPaths(folders).map((path) => path.path)).toEqual([
      "archive 2",
      "archive 10",
      "Clients",
      "Clients / Umoja",
      "Clients / Umoja / Contracts",
      "HR",
    ]);
  });

  it("never offers a folder a place inside itself", () => {
    const targets = moveTargets(folders, { kind: "folder", id: "c" });
    expect(targets.top).toBe(false);
    expect(targets.folders.map((path) => path.id)).toEqual(["a2", "a10", "h"]);
    const nested = moveTargets(folders, { kind: "folder", id: "k" });
    expect(nested.top).toBe(true);
    expect(nested.folders.map((path) => path.id)).not.toContain("u");
  });

  it("offers a file every folder but its own", () => {
    const targets = moveTargets(folders, { kind: "file", folderId: "u" });
    expect(targets.top).toBe(true);
    expect(targets.folders.map((path) => path.id)).not.toContain("u");
    expect(moveTargets(folders, { kind: "file", folderId: null }).top).toBe(false);
  });
});

describe("folder names", () => {
  it("trims and collapses spaces", () => {
    expect(checkFolderName("  Client   contracts ")).toEqual({ ok: true, name: "Client contracts" });
  });

  it("refuses empty, slashed or overlong names", () => {
    expect(checkFolderName("   ").ok).toBe(false);
    expect(checkFolderName("a/b").ok).toBe(false);
    expect(checkFolderName("a\\b").ok).toBe(false);
    expect(checkFolderName("x".repeat(121)).ok).toBe(false);
  });
});

describe("who manages an item", () => {
  it("is an admin or its creator", () => {
    expect(canManageItem({ userId: "u1", isAdmin: false }, { created_by: "u1" })).toBe(true);
    expect(canManageItem({ userId: "u2", isAdmin: false }, { created_by: "u1" })).toBe(false);
    expect(canManageItem({ userId: "u2", isAdmin: true }, { created_by: "u1" })).toBe(true);
    expect(canManageItem({ userId: "u2", isAdmin: false }, { created_by: null })).toBe(false);
  });
});

describe("storage paths", () => {
  const org = "11111111-1111-1111-1111-111111111111";

  it("files an upload under its organisation with a safe name", () => {
    const path = companyFilePath(org, "Client brief (final) v2.pdf", "abc");
    expect(path).toBe(`${org}/abc-Client-brief-final-v2.pdf`);
    expect(isCompanyFilePath(path, org)).toBe(true);
  });

  it("refuses paths outside the organisation or with traversal", () => {
    expect(isCompanyFilePath(`22222222-2222-2222-2222-222222222222/x.pdf`, org)).toBe(false);
    expect(isCompanyFilePath(`${org}/../x.pdf`, org)).toBe(false);
    expect(isCompanyFilePath(`${org}/a/b.pdf`, org)).toBe(false);
  });
});
