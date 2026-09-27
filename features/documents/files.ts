import type { DocumentType } from "@/types/domain";

import type { Letterhead } from "./content";
import { site } from "@/content/site";

/** Shared by the uploader, the upload action and the migration's bucket limits. */
export const PROJECT_FILES_BUCKET = "project-files";
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export const ACCEPTED_MIME_TYPES: readonly string[] = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/zip",
];

export const ACCEPT_ATTRIBUTE = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.webp,.zip";

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  project_brief: "Brief / proposal",
  requirements: "Requirements / contract",
  mvp_specification: "MVP specification",
  project_plan: "Project plan",
  meeting_notes: "Meeting notes",
  testing_report: "Testing report",
  deployment_report: "Deployment report",
  final_report: "Final report / handover",
  other: "Other",
};

export const DOCUMENT_TYPES = Object.keys(DOCUMENT_TYPE_LABEL) as DocumentType[];

/** `<project id>/<uuid>-<safe name>`: the migration's storage policies read the project from the first segment. */
export function documentPath(projectId: string, fileName: string, uuid: string): string {
  const safe = fileName
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(-120);
  return `${projectId}/${uuid}-${safe || "file"}`;
}

export function isProjectDocumentPath(path: string, projectId: string): boolean {
  return path.startsWith(`${projectId}/`) && !path.includes("..") && path.split("/").length === 2;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The letterhead's starting values. Name and tagline match the company's own
 * contracts; contact details come from the website, where they are marked
 * unconfirmed, so every one stays editable on the generator and the edits are
 * remembered per browser.
 */
export const DEFAULT_LETTERHEAD: Letterhead = {
  // As on the company's own contracts (the developer employment agreement).
  companyName: "Malhot Tech",
  tagline: "Your Vision. Our Technology. Real Solutions.",
  address: site.location,
  email: site.email,
  phone: site.phone,
  website: "",
  registration: "",
};

export function sanitiseLetterhead(raw: unknown): Letterhead {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const pick = (key: keyof Letterhead) =>
    typeof source[key] === "string" ? (source[key] as string).slice(0, 200) : DEFAULT_LETTERHEAD[key];
  return {
    companyName: pick("companyName"),
    tagline: pick("tagline"),
    address: pick("address"),
    email: pick("email"),
    phone: pick("phone"),
    website: pick("website"),
    registration: pick("registration"),
  };
}
