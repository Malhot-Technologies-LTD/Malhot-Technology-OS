# Feature: Timelines and Milestones

## Purpose
Show *when* — project span, milestones, task durations, dependencies, what is late — readably. This is a "Gantt-lite": enough to plan and spot slippage, not an enterprise scheduling engine.

## Data
`projects.start_date/target_end_date`, `milestones`, `tasks.start_date/due_date/completed_at`, `task_dependencies`.

## Permissions
Milestones: manage by manager+. Timeline is read for all members; dragging bars to change dates is available to contributors for tasks (same permission as editing a task) and manager+ for milestones.

## Views

### Project timeline `/os/projects/[key]/timeline`
- Horizontal time axis (zoom: week / month / quarter), vertical rows.
- Row 0: project span bar (start → target end; actual end when completed).
- Milestone markers (diamonds) on their due dates; overdue incomplete milestones red; completed green with check.
- Task rows grouped by milestone (then "No milestone"). Bar from `start_date` (or `created_at` if none, rendered hollow) to `due_date`; tasks without due date appear in a side list "Unscheduled", not on the chart. Bar fill reflects status (done = success colour, in progress = accent, overdue = danger outline). Subtasks nested/collapsible.
- Dependency arrows between bars (SVG overlay), highlighted on hover; a blocker that ends after the blocked task starts is drawn in warning colour.
- Today line. Sticky left column with task key/title. Hover card with details; click opens task panel.
- Drag bar edges/whole bar to change dates (snaps to days) → Server Action; optimistic with revert on failure.
- Filters: assignee, status, milestone; toggle "show done".

### Cross-project timeline `/os/timeline`
One row per active project (span bar + milestone markers + progress %), sorted by target end date. Click → project timeline. Filters: status, manager, health.

### Milestone view (within project timeline as a list mode)
Table: milestone, due date, status (upcoming / due soon / overdue / completed), tasks done/total, linked test runs, actions (complete, edit).

## Milestone rules
- `completed_at` manual (manager+); UI proposes completion when all linked tasks are done.
- Overdue = `due_date < today and completed_at is null`; one notification to the manager via cron.
- Deleting a milestone unlinks tasks (set null) and records activity with the milestone snapshot.

## Rendering approach
Custom React + SVG/CSS (no Gantt library): rows are plain DOM (virtualised with a simple windowing hook if > 200 rows), bars are absolutely positioned divs computed from a `scale(date) → px` function, arrows are one SVG layer. Keeps bundle small and styling consistent. Keyboard: arrow keys move focus between bars; `Enter` opens; date changes via the task panel for keyboard users (drag has a form equivalent).

## Progress
Project progress on the timeline uses `project_progress()` (same as everywhere). Milestone progress = done linked tasks / linked tasks.

## States
- No dates set: "Set a start and target date to see the timeline" → edit project.
- No milestones: prompt to add; tasks still render under "No milestone".
- Loading: axis + 6 skeleton bars.
- Mobile: list mode only (`design/responsive-strategy.md`).

## Events
`milestone.created/updated/completed/reopened/deleted`, `task.rescheduled` (from timeline drags; metadata: field, from, to).

## Out of scope (v1)
Critical path calculation, auto-scheduling from dependencies, resource levelling, baselines/versions of the plan, calendar exports (roadmap: ICS feed), working-days calendars.
