import { cn } from "@/lib/utils";
import type { GoalStatus, MvpItemStatus, Priority, ProjectStatus } from "@/types/domain";

/**
 * Status and priority badges typed by enum (docs/design/design-system.md#components).
 *
 * Tone comes from the `--status-*` tokens and is always `bg + fg + border`,
 * never a solid fill — solid is reserved for destructive buttons. Colour never
 * carries the meaning alone: the label is always present.
 */

type Tone = "neutral" | "info" | "progress" | "review" | "success" | "warning" | "danger";

const TONE: Record<Tone, string> = {
  neutral: "bg-status-neutral-bg text-status-neutral-fg border-status-neutral-border",
  info: "bg-status-info-bg text-status-info-fg border-status-info-border",
  progress: "bg-status-progress-bg text-status-progress-fg border-status-progress-border",
  review: "bg-status-review-bg text-status-review-fg border-status-review-border",
  success: "bg-status-success-bg text-status-success-fg border-status-success-border",
  warning: "bg-status-warning-bg text-status-warning-fg border-status-warning-border",
  danger: "bg-status-danger-bg text-status-danger-fg border-status-danger-border",
};

export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center rounded-sm border px-2 text-xs font-medium whitespace-nowrap",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const PROJECT_STATUS: Record<ProjectStatus, { label: string; tone: Tone }> = {
  planning: { label: "Planning", tone: "neutral" },
  active: { label: "Active", tone: "progress" },
  on_hold: { label: "On hold", tone: "info" },
  completed: { label: "Completed", tone: "success" },
  archived: { label: "Archived", tone: "neutral" },
};

const PRIORITY: Record<Priority, { label: string; tone: Tone }> = {
  low: { label: "Low", tone: "neutral" },
  medium: { label: "Medium", tone: "info" },
  high: { label: "High", tone: "warning" },
  urgent: { label: "Urgent", tone: "danger" },
};

const GOAL_STATUS: Record<GoalStatus, { label: string; tone: Tone }> = {
  not_started: { label: "Not started", tone: "neutral" },
  in_progress: { label: "In progress", tone: "progress" },
  achieved: { label: "Achieved", tone: "success" },
  dropped: { label: "Dropped", tone: "neutral" },
};

const MVP_STATUS: Record<MvpItemStatus, { label: string; tone: Tone }> = {
  planned: { label: "Planned", tone: "neutral" },
  in_progress: { label: "In progress", tone: "progress" },
  done: { label: "Done", tone: "success" },
  dropped: { label: "Dropped", tone: "neutral" },
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const { label, tone } = PROJECT_STATUS[status];
  return <StatusPill tone={tone}>{label}</StatusPill>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { label, tone } = PRIORITY[priority];
  return <StatusPill tone={tone}>{label}</StatusPill>;
}

export function GoalStatusBadge({ status }: { status: GoalStatus }) {
  const { label, tone } = GOAL_STATUS[status];
  return <StatusPill tone={tone}>{label}</StatusPill>;
}

export function MvpStatusBadge({ status }: { status: MvpItemStatus }) {
  const { label, tone } = MVP_STATUS[status];
  return <StatusPill tone={tone}>{label}</StatusPill>;
}

export { PROJECT_STATUS, PRIORITY };
