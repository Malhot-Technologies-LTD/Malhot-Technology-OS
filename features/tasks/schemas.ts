import { z } from "zod";

/**
 * Shared by the task form (zodResolver) and the Server Action (re-parse).
 * Mirrors the column constraints in
 * supabase/migrations/…_tasks_and_create_policy.sql.
 */

export const TASK_STATUSES = ["backlog", "todo", "in_progress", "review", "testing", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value));

/**
 * The deadline arrives from `<input type="datetime-local">`, which sends
 * "2026-09-30T17:00" — no zone. Interpreting it as the browser's local time is
 * the only reading that matches what the person typed, so it is converted with
 * `new Date(...)` on the client's own clock and sent as an instant.
 */
const optionalInstant = z
  .string()
  .trim()
  .refine((value) => value === "" || !Number.isNaN(Date.parse(value)), { message: "Enter a valid date and time" })
  .transform((value) => (value === "" ? null : new Date(value).toISOString()));

export const createTaskSchema = z.object({
  projectKey: z.string().trim().min(1),
  title: z.string().trim().min(1, "Say what needs doing").max(200),
  description: optionalText(5000),
  // Empty string means unassigned: work can exist before it has an owner.
  assigneeId: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueAt: optionalInstant,
});

export type CreateTaskInput = z.input<typeof createTaskSchema>;
export type CreateTaskOutput = z.output<typeof createTaskSchema>;

export const TASK_STATUS_META: Record<
  TaskStatus,
  { label: string; tone: "neutral" | "progress" | "review" | "success" }
> = {
  backlog: { label: "Backlog", tone: "neutral" },
  todo: { label: "To do", tone: "neutral" },
  in_progress: { label: "In progress", tone: "progress" },
  review: { label: "In review", tone: "review" },
  testing: { label: "Testing", tone: "review" },
  done: { label: "Done", tone: "success" },
};

/**
 * How long is left, in the units a person would actually say.
 *
 * Deliberately coarse and never more than two units: "2d 4h" tells you what to
 * do about it, "2d 4h 17m 3s" does not, and the seconds only make the number
 * move. Under an hour the minutes start to matter, so that is where it sharpens.
 */
export function formatRemaining(msRemaining: number): string {
  const overdue = msRemaining < 0;
  const ms = Math.abs(msRemaining);

  const minutes = Math.floor(ms / 60_000) % 60;
  const hours = Math.floor(ms / 3_600_000) % 24;
  const days = Math.floor(ms / 86_400_000);

  let text: string;
  if (days > 0) text = hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  else if (hours > 0) text = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  else if (minutes > 0) text = `${minutes}m`;
  else text = "under a minute";

  return overdue ? `${text} overdue` : `${text} left`;
}

/** How urgent the remaining time is, for colour. */
export function remainingTone(msRemaining: number): "danger" | "warning" | "neutral" {
  if (msRemaining < 0) return "danger";
  if (msRemaining < 4 * 3_600_000) return "warning";
  return "neutral";
}
