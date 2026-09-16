# Project Lifecycle

## The lifecycle

```text
IDEA → PROJECT CREATED → GOALS DEFINED → MVP DEFINED → PLANNING → TASKS ASSIGNED
→ DEVELOPMENT → REVIEW → TESTING → FIXES → DEPLOYMENT → CLIENT DELIVERY
→ PROJECT CLOSED → DOCUMENTATION ARCHIVED
```

## One state machine, one derived view — a deliberate design decision

The brief lists fourteen lifecycle stages **and** six project statuses (`Planning, Active, At Risk, On Hold, Completed, Archived`). Storing both as independent fields would create two sources of truth that drift. The OS therefore models:

1. **`projects.status`** — the manually-controlled lifecycle state machine (5 values, below).
2. **Stage** — *derived* from project data (has goals? has MVP? tasks in progress? testing runs exist? deployment recorded?). Never stored.
3. **Health** — *derived* from overdue work, milestone slippage and runway, with an optional manual override. Never a status.

`At Risk` is therefore a **health** value, not a status. A project can be `Active` and `At Risk` simultaneously; treating "at risk" as a status would force a manager to choose between describing where the project is and describing how it is going. This is a deviation from the brief and is listed in `planning/open-decisions.md`.

### Status state machine (`project_status`)

```text
planning ──► active ──► completed ──► archived
   │           │  ▲          ▲
   │           ▼  │          │
   │        on_hold ─────────┘  (on_hold → completed allowed: cancelled projects close via completed with outcome note)
   └──────────► archived     (abandoned before start)
```

| From | To | Who | Requirements |
|---|---|---|---|
| `planning` | `active` | Manager, Org Admin | ≥1 goal, ≥1 MVP item, manager set, start date set. Enforced by Server Action (warns and blocks); the UI shows a readiness checklist. |
| `planning` | `archived` | Manager, Org Admin | Confirmation with reason |
| `active` | `on_hold` | Manager, Org Admin | Reason (stored in activity metadata) |
| `on_hold` | `active` | Manager, Org Admin | — |
| `active` / `on_hold` | `completed` | Manager, Org Admin | Warning if open tasks exist or open bugs of severity ≥ high; may proceed with acknowledgement. Sets `actual_end_date`. |
| `completed` | `archived` | Manager, Org Admin | Documents in `draft`/`in_review` are flagged; recommended (not required) that final report is `approved`. Sets `archived_at`. |
| `completed` | `active` | Org Admin | Reopen (rare, audited) |
| `archived` | anything | Org Admin | Unarchive to `completed` only |

Transitions are enforced by a Postgres trigger (`enforce_project_status_transition`) using the allowed-pairs table above, and by the Server Action which adds the readiness checks and richer error messages.

### Derived stage

Computed in one place (`features/projects/lib/stage.ts`) and shown on the overview as a stepper:

| Stage | Derived when |
|---|---|
| Idea | status `planning`, no goals |
| Goals defined | ≥1 goal |
| MVP defined | ≥1 MVP item |
| Planning | ≥1 milestone or ≥1 task, status still `planning` |
| Development | status `active`, any task `in_progress` or `review` |
| Testing | any task in `testing`, or a test run started in the last 14 days, or open bugs |
| Deployment | ≥1 deployment with `success` in `staging`/`production` |
| Delivery | `final_report` or `deployment_report` document exists (any status) |
| Closed | status `completed` |
| Archived | status `archived` |

The highest stage whose condition holds wins; earlier stages remain "reached". It is a *view*, so it never blocks anything.

### Derived health (`project_health`)

Computed at read time by `features/projects/lib/health.ts` (and mirrored by a SQL function `project_health(project_id)` for list queries):

| Signal | Weight |
|---|---|
| Overdue open tasks / open tasks | > 25% → at risk, > 50% → off track |
| Any milestone overdue > 7 days | at risk; > 21 days → off track |
| Days remaining to `target_end_date` vs. task completion ratio | if completion < expected by > 20 points → at risk; > 40 → off track |
| Open bugs of severity `critical` | at risk |
| `target_end_date` passed and status still `active` | off track |

Result: `on_track` / `at_risk` / `off_track`. `projects.health_override` (nullable) lets a manager assert a value with a reason recorded in activity; the UI shows both when they differ. Overrides expire automatically after 14 days (cleared by the daily cron) so a stale reassurance cannot hide a real problem.

## Stage-by-stage definition

Each row: what happens, required information, responsible role, notifications, automatic activity events, completion.

### 1. Idea
- **Happens:** someone captures a potential project. In the OS this is simply a project in `planning` with a name and description.
- **Required:** name, description. Client optional. Key auto-generated from name (editable before activation).
- **Responsible:** anyone with org role `member`+ can create; the creator becomes `manager` unless a manager is chosen in the wizard.
- **Activity:** `project.created`.
- **Notifications:** org admins (`project_updated`: created), chosen manager if different from creator.

### 2. Project created
- The guided creation wizard (`features/projects.md`) captures: basics, team, timeline, goals, MVP, success criteria, repository. All steps after basics are optional at creation but required for activation (goals, MVP, manager, start date).
- **Activity:** `project.member_added` per member.
- **Notifications:** each added member (`project_updated`: added to project).

### 3. Goals defined
- **Happens:** manager and team define 1 to ~5 goals with success criteria and an owner.
- **Required per goal:** title, success criteria. Owner recommended.
- **Responsible:** manager (accountable), any contributor may draft.
- **Activity:** `goal.created`, `goal.updated`, `goal.status_changed`.
- **Completion:** ≥1 goal (activation requirement).

### 4. MVP defined
- **Happens:** the smallest set of items that satisfies the goals; each item linked to a goal and prioritised.
- **Required:** title, priority. Goal link strongly recommended; the UI warns on unlinked items.
- **Activity:** `mvp_item.created/updated/status_changed`.
- **Completion:** ≥1 MVP item (activation requirement). The MVP Specification document template becomes available.

### 5. Planning
- **Happens:** milestones, task breakdown, dependencies, estimates, dates.
- **Required:** start date, target end date, ≥1 milestone recommended.
- **Responsible:** manager; team estimates their own tasks.
- **Activity:** `milestone.created`, `task.created`, `task.dependency_added`.
- **Completion:** manager moves status to `active`. Project Plan document template becomes available.

### 6. Tasks assigned
- **Happens:** tasks get assignees and due dates.
- **Notifications:** `task_assigned` to the assignee (one per assignment, debounced on bulk operations: one summary notification if > 3 tasks assigned within 2 minutes by the same actor).
- **Activity:** `task.assigned`.

### 7. Development
- **Happens:** tasks move `todo → in_progress`. GitHub branches/PRs referencing `KEY-n` are linked automatically when webhooks arrive.
- **Activity:** `task.status_changed`, `github.pr_opened`, `github.pr_merged`, `github.issue_closed`.
- **Notifications:** none on plain status changes (avoid spam); task creator and manager see them in activity.

### 8. Review
- **Happens:** task moves to `review`. Reviewer is chosen (defaults to manager or a suggested peer).
- **Notifications:** `review_requested` to the reviewer.
- **Completion:** reviewer moves to `testing` (or back to `in_progress` with a comment — required when moving backwards from `review`).

### 9. Testing
- **Happens:** QA writes/executes test cases in a test run; results recorded; failures create bugs linked to the result and the task.
- **Notifications:** `testing_requested` to project QA members when a task enters `testing`; `bug_assigned` to the bug assignee.
- **Activity:** `test_run.started`, `test_result.recorded`, `bug.reported`.
- **Completion:** task `testing → done` by QA (or manager). If `qa_required = false` any contributor may complete.

### 10. Fixes
- **Happens:** bug `open → in_progress → fixed`; automatically `fixed → retest`. QA retests: `retest → closed` or `retest → open` (reopen, increments `reopen_count`).
- **Notifications:** `testing_requested` to reporter/QA when a bug reaches `retest`; `bug_assigned` on reassignment.
- **Activity:** `bug.status_changed`.

### 11. Deployment
- **Happens:** deployments are recorded (manually in v1; via GitHub `deployment_status` webhooks where the client uses GitHub deployments; Vercel ingestion is roadmap).
- **Required:** environment, status, URL, commit SHA if known.
- **Activity:** `deployment.recorded`.
- **Notifications:** manager (`project_updated`: production deployment).
- Deployment Report template becomes available.

### 12. Client delivery
- **Happens:** final report and deployment report prepared, reviewed, approved. Handover.
- **Notifications:** `document_review_requested`, `document_approved`.
- **Activity:** `document.status_changed`.

### 13. Project closed
- Status → `completed`. `actual_end_date` set. Reports snapshot the final numbers (computed live; no snapshot table in v1).
- **Notifications:** all project members (`project_updated`: completed).

### 14. Documentation archived
- Status → `archived`. Project becomes read-only for everyone except org admins (enforced by RLS: writes on archived projects are rejected, see `database/rls-policies.md`). Documents remain accessible; the project disappears from default lists but is searchable and reportable.

## Task status machine (`task_status`)

```text
backlog → todo → in_progress → review → testing → done
```

- Forward moves: any contributor.
- Backward moves: any contributor, except `done → *` which requires manager/QA/org admin, and moving backwards from `review` or `testing` requires a comment (enforced by the Server Action; the trigger only enforces the role rule).
- Skipping forward (e.g. `todo → testing`) is allowed to avoid ceremony, except into `done` from anything but `testing` when `qa_required = true` (`review → done` is allowed when `qa_required = false`).
- Entering `done` sets `completed_at`; leaving it clears `completed_at`.
- A parent task cannot enter `done` while a subtask is not `done` (trigger).
- A task with an unfinished blocking dependency shows a warning when moved to `in_progress`; it is not blocked (teams route around dependencies in reality; the UI makes it visible).

## Bug status machine (`bug_status`)

```text
open → in_progress → fixed → retest → closed
  ▲                             │
  └──────────── reopen ─────────┘
```

Enforced by trigger; see `features/testing.md`.

## Document status machine (`document_status`)

```text
draft → in_review → approved → archived
  ▲         │
  └─────────┘ (return to draft)
```

Approval snapshots a version. See `features/documents.md`.
