import { z } from "zod";

export const BUDGET_RANGES = [
  { value: "under-5k", label: "Under $5,000" },
  { value: "5k-15k", label: "$5,000 to $15,000" },
  { value: "15k-50k", label: "$15,000 to $50,000" },
  { value: "over-50k", label: "Over $50,000" },
  { value: "unsure", label: "Not sure yet" },
] as const;

const budgetValues = BUDGET_RANGES.map((b) => b.value) as [string, ...string[]];

/** Shared by the contact form and the Server Action (docs/product/public-website.md#contact). */
export const inquirySchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(120),
  email: z
    .email("Enter a valid email address")
    .max(254)
    .transform((v) => v.trim().toLowerCase()),
  company: z.string().trim().max(120).optional(),
  message: z.string().trim().min(20, "Tell us a little more (at least 20 characters)").max(5000),
  budgetRange: z.enum(budgetValues).optional(),
  sourcePath: z.string().max(200).optional(),
  /** Honeypot: rendered off-screen; humans leave it empty. */
  website: z.string().max(200).optional(),
});

export type InquiryInput = z.input<typeof inquirySchema>;
export type InquiryOutput = z.output<typeof inquirySchema>;
