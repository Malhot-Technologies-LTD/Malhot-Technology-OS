"use client";

import { Check, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createGoal,
  createMilestone,
  createMvpItem,
  deleteGoal,
  deleteMilestone,
  deleteMvpItem,
  updateGoal,
  updateMilestone,
  updateMvpItem,
} from "@/features/projects/planning-actions";
import type { GoalStatus, MvpItemStatus, Priority } from "@/types/domain";

type Result = { ok: true } | { ok: false; error: { message: string; fieldErrors?: Record<string, string[]> } };

function useRun() {
  const [pending, startTransition] = useTransition();
  const run = (work: () => Promise<Result>, success: string, after?: () => void, onError?: (message: string) => void) =>
    startTransition(async () => {
      const result = await work();
      if (!result.ok) {
        const message = Object.values(result.error.fieldErrors ?? {})[0]?.[0] ?? result.error.message;
        if (onError) onError(message);
        else toast.error(message);
        return;
      }
      toast.success(success);
      after?.();
    });
  return { pending, run };
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-fg-subtle">{hint}</p> : null}
    </div>
  );
}

/** Dialog shell shared by the three forms. */
function FormDialog({
  title,
  description,
  trigger,
  submitLabel,
  pending,
  error,
  open,
  onOpenChange,
  onSubmit,
  children,
}: {
  title: string;
  description: string;
  trigger: ReactNode;
  submitLabel: string;
  pending: boolean;
  error: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">{children}</div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Goals ----------------------------------------------------------------------

export type GoalFormValue = { id: string; title: string; description: string | null; success_criteria: string | null };

export function GoalDialog({
  projectKey,
  goal,
  trigger,
}: {
  projectKey: string;
  goal?: GoalFormValue;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(goal?.title ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [criteria, setCriteria] = useState(goal?.success_criteria ?? "");
  const [error, setError] = useState<string | null>(null);
  const { pending, run } = useRun();
  const id = goal?.id ?? "new";

  return (
    <FormDialog
      title={goal ? "Edit goal" : "New goal"}
      description="A goal says what success means. MVP items and tasks should trace back to one."
      trigger={trigger}
      submitLabel={goal ? "Save" : "Add goal"}
      pending={pending}
      error={error}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setError(null);
      }}
      onSubmit={() =>
        run(
          () =>
            goal
              ? updateGoal({ projectKey, goalId: goal.id, title, description, successCriteria: criteria })
              : createGoal({ projectKey, title, description, successCriteria: criteria }),
          goal ? "Goal saved" : "Goal added",
          () => {
            setOpen(false);
            if (!goal) {
              setTitle("");
              setDescription("");
              setCriteria("");
            }
          },
          setError,
        )
      }
    >
      <Field label="Goal" htmlFor={`goal-title-${id}`}>
        <Input
          id={`goal-title-${id}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          autoFocus
        />
      </Field>
      <Field label="Why it matters" htmlFor={`goal-description-${id}`}>
        <Textarea
          id={`goal-description-${id}`}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <Field label="Success criteria" htmlFor={`goal-criteria-${id}`} hint="How you will know it has been achieved.">
        <Textarea id={`goal-criteria-${id}`} rows={3} value={criteria} onChange={(e) => setCriteria(e.target.value)} />
      </Field>
    </FormDialog>
  );
}

const GOAL_STATUS_OPTIONS: { value: GoalStatus; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "achieved", label: "Achieved" },
  { value: "dropped", label: "Dropped" },
];

export function GoalStatusSelect({
  projectKey,
  goalId,
  status,
  canAchieve,
}: {
  projectKey: string;
  goalId: string;
  status: GoalStatus;
  canAchieve: boolean;
}) {
  const { pending, run } = useRun();
  return (
    <Select
      value={status}
      disabled={pending}
      onValueChange={(value) => run(() => updateGoal({ projectKey, goalId, status: value }), "Goal updated")}
    >
      <SelectTrigger size="sm" className="w-36" aria-label="Goal status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {GOAL_STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value} disabled={option.value === "achieved" && !canAchieve}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// MVP ------------------------------------------------------------------------

export type MvpFormValue = {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  goal_id: string | null;
};

export function MvpDialog({
  projectKey,
  item,
  goals,
  defaultGoalId,
  trigger,
}: {
  projectKey: string;
  item?: MvpFormValue;
  goals: readonly { id: string; title: string }[];
  /** Pre-selects a goal for a new item, when it is added from that goal. */
  defaultGoalId?: string;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [priority, setPriority] = useState<Priority>(item?.priority ?? "medium");
  const [goalId, setGoalId] = useState(item?.goal_id ?? defaultGoalId ?? "none");
  const [error, setError] = useState<string | null>(null);
  const { pending, run } = useRun();
  const id = item?.id ?? "new";
  const goal = goalId === "none" ? "" : goalId;

  return (
    <FormDialog
      title={item ? "Edit MVP item" : "New MVP item"}
      description="The MVP is the smallest set of things that satisfies the goals. Keep each item one deliverable."
      trigger={trigger}
      submitLabel={item ? "Save" : "Add to MVP"}
      pending={pending}
      error={error}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setError(null);
      }}
      onSubmit={() =>
        run(
          () =>
            item
              ? updateMvpItem({ projectKey, itemId: item.id, title, description, priority, goalId: goal })
              : createMvpItem({ projectKey, title, description, priority, goalId: goal }),
          item ? "MVP item saved" : "Added to the MVP",
          () => {
            setOpen(false);
            if (!item) {
              setTitle("");
              setDescription("");
            }
          },
          setError,
        )
      }
    >
      <Field label="Item" htmlFor={`mvp-title-${id}`}>
        <Input
          id={`mvp-title-${id}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          autoFocus
        />
      </Field>
      <Field label="What done looks like" htmlFor={`mvp-description-${id}`}>
        <Textarea
          id={`mvp-description-${id}`}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Serves goal" htmlFor={`mvp-goal-${id}`}>
          <Select value={goalId} onValueChange={setGoalId}>
            <SelectTrigger id={`mvp-goal-${id}`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No goal</SelectItem>
              {goals.map((candidate) => (
                <SelectItem key={candidate.id} value={candidate.id}>
                  {candidate.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Priority" htmlFor={`mvp-priority-${id}`}>
          <Select value={priority} onValueChange={(value) => setPriority(value as Priority)}>
            <SelectTrigger id={`mvp-priority-${id}`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
    </FormDialog>
  );
}

const MVP_STATUS_OPTIONS: { value: MvpItemStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "dropped", label: "Dropped" },
];

export function MvpStatusSelect({
  projectKey,
  itemId,
  status,
}: {
  projectKey: string;
  itemId: string;
  status: MvpItemStatus;
}) {
  const { pending, run } = useRun();
  return (
    <Select
      value={status}
      disabled={pending}
      onValueChange={(value) => run(() => updateMvpItem({ projectKey, itemId, status: value }), "MVP item updated")}
    >
      <SelectTrigger size="sm" className="w-32" aria-label="MVP item status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {MVP_STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Milestones -----------------------------------------------------------------

export type MilestoneFormValue = { id: string; title: string; description: string | null; due_date: string };

export function MilestoneDialog({
  projectKey,
  milestone,
  trigger,
}: {
  projectKey: string;
  milestone?: MilestoneFormValue;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(milestone?.title ?? "");
  const [description, setDescription] = useState(milestone?.description ?? "");
  const [dueDate, setDueDate] = useState(milestone?.due_date ?? "");
  const [error, setError] = useState<string | null>(null);
  const { pending, run } = useRun();
  const id = milestone?.id ?? "new";

  return (
    <FormDialog
      title={milestone ? "Edit milestone" : "New milestone"}
      description="A milestone is a date the project commits to: a sign-off, a beta, a launch."
      trigger={trigger}
      submitLabel={milestone ? "Save" : "Add milestone"}
      pending={pending}
      error={error}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setError(null);
      }}
      onSubmit={() =>
        run(
          () =>
            milestone
              ? updateMilestone({ projectKey, milestoneId: milestone.id, title, description, dueDate })
              : createMilestone({ projectKey, title, description, dueDate }),
          milestone ? "Milestone saved" : "Milestone added",
          () => {
            setOpen(false);
            if (!milestone) {
              setTitle("");
              setDescription("");
              setDueDate("");
            }
          },
          setError,
        )
      }
    >
      <Field label="Milestone" htmlFor={`milestone-title-${id}`}>
        <Input
          id={`milestone-title-${id}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          autoFocus
        />
      </Field>
      <Field label="Due" htmlFor={`milestone-due-${id}`}>
        <Input id={`milestone-due-${id}`} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </Field>
      <Field label="What has to be true" htmlFor={`milestone-description-${id}`}>
        <Textarea
          id={`milestone-description-${id}`}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
    </FormDialog>
  );
}

export function MilestoneReachedButton({
  projectKey,
  milestoneId,
  reached,
  size = "sm",
}: {
  projectKey: string;
  milestoneId: string;
  reached: boolean;
  size?: "sm" | "default";
}) {
  const { pending, run } = useRun();
  return (
    <Button
      type="button"
      size={size}
      variant={reached ? "outline" : "default"}
      disabled={pending}
      onClick={() =>
        run(
          () => updateMilestone({ projectKey, milestoneId, reached: !reached }),
          reached ? "Milestone reopened" : "Milestone reached",
        )
      }
    >
      {reached ? <RotateCcw aria-hidden="true" /> : <Check aria-hidden="true" />}
      {reached ? "Reopen" : "Mark reached"}
    </Button>
  );
}

// Delete ---------------------------------------------------------------------

export function DeletePlanningButton({
  projectKey,
  id,
  kind,
  name,
  redirectTo,
  label = false,
}: {
  projectKey: string;
  id: string;
  kind: "goal" | "mvp" | "milestone";
  name: string;
  redirectTo?: string;
  /** Show the word as well as the icon. */
  label?: boolean;
}) {
  const router = useRouter();
  const { pending, run } = useRun();
  const noun = kind === "goal" ? "goal" : kind === "mvp" ? "MVP item" : "milestone";
  const action = kind === "goal" ? deleteGoal : kind === "mvp" ? deleteMvpItem : deleteMilestone;
  const consequence =
    kind === "goal"
      ? "MVP items tied to it stay, without a goal."
      : kind === "milestone"
        ? "Tasks are not affected."
        : "Tasks are not affected.";

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={label ? "sm" : "icon-sm"}
          disabled={pending}
          aria-label={`Delete ${noun} ${name}`}
          className="text-fg-muted hover:text-status-danger-fg"
        >
          <Trash2 aria-hidden="true" />
          {label ? "Delete" : null}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this {noun}?</AlertDialogTitle>
          <AlertDialogDescription>
            {name} is removed for everyone on the project. {consequence} This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() =>
              run(
                () => action({ projectKey, id }),
                `${noun.charAt(0).toUpperCase()}${noun.slice(1)} deleted`,
                () => {
                  if (redirectTo) router.push(redirectTo);
                },
              )
            }
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
