import { describe, expect, it } from "vitest";

import { archiveFileName, planArchive, safeName, type ArchiveFile } from "./archive";
import type { FolderRow } from "./tree";

function folder(id: string, parent: string | null, name: string): FolderRow {
  return { id, parent_id: parent, name, restricted: false, created_by: "u1", created_at: "", updated_at: "" };
}

function file(id: string, folderId: string | null, title: string, extra: Partial<ArchiveFile> = {}): ArchiveFile {
  return { id, folder_id: folderId, title, source: "upload", file_name: `${title}.pdf`, size_bytes: 10, ...extra };
}

// Clients ─ Umoja ─ Contracts;  HR
const folders = [
  folder("c", null, "Clients"),
  folder("u", "c", "Umoja"),
  folder("k", "u", "Contracts"),
  folder("h", null, "HR"),
];

describe("file names in a ZIP", () => {
  it("strips characters no operating system accepts", () => {
    expect(safeName('Q3: "final" report / v2?')).toBe("Q3- -final- report - v2-");
    expect(safeName("  Notes...  ")).toBe("Notes");
    expect(safeName("???", "Untitled")).toBe("---");
    expect(safeName("", "Untitled")).toBe("Untitled");
  });

  it("names uploads by title with their extension, and generated documents as Word files", () => {
    expect(archiveFileName({ title: "Signed NDA", source: "upload", file_name: "scan_0042.PDF" })).toBe(
      "Signed NDA.pdf",
    );
    expect(archiveFileName({ title: "Photo.jpg", source: "upload", file_name: "IMG.jpg" })).toBe("Photo.jpg");
    expect(archiveFileName({ title: "Readme", source: "upload", file_name: "README" })).toBe("Readme");
    expect(archiveFileName({ title: "Offer — Aline", source: "generated", file_name: null })).toBe(
      "Offer — Aline.docx",
    );
  });
});

describe("planArchive", () => {
  it("puts the folder at the top and keeps its subfolders, empty ones too", () => {
    const plan = planArchive(folders, "c", [file("1", "k", "Signed NDA"), file("2", "c", "Brief")]);
    expect(plan.name).toBe("Clients");
    expect(plan.directories).toEqual(["Clients", "Clients/Umoja", "Clients/Umoja/Contracts"]);
    expect(plan.entries).toEqual([
      { fileId: "1", path: "Clients/Umoja/Contracts/Signed NDA.pdf" },
      { fileId: "2", path: "Clients/Brief.pdf" },
    ]);
  });

  it("leaves out everything outside the folder", () => {
    const plan = planArchive(folders, "u", [file("1", "h", "Payroll"), file("2", null, "Top"), file("3", "u", "In")]);
    expect(plan.entries.map((entry) => entry.path)).toEqual(["Umoja/In.pdf"]);
    expect(plan.directories).toEqual(["Umoja", "Umoja/Contracts"]);
  });

  it("zips all of Files, top-level files included, under one folder", () => {
    const plan = planArchive(folders, null, [file("1", null, "Company profile"), file("2", "h", "Policy")]);
    expect(plan.name).toBe("Files");
    expect(plan.directories).toContain("Files/HR");
    expect(plan.entries.map((entry) => entry.path)).toEqual(["Files/Company profile.pdf", "Files/HR/Policy.pdf"]);
  });

  it("numbers files that would share a name", () => {
    const plan = planArchive(folders, "h", [
      file("1", "h", "Contract"),
      file("2", "h", "contract"),
      file("3", "h", "Contract"),
    ]);
    expect(plan.entries.map((entry) => entry.path)).toEqual([
      "HR/Contract.pdf",
      "HR/contract (2).pdf",
      "HR/Contract (3).pdf",
    ]);
  });

  it("skips files in folders the viewer cannot see", () => {
    // "x" is an admins-only subfolder RLS did not return; its file came back anyway would be a bug, but never zipped.
    const plan = planArchive(folders, "c", [file("1", "x", "Secret")]);
    expect(plan.entries).toEqual([]);
  });
});
