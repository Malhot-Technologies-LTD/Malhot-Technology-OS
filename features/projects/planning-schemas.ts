import { z } from "zod";

/**
 * Inputs for goals, MVP items and milestones. Mirrors the column constraints in
 * supabase/migrations/…_projects.sql; the database stays the backstop.
 */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value));

const title = z.string().trim().min(1, "Give it a title").max(200, "Keep the title under 200 characters");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date");

export const GOAL_STATUSES = ["not_started", "in_progress", "achieved", "dropped"] as const;
export const MVP_STATUSES = ["planned", "in_progress", "done", "dropped"] as const;
export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export const goalInputSchema = z.object({
  projectKey: z.string().min(1),
  title,
  description: optionalText(5000),
  successCriteria: optionalText(5000),
});

export const goalUpdateSchema = z.object({
  projectKey: z.string().min(1),
  goalId: z.uuid(),
  title: title.optional(),
  description: optionalText(5000).optional(),
  successCriteria: optionalText(5000).optional(),
  status: z.enum(GOAL_STATUSES).optional(),
});

export const mvpInputSchema = z.object({
  projectKey: z.string().min(1),
  title,
  description: optionalText(5000),
  priority: z.enum(PRIORITIES).default("medium"),
  // Empty string means "not tied to a goal".
  goalId: z
    .string()
    .transform((value) => (value === "" ? null : value))
    .pipe(z.uuid().nullable()),
});

export const mvpUpdateSchema = z.object({
  projectKey: z.string().min(1),
  itemId: z.uuid(),
  title: title.optional(),
  description: optionalText(5000).optional(),
  priority: z.enum(PRIORITIES).optional(),
  status: z.enum(MVP_STATUSES).optional(),
  goalId: z
    .string()
    .transform((value) => (value === "" ? null : value))
    .pipe(z.uuid().nullable())
    .optional(),
});

export const milestoneInputSchema = z.object({
  projectKey: z.string().min(1),
  title,
  dueDate: isoDate,
  description: optionalText(5000),
});

export const milestoneUpdateSchema = z.object({
  projectKey: z.string().min(1),
  milestoneId: z.uuid(),
  title: title.optional(),
  dueDate: isoDate.optional(),
  description: optionalText(5000).optional(),
  reached: z.boolean().optional(),
});

export const planningDeleteSchema = z.object({
  projectKey: z.string().min(1),
  id: z.uuid(),
});
