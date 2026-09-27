import { z } from "zod";

/**
 * A person's employment details and paperwork (docs/features/team.md#member-page).
 * Vocabularies mirror the CHECK constraints in 20260927190000_member_records.sql.
 */

export const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "intern", "freelance"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export const EMPLOYMENT_TYPE_LABEL: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  intern: "Intern",
  freelance: "Freelance",
};

export const MEMBER_DOC_KINDS = ["contract", "offer", "identity", "certificate", "payslip", "other"] as const;
export type MemberDocKind = (typeof MEMBER_DOC_KINDS)[number];
export const MEMBER_DOC_KIND_LABEL: Record<MemberDocKind, string> = {
  contract: "Contract / agreement",
  offer: "Offer letter",
  identity: "ID / personal document",
  certificate: "Certificate",
  payslip: "Payslip",
  other: "Other",
};

/** Which kind a generated document files under, by template. */
export function kindForTemplate(templateKey: string): MemberDocKind {
  if (templateKey === "offer_letter") return "offer";
  if (templateKey === "employment_contract" || templateKey === "internship_agreement" || templateKey === "nda")
    return "contract";
  if (templateKey === "employment_certificate") return "certificate";
  return "other";
}

/** Templates about one person, offered on their page. */
export const PERSON_TEMPLATES = [
  "offer_letter",
  "employment_contract",
  "internship_agreement",
  "employment_certificate",
  "nda",
] as const;

export const MEMBER_FILES_BUCKET = "member-files";
/** Narrower than project files: paperwork, not deliverables. Matches the bucket in the migration. */
export const MEMBER_MIME_TYPES: readonly string[] = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/webp",
];
export const MEMBER_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.webp";

/** `<org>/<user>/<uuid>-<safe name>`: the storage policies read organisation and person from it. */
export function memberDocumentPath(organizationId: string, userId: string, fileName: string, uuid: string): string {
  const safe = fileName
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(-120);
  return `${organizationId}/${userId}/${uuid}-${safe || "file"}`;
}

export function isMemberDocumentPath(path: string, organizationId: string, userId: string): boolean {
  return path.startsWith(`${organizationId}/${userId}/`) && !path.includes("..") && path.split("/").length === 3;
}

const optionalText = (max: number) =>
  z.preprocess(
    (value) => value ?? "",
    z
      .string()
      .trim()
      .max(max)
      .transform((value) => (value === "" ? null : value)),
  );

const optionalDate = z.preprocess(
  (value) => value ?? "",
  z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), { message: "Use a date" })
    .transform((value) => (value === "" ? null : value)),
);

export const memberRecordSchema = z
  .object({
    userId: z.uuid(),
    position: optionalText(120),
    department: optionalText(80),
    employmentType: z.preprocess(
      (value) => (value === "" || value === undefined ? null : value),
      z.enum(EMPLOYMENT_TYPES).nullable(),
    ),
    startDate: optionalDate,
    endDate: optionalDate,
    reportsTo: z.preprocess((value) => (value === "" || value === undefined ? null : value), z.uuid().nullable()),
    workPhone: optionalText(40),
    workLocation: optionalText(120),
    emergencyContact: optionalText(200),
    notes: optionalText(4000),
  })
  .refine((record) => !record.startDate || !record.endDate || record.endDate >= record.startDate, {
    message: "The end date is before the start date",
    path: ["endDate"],
  })
  .refine((record) => record.reportsTo !== record.userId, {
    message: "Someone cannot report to themselves",
    path: ["reportsTo"],
  });
export type MemberRecordInput = z.input<typeof memberRecordSchema>;
