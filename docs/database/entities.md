# Entities — meaning and business rules

Column-level detail: `database/schema.md`. This document explains what each entity *is*, the rules that are not obvious from the DDL, and what was deliberately left out.

## Organization
Malhot Technologies itself. The schema is multi-tenant (every row reaches an organisation) even though v1 runs one organisation, because adding tenancy later touches every table and every policy — adding it now costs one column and one helper. There is no UI to create additional organisations in v1.

## Profile
The person. Discipline (`title`) is a label for coordination, never used for permissions. `timezone` drives "due today" and cron timing per user (future); v1 uses the organisation timezone for overdue computation and the profile timezone for display.

## Organization member / Invitation
Membership is the gate into the OS. An invitation carries the intended org role and optional project grants so onboarding is one step. An organisation must always retain at least one `owner` (trigger).

## Client
A company or person Malhot builds for. Normalised into its own table so several projects can share one client and so the website's case studies can eventually reference real (permitted) client records. Optional on a project (internal projects have none).

## Project
The unit of delivery. Rules:
- `key` is the human identifier (`MAL`, `NGA`). Generated from the name, editable while `planning`, frozen once `active` (trigger) because it appears in GitHub branches and PRs.
- `status` is the lifecycle state machine; `health` is derived (with time-limited override); stage is derived. See `product/project-lifecycle.md`.
- `manager_id` is required for activation. The manager need not have a `project_members` row with role `manager`; the Server Action that sets `manager_id` upserts that row so team views stay consistent.
- `qa_required` (default true) gates `testing → done`.
- Archived projects are read-only for non-admins at the database level.
- Progress = weighted completion: `done tasks / all non-backlog tasks` (subtasks count individually, parents excluded to avoid double counting). Defined once in `project_progress()`.

## Project member
Who is on the project and in what role. A member must belong to the organisation (trigger). Org admins can access all projects without a row; the UI offers "Join as manager" to add themselves when they want to appear on the team.

## Goal
Why the project exists, in outcome terms, with explicit success criteria. 1 to ~5 per project. Status `achieved` is set by the manager (judgement call, not computed). `dropped` keeps history without deletion.

## MVP item
The smallest deliverable set that satisfies the goals. Each item should link to a goal (warning if not). `status` is manual but the UI suggests `done` when all linked tasks are `done`. Traceability: Goal ← MVP item ← Task.

## Milestone
A dated checkpoint. Tasks may reference a milestone. Overdue = `due_date < today and completed_at is null`. Completing a milestone is a manual manager action; the UI proposes it when all linked tasks are done.

## Task
The unit of work. Rules:
- `number` per project → `KEY-n`. Immutable.
- Subtasks are tasks with `parent_task_id`; **one level only** (a subtask cannot have subtasks). Subtasks inherit project, may have their own assignee/due date/status. A parent cannot be `done` while any subtask is not `done`.
- `position` orders cards inside a status column.
- `reviewer_id` is set when moving into `review` (defaults to manager); used for `review_requested` notifications.
- `completed_at` set/cleared by trigger on entering/leaving `done`.
- `overdue_notified_at` ensures one overdue notification per slip; cleared when `due_date` moves into the future.
- Traceability links (`goal_id`, `mvp_item_id`, `milestone_id`) are optional and must belong to the same project (trigger).
- Soft delete; deleting a parent soft-deletes subtasks (Server Action), and removes dependency rows (cascade).
- `estimate_hours`/`actual_hours` are planning aids; no timers, no time entries in v1.

## Task dependency
`blocking_task_id` must finish before `blocked_task_id` should start. Same project only. Cycles rejected. Dependencies inform (timeline arrows, warnings), they do not block status changes — real teams route around blockers and the system should reflect reality rather than police it.

## Comment
Discussion attached to a task, bug, document, goal or MVP item. Markdown body; `mentions` extracted server-side from `@[user_id]` tokens produced by the composer. Edited comments keep `edited_at`; deletion is soft (shows "comment deleted" placeholder to preserve thread context).

## Attachment
A file in Storage linked to an entity. The row is created before upload (so the path is authorised and known); orphan rows without an object after 24 h are cleaned by cron. Deleting the row deletes the object (Server Action).

## Test case
A reusable, written check: preconditions, steps, expected result. Optionally linked to a task (the feature it verifies). Lives beyond a single run.

## Test run
An execution session ("Sprint 3 regression on staging") that selects cases (`test_run_cases`) and records a result per executed case. A run completes when the executor marks it complete (all selected cases have results, or remaining are explicitly skipped by removing them from the selection). Pass rate = pass / (pass + fail + blocked).

## Test result
One case executed once in one run: pass / fail / blocked, actual result, optional bug. Re-running a case creates a new result in a new run; history is preserved.

## Bug
A defect. Lifecycle `open → in_progress → fixed → retest → closed`, reopen from `retest` to `open` (increments `reopen_count`). Marking `fixed` automatically transitions to `retest` (the trigger rewrites the status) and notifies QA/reporter. Bugs may link to the task where they were found and to the failing test result. Severity is separate from task priority.

## Document
A professional artefact tied to a project (or organisation-level for admins). Content is Tiptap JSON; `plain_text` is extracted for search and previews. Approval increments `version` and snapshots into `document_versions`. `template_key` records which generator created it. Approved documents are read-only; edits require "return to draft" (which creates a new working version).

## Activity
Append-only business audit log. Written by the application through `emit()`. `action` vocabulary is defined in `lib/events/types.ts` and listed in `features/notifications.md`. Never updated or deleted (no policies for it).

## Notification
A per-user pointer to something that needs attention, with a resolved `href`. Read state only; no dismissal semantics beyond read. Deleted after 90 days.

## GitHub installation / repository / issue / pull request
Cache of the GitHub state the OS needs to display and link. GitHub is the source of truth. One repository serves one project in v1 (unique on `repo_id`).

## Task ↔ GitHub link
Explicit join between a task and an issue or PR, with `source` auto/manual. Displayed on the task and on the GitHub page. Auto links are never removed automatically.

## Deployment
A record that a build reached an environment. `provider` says where it came from (manual entry, GitHub deployment_status, later Vercel). Production successes notify the manager and feed the Deployment Report.

## Webhook event
Raw delivery log for idempotency and replay. Payloads pruned after 90 days.

## Inquiry
A website contact submission. Surfaced to org admins in the OS; can pre-fill a new project. Not a CRM.

## Deliberately not modelled in v1
- Time entries, invoices, budgets.
- Sprints/iterations (milestones cover the team's actual cadence; add if the team adopts sprints).
- Custom fields, labels/tags on tasks (add labels when a real need appears; priority + MVP/goal links cover current filtering).
- Task watchers/subscriptions (notifications are rule-based; watchers add spam risk).
- Document comments anchored to text ranges (comments on the document as a whole are enough).
- Multiple repositories per project (unique constraint can be relaxed later).
