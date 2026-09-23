import { z } from "zod";

/**
 * Shared by the project forms (zodResolver) and the Server Actions (re-parse).
 * Mirrors the column constraints in supabase/migrations/…_projects.sql —
 * the database is the backstop, these are the readable messages.
 */

export const PROJECT_KEY_PATTERN = /^[A-Z]{2,6}$/;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v));

const optionalDate = z
  .string()
  .trim()
  .refine((v) => v === "" || !Number.isNaN(Date.parse(v)), { message: "Enter a valid date" })
  .transform((v) => (v === "" ? null : v));

const datesOrdered = <T extends { startDate: string | null; targetEndDate: string | null }>(value: T) =>
  value.startDate === null || value.targetEndDate === null || value.targetEndDate >= value.startDate;

export const PROJECT_KINDS = ["project", "job"] as const;
export type ProjectKind = (typeof PROJECT_KINDS)[number];

/**
 * A client is named, not picked from a list.
 *
 * Requiring an existing client before you can record a job puts the setup in
 * the wrong order: the job is the thing you know about, the client record is
 * bookkeeping that follows. The action matches the name against the
 * organisation's clients and creates one when there is no match, so typing a
 * new name and picking an existing one are the same gesture.
 */
export const createProjectSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a project name").max(120),
    key: z.string().trim().toUpperCase().regex(PROJECT_KEY_PATTERN, "Use 2 to 6 letters, A to Z"),
    kind: z.enum(PROJECT_KINDS).default("project"),
    description: optionalText(5000),
    clientName: optionalText(120),
    priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
    startDate: optionalDate,
    targetEndDate: optionalDate,
  })
  .refine(datesOrdered, { path: ["targetEndDate"], message: "The target end date cannot be before the start date" })
  // Mirrors the projects_client_only_on_jobs constraint: a client belongs to a
  // job. An internal project carrying a client is a contradiction, not a variant.
  .refine((value) => value.kind === "job" || value.clientName === null, {
    path: ["clientName"],
    message: "Only a job has a client. Switch the kind to Job, or clear the client.",
  });

export type CreateProjectInput = z.input<typeof createProjectSchema>;
export type CreateProjectOutput = z.output<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.safeExtend({
  projectId: z.uuid(),
});

export type UpdateProjectInput = z.input<typeof updateProjectSchema>;
export type UpdateProjectOutput = z.output<typeof updateProjectSchema>;

/**
 * Suggests a key from a project name: initials for multi-word names
 * ("Malhot Technology OS" → "MTO"), otherwise the leading letters ("Umoja" → "UMOJA").
 * Returns "" when the name has no letters to work with, so the field stays empty
 * rather than showing a key the user did not choose.
 */
export function suggestProjectKey(name: string): string {
  const words = name
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter(Boolean);
  if (words.length === 0) return "";
  const candidate = words.length > 1 ? words.map((w) => w[0]).join("") : (words[0] as string);
  return candidate.slice(0, 6);
}
