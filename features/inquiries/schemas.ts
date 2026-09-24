import { z } from "zod";

export const BUDGET_RANGES = [
  { value: "under-5k", label: "Under $5,000" },
  { value: "5k-15k", label: "$5,000 to $15,000" },
  { value: "15k-50k", label: "$15,000 to $50,000" },
  { value: "over-50k", label: "Over $50,000" },
  { value: "unsure", label: "Not sure yet" },
] as const;

const budgetValues = BUDGET_RANGES.map((b) => b.value) as [string, ...string[]];

/**
 * An email address as people actually type it.
 *
 * Trimmed before it is validated, not after. `z.email()` runs its pattern on
 * the raw input and a `.transform()` runs afterwards, so an address pasted with
 * a trailing space — the normal result of copying one out of an email client —
 * was being rejected with "Enter a valid email address", which is both wrong
 * and impossible to act on, because the space is invisible.
 */
const emailField = z
  .string()
  .trim()
  .pipe(z.email("Enter a valid email address").max(254))
  .transform((v) => v.toLowerCase());

/** Shared by the contact form and the Server Action (docs/product/public-website.md#contact). */
export const inquirySchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(120),
  email: emailField,
  company: z.string().trim().max(120).optional(),
  message: z.string().trim().min(20, "Tell us a little more (at least 20 characters)").max(5000),
  budgetRange: z.enum(budgetValues).optional(),
  sourcePath: z.string().max(200).optional(),
  /** Honeypot: rendered off-screen; humans leave it empty. */
  website: z.string().max(200).optional(),
});

export type InquiryInput = z.input<typeof inquirySchema>;
export type InquiryOutput = z.output<typeof inquirySchema>;

/* ------------------------------ Project briefs ----------------------------- */

export const NEED_LABELS: Record<string, string> = {
  "new-product": "Build a new product",
  redesign: "Redesign something existing",
  scale: "Scale & optimise",
  advisory: "Advisory & consulting",
};

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  website: "Website",
  "mobile-app": "Mobile App",
  "ui-ux": "UI/UX Design",
  branding: "Branding",
  marketing: "Digital Marketing",
  other: "Something else",
};

export const TIMELINE_LABELS: Record<string, string> = {
  asap: "As soon as possible",
  "1-3m": "1 – 3 months",
  "3-6m": "3 – 6 months",
  exploring: "Still exploring",
};

/**
 * The /start wizard's six steps, validated in one go on the server.
 *
 * The wizard validates step by step as you move through it, but that is a
 * convenience for the person filling it in, not a guarantee — the whole brief
 * arrives in a single call and has to stand on its own here.
 */
export const projectBriefSchema = z.object({
  need: z.enum(Object.keys(NEED_LABELS) as [string, ...string[]]),
  projectTypes: z
    .array(z.enum(Object.keys(PROJECT_TYPE_LABELS) as [string, ...string[]]))
    .min(1)
    .max(8),
  title: z.string().trim().min(3, "Give the project a name").max(200),
  description: z.string().trim().min(12, "Tell us a little more").max(5000),
  budget: z.enum(budgetValues),
  timeline: z.enum(Object.keys(TIMELINE_LABELS) as [string, ...string[]]),
  contactName: z.string().trim().min(2, "Enter your name").max(120),
  contactEmail: emailField,
  contactPhone: z.string().trim().max(40).optional(),
  company: z.string().trim().max(120).optional(),
  /** Honeypot, as on the contact form. */
  website: z.string().max(200).optional(),
});

export type ProjectBriefInput = z.input<typeof projectBriefSchema>;
export type ProjectBriefOutput = z.output<typeof projectBriefSchema>;

/**
 * Flattens a brief into the single `message` an inquiry carries.
 *
 * A brief has ten fields; `inquiries` has one free-text column and a budget.
 * Rather than add a second table, a second RLS policy and a second admin screen
 * for what is still "somebody wants to work with us", the structured answers
 * are rendered into a readable block and stored as the message. The admin
 * inbox, the rate limit and the honeypot all keep working untouched.
 *
 * The labels rather than the raw values, because an admin reading this should
 * see "1 – 3 months", not "1-3m". Pure, so the formatting is covered by tests
 * rather than by opening the page and squinting at it.
 */
export function composeBriefMessage(brief: ProjectBriefOutput): string {
  const types = brief.projectTypes.map((t) => PROJECT_TYPE_LABELS[t] ?? t).join(", ");
  const lines = [
    `Project: ${brief.title}`,
    `Looking for: ${NEED_LABELS[brief.need] ?? brief.need}`,
    `Type: ${types}`,
    `Timeline: ${TIMELINE_LABELS[brief.timeline] ?? brief.timeline}`,
    `Budget: ${BUDGET_RANGES.find((b) => b.value === brief.budget)?.label ?? brief.budget}`,
  ];
  if (brief.contactPhone) lines.push(`Phone: ${brief.contactPhone}`);
  lines.push("", brief.description);
  return lines.join("\n");
}

/**
 * A short, sayable reference derived from the inquiry's own id.
 *
 * Derived rather than generated and stored: a separate random code would need
 * its own column and its own uniqueness guarantee, and could drift from the row
 * it names. This cannot — paste it back and the first segment of the uuid finds
 * the inquiry.
 */
export function briefReference(inquiryId: string): string {
  return `MAL-${inquiryId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}
