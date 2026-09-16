# Feature: Tasks

## Purpose
The unit of work. Board for flow, detail panel for depth, My Tasks for personal focus. Reliability over animation.

## Data
`tasks` (incl. subtasks via `parent_task_id`), `task_dependencies`, `comments`, `attachments`, `task_github_links`. Status machine: `product/project-lifecycle.md#task-status-machine`.

## Permissions
`product/user-roles.md#tasks`. Highlights: viewer read-only; `testing → done` gated by `qa_required`; delete own task only if no subtasks/dependents; manager can delete any.

## Board `/os/projects/[key]/tasks`

Columns: Backlog · To Do · In Progress · Review · Testing · Done (Done shows last 14 days by default with "Show all").

Card: `KEY-n` (mono), title, priority badge (only medium+ shows colour; low is neutral), assignee avatar, due date (overdue red, due ≤ 2 days amber), subtask progress `2/5`, PR/issue badges (state-coloured), dependency indicator (blocked-by count when blockers not done), milestone chip (optional via density setting).

Interactions:
- Drag between/within columns (dnd-kit; pointer + keyboard sensors). Drop → optimistic move → `updateTaskStatus({ toStatus, toPosition })`. Failure → revert + toast with reason (e.g. QA gate).
- Card menu / keyboard: Move to…, Assign to me, Set priority, Open.
- Quick create at the bottom of any column: title → `Enter` creates in that status with defaults; `Shift+Enter` opens the full form.
- Filters (URL): assignee (me/any member/unassigned), priority, milestone, MVP item, goal, has PR, overdue, search. Group toggle: none / by milestone / by assignee (swimlanes) — implemented as vertical sections within columns, not a second board engine.
- List view toggle: same data as a sortable table (for bulk scanning). Bulk actions in list view: assign, set priority, set milestone, move status (respecting gates; partial failures reported per task).
- Realtime: `useProjectBoardRealtime` refreshes on remote changes.

Backward move from Review/Testing prompts for a comment (required) — captured in the same action call.

## Task detail (panel or page) `?task=KEY-n` / `/tasks/[number]`

Header: `KEY-n` · title (inline edit) · status select (gated) · priority · assignee · reviewer (when in review) · due date · estimate · milestone · goal/MVP link · parent link (for subtasks) · actions menu (copy link, duplicate, delete).

Body tabs or stacked sections (stacked on desktop panel; tabs on mobile):
1. **Description** — Markdown editor (lightweight: bold/italic/lists/code/links/checklists via a small Tiptap instance producing Markdown), autosave on blur.
2. **Subtasks** — checklist-style list with status, assignee, due; add inline; each is a real task (openable).
3. **Dependencies** — "Blocked by" and "Blocks" lists; add via combobox (same project); cycle error explained ("Adding this would create a loop: MAL-3 → MAL-7 → MAL-3").
4. **GitHub** — linked issues/PRs with state; "Link" combobox searching cached issues/PRs by number/title; auto-linked items marked.
5. **Attachments** — upload (drag/drop, ≤ 50 MB), list with type icon, size, uploader, download (signed URL), delete (own/manager).
6. **Comments** — chronological, Markdown, `@mention` with member combobox; edit/delete own; "changes requested" comments from review moves are highlighted.
7. **Activity** — task-scoped activity (status changes, assignments, links).
8. **Test coverage** — linked test cases with latest result, open bugs for this task (read; links to Testing).

Editing never navigates away; the panel keeps board scroll and filters. Close → `Esc` or URL back.

## My Tasks `/os/my-tasks`

Sections: **Overdue** · **Today** · **Upcoming** (next 14 days, grouped by day) · **No due date** · **Completed** (last 7 days, collapsed). Also "Awaiting my review" (tasks where I am reviewer and status is `review`) pinned at the top when non-empty.

Row: project key chip, `KEY-n`, title, status, priority, due, quick status change. Filters: project, priority, status. Includes subtasks. Includes bugs assigned to me as a separate section ("Bugs assigned to me") because they are work too.

## Creation form (full)

title*, description, status (default per context), priority, assignee, reviewer (optional), due date, start date, estimate hours, milestone, goal, MVP item, parent task (when creating a subtask), dependencies. Only title is required; everything else has sensible defaults and is editable later.

## Overdue logic
`due_date < today (org timezone)` and status ≠ done. Displayed everywhere via one `DueDate` component. Notification once per slip via cron (`product/workflows.md#w9`).

## Positioning
`position` per (project, status). Move computes midpoint between neighbours; when the gap < 1e-6, the action re-spaces the column (single update statement) before inserting. Concurrent moves are last-write-wins, which is acceptable; realtime refresh reconciles views.

## States
- Board empty (no tasks): a single centred empty state with "Create task" and "Create from MVP items" (opens picker).
- Column empty: subtle placeholder "Drop tasks here".
- Filtered empty: banner "No tasks match — Clear filters".
- Panel not found: "Task MAL-999 does not exist or was deleted" with link to board.
- Loading: board skeleton with 6 columns × 3 cards.
- Realtime paused indicator when disconnected > 30 s.

## Events
`task.created`, `task.updated` (metadata: changed fields), `task.status_changed` (from, to, comment), `task.assigned` (assignee, previous), `task.reviewer_set`, `task.completed`, `task.reopened`, `task.deleted`, `task.restored`, `task.dependency_added/removed`, `task.subtask_added`, `task.github_linked/unlinked`, `comment.created/edited/deleted`, `attachment.added/removed`.

Notifications: `task_assigned` (assignee), `review_requested` (reviewer), `testing_requested` (project QA members, when entering testing), `mentioned` (mentioned users), changes-requested comment → assignee (`mentioned`-class with distinct title), `task_overdue` (assignee, cron).

## Out of scope (v1)
Recurring tasks, task templates, time tracking timers, labels/tags, custom statuses per project, sprint boards, story points.
