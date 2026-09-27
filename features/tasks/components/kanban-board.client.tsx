"use client";

import { CalendarClock, GripVertical, MoreHorizontal, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useState, useTransition, type DragEvent } from "react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/os/user-menu.client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { updateTask } from "@/features/tasks/actions";
import { Countdown } from "@/features/tasks/components/countdown.client";
import { NewTaskDialog, type TeamMember } from "@/features/tasks/components/new-task-dialog.client";
import { StatusGlyph } from "@/features/tasks/components/task-line";
import { taskHref, taskRef } from "@/features/tasks/links";
import { TASK_STATUSES, TASK_STATUS_META, type TaskStatus } from "@/features/tasks/schemas";
import { cn } from "@/lib/utils";
import type { Priority } from "@/types/domain";

export type BoardTask = {
  id: string;
  seq: number;
  title: string;
  status: TaskStatus;
  priority: Priority;
  due_at: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  assignee: { id: string; full_name: string; avatar_url: string | null } | null;
  /** Set on boards that span projects (My Tasks); a project board passes `projectKey` instead. */
  project?: { key: string; name: string } | null;
};

type Props = {
  /** The project this board belongs to; omitted on a board that spans projects. */
  projectKey?: string;
  tasks: readonly BoardTask[];
  team: readonly TeamMember[];
  viewerUserId: string;
  /** Manager: may move anyone's card and assign work to others. */
  canManage: boolean;
  canCreate: boolean;
};

const PRIORITY_DOT: Record<Priority, string> = {
  urgent: "bg-status-danger-fg",
  high: "bg-status-warning-fg",
  medium: "bg-status-info-fg",
  low: "bg-fg-subtle",
};

/** The finished column only shows the most recent cards; the rest are one click away. */
const DONE_LIMIT = 12;

/**
 * The project's work as columns, one per status.
 *
 * Cards are dragged between columns with the mouse, or moved from each card's
 * menu with the keyboard — drag and drop alone would lock out anyone who does
 * not use a pointer. A move shows immediately and is undone if the server
 * refuses it. Only the manager, or whoever holds a task, can move its card:
 * the same rule the tasks_update policy enforces.
 */
export function KanbanBoard({ projectKey, tasks, team, viewerUserId, canManage, canCreate }: Props) {
  const [, startTransition] = useTransition();
  const [board, applyMove] = useOptimistic(
    tasks,
    (state: readonly BoardTask[], move: { id: string; status: TaskStatus }) =>
      state.map((task) => (task.id === move.id ? { ...task, status: move.status } : task)),
  );
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);
  const [query, setQuery] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [showAllDone, setShowAllDone] = useState(false);

  const canMove = (task: BoardTask) => canManage || task.assignee?.id === viewerUserId;
  const keyOf = (task: BoardTask) => task.project?.key ?? projectKey ?? "";

  function move(task: BoardTask, status: TaskStatus) {
    if (task.status === status) return;
    if (!canMove(task)) {
      toast.error("Only the person it is assigned to, or the project manager, can move this card.");
      return;
    }
    startTransition(async () => {
      applyMove({ id: task.id, status });
      const result = await updateTask({ taskId: task.id, projectKey: keyOf(task), status });
      if (result.ok) toast.success(`${taskRef(keyOf(task), task.seq)} moved to ${TASK_STATUS_META[status].label}`);
      else toast.error(result.error.message);
    });
  }

  function onDrop(event: DragEvent, status: TaskStatus) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/task-id") || dragging;
    setOver(null);
    setDragging(null);
    const task = board.find((candidate) => candidate.id === id);
    if (task) move(task, status);
  }

  const needle = query.trim().toLowerCase();
  const visible = board.filter((task) => {
    if (onlyMine && task.assignee?.id !== viewerUserId) return false;
    if (!needle) return true;
    return `${task.title} ${taskRef(keyOf(task), task.seq)} ${task.project?.name ?? ""} ${task.assignee?.full_name ?? ""}`
      .toLowerCase()
      .includes(needle);
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label="Filter cards"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter cards"
            className="pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-fg-muted">
          <Switch checked={onlyMine} onCheckedChange={setOnlyMine} aria-label="Only my cards" />
          Only mine
        </label>
        <p className="text-[13px] text-fg-subtle max-md:hidden">
          Drag a card to another column, or use its menu to move it.
        </p>
        {canCreate && projectKey ? (
          <div className="ml-auto">
            <NewTaskDialog
              projectKey={projectKey}
              team={team}
              viewerUserId={viewerUserId}
              canAssignOthers={canManage}
            />
          </div>
        ) : null}
      </div>

      <div className="-mx-6 overflow-x-auto px-6 pb-2 sm:-mx-8 sm:px-8 xl:-mx-10 xl:px-10 2xl:-mx-14 2xl:px-14">
        <ol className="flex min-h-[28rem] gap-3" aria-label="Board columns">
          {TASK_STATUSES.map((status) => {
            const meta = TASK_STATUS_META[status];
            let cards = visible.filter((task) => task.status === status);
            const hidden = status === "done" && !showAllDone ? Math.max(0, cards.length - DONE_LIMIT) : 0;
            if (status === "done") {
              cards = [...cards].sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
              if (!showAllDone) cards = cards.slice(0, DONE_LIMIT);
            }
            return (
              <li
                key={status}
                aria-labelledby={`column-${status}`}
                onDragOver={(event) => {
                  // The payload type is readable during dragover and is set synchronously on
                  // dragstart; React state may not have re-rendered yet on a fast drag.
                  if (!event.dataTransfer.types.includes("text/task-id")) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  if (over !== status) setOver(status);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(null);
                }}
                onDrop={(event) => onDrop(event, status)}
                className={cn(
                  "flex w-72 shrink-0 flex-col rounded-lg border bg-bg-subtle transition-colors duration-[120ms]",
                  over === status ? "border-brand bg-brand-subtle/60" : "border-border",
                )}
              >
                <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                  <StatusGlyph status={status} />
                  <h2 id={`column-${status}`} className="text-sm font-semibold">
                    {meta.label}
                  </h2>
                  <span className="rounded-full bg-surface px-1.5 py-0.5 text-[11px] font-medium text-fg-muted tabular-nums">
                    {visible.filter((task) => task.status === status).length}
                  </span>
                  {canCreate && projectKey && status !== "done" ? (
                    <span className="ml-auto">
                      <NewTaskDialog
                        projectKey={projectKey}
                        team={team}
                        viewerUserId={viewerUserId}
                        canAssignOthers={canManage}
                        defaultStatus={status}
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label={`Add a task to ${meta.label}`}>
                            <Plus aria-hidden="true" />
                          </Button>
                        }
                      />
                    </span>
                  ) : null}
                </div>
                <ul className="flex flex-1 flex-col gap-2 px-2 pb-2">
                  {cards.map((task) => (
                    <Card
                      key={task.id}
                      task={task}
                      projectKey={keyOf(task)}
                      showProject={!projectKey}
                      movable={canMove(task)}
                      dragging={dragging === task.id}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/task-id", task.id);
                        event.dataTransfer.effectAllowed = "move";
                        // The whole card as the drag image, not the link text the drag began on.
                        const rect = event.currentTarget.getBoundingClientRect();
                        event.dataTransfer.setDragImage(
                          event.currentTarget,
                          event.clientX - rect.left,
                          event.clientY - rect.top,
                        );
                        setDragging(task.id);
                      }}
                      onDragEnd={() => {
                        setDragging(null);
                        setOver(null);
                      }}
                      onMove={(next) => move(task, next)}
                    />
                  ))}
                  {cards.length === 0 ? (
                    <li className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-fg-subtle">
                      {dragging ? "Drop here" : "Nothing here"}
                    </li>
                  ) : null}
                  {hidden > 0 ? (
                    <li>
                      <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowAllDone(true)}>
                        Show {hidden} older
                      </Button>
                    </li>
                  ) : null}
                </ul>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function Card({
  task,
  projectKey,
  showProject,
  movable,
  dragging,
  onDragStart,
  onDragEnd,
  onMove,
}: {
  task: BoardTask;
  projectKey: string;
  showProject: boolean;
  movable: boolean;
  dragging: boolean;
  onDragStart: (event: DragEvent) => void;
  onDragEnd: () => void;
  onMove: (status: TaskStatus) => void;
}) {
  const done = task.status === "done";
  return (
    <li
      draggable={movable}
      onDragStart={movable ? onDragStart : undefined}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative flex flex-col gap-2.5 rounded-md border border-border bg-surface p-3 shadow-xs transition-[box-shadow,opacity,border-color] duration-[120ms] hover:border-border-strong",
        movable && "cursor-grab active:cursor-grabbing",
        dragging && "opacity-40",
      )}
    >
      <div className="flex items-center gap-2">
        {movable ? (
          <GripVertical
            className="-ml-1 size-3.5 text-fg-subtle opacity-0 group-hover:opacity-100"
            aria-hidden="true"
          />
        ) : null}
        <span
          className={cn("size-2 shrink-0 rounded-full", PRIORITY_DOT[task.priority])}
          title={`${task.priority} priority`}
        >
          <span className="sr-only">{task.priority} priority</span>
        </span>
        <span className="font-mono text-[11px] text-fg-subtle">{taskRef(projectKey, task.seq)}</span>
        {!done && task.assignee && !task.accepted_at ? (
          <span className="rounded-full bg-status-warning-bg px-1.5 py-0.5 text-[10px] font-medium text-status-warning-fg">
            Not accepted
          </span>
        ) : null}
        {movable ? (
          <span className="relative z-10 ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="size-6" aria-label={`Move ${task.title}`}>
                  <MoreHorizontal aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Move to</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {TASK_STATUSES.map((status) => (
                  <DropdownMenuItem key={status} disabled={status === task.status} onSelect={() => onMove(status)}>
                    <StatusGlyph status={status} />
                    {TASK_STATUS_META[status].label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        ) : null}
      </div>
      <Link
        href={taskHref(projectKey, task.seq)}
        // Left draggable: the title link covers the card, so a drag starts on it
        // and bubbles to the card, which owns the drag. draggable={false} here
        // would cancel the drag before the card ever saw it.
        draggable={movable}
        className={cn(
          "text-sm leading-snug font-medium after:absolute after:inset-0 hover:underline",
          done && "text-fg-muted line-through",
        )}
      >
        {task.title}
      </Link>
      {showProject && task.project ? (
        <span className="-mt-1.5 truncate text-xs text-fg-subtle">{task.project.name}</span>
      ) : null}
      <div className="flex items-center justify-between gap-2 text-xs">
        {task.due_at && !done ? (
          <span className="flex items-center gap-1">
            <CalendarClock className="size-3.5 text-fg-subtle" aria-hidden="true" />
            <Countdown dueAt={task.due_at} className="font-medium" />
          </span>
        ) : (
          <span className="text-fg-subtle">{done ? "Done" : "No deadline"}</span>
        )}
        {task.assignee ? (
          <span title={task.assignee.full_name}>
            <UserAvatar name={task.assignee.full_name} avatarUrl={task.assignee.avatar_url} className="size-6" />
          </span>
        ) : (
          <span className="size-6 rounded-full border border-dashed border-border-strong" title="Unassigned">
            <span className="sr-only">Unassigned</span>
          </span>
        )}
      </div>
    </li>
  );
}
