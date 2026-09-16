# Feature: Goals and MVP

## Purpose
Make the *why* explicit and traceable: Project → Goals → MVP items → Tasks. The page answers "what does success mean, what is the smallest thing that achieves it, and how much of that is built and verified".

## Data
`goals`, `mvp_items`, `tasks.goal_id`, `tasks.mvp_item_id`; views `v_task_traceability`, `v_mvp_verification`.

## Permissions
Create/edit/reorder: contributor+. Delete, mark goal achieved: manager+. Viewer read-only.

## Page `/os/projects/[key]/goals`

Two stacked sections with a coverage summary at the top: "4 goals · 9 MVP items (6 done) · 2 MVP items without linked tasks · 1 MVP item not linked to a goal".

### Goals
List (drag to reorder, keyboard reorder). Each row: title, owner chip, status badge, linked MVP items count, linked tasks done/total, expand for description and success criteria, comments. Actions: edit inline, change status (`not_started → in_progress` automatic when a linked task starts; `achieved`/`dropped` manual by manager), add MVP item under this goal.

Create: title*, description, success criteria (Markdown), owner.

### MVP items
Grouped by goal (with an "Unlinked" group flagged with a warning). Each row: title, priority, status, linked tasks done/total with a mini progress bar, verification indicator (from `v_mvp_verification`: verified when all linked tasks are done and have ≥ 1 passing latest test result and no open bugs; partially verified; unverified). Actions: edit inline, change status, "Create task from item" (pre-fills project, mvp item, goal), link existing tasks (combobox), reorder.

Create: title*, description, priority, goal.

Status suggestion: when all linked tasks reach `done`, the item shows "All tasks done — mark as Done?" (one click). It is not automatic because "done" for an MVP item is a product judgement.

## Traceability panel
From a task, goal or MVP item, a "Trace" popover shows the chain: Goal → MVP item → Tasks → PRs → Tests. Read-only, links to each.

## States
- Empty goals: "Define what success looks like. Goals give every task a reason." → Add goal. While the project is `planning`, the readiness checklist links here.
- Empty MVP: "The MVP is the smallest set of items that satisfies the goals." → Add MVP item.
- Warnings (not errors): MVP item without goal; goal without MVP items; MVP item without tasks — each with a fix action.

## Events
`goal.created/updated/deleted/status_changed/reordered`, `mvp_item.created/updated/deleted/status_changed/reordered`, `mvp_item.task_linked/unlinked`.

Notifications: goal owner when a goal is marked achieved or dropped (`project_updated`). Nothing else — planning edits are visible in activity.

## Out of scope
OKR scoring, weighted goals, multiple MVP phases (use milestones for phasing).
