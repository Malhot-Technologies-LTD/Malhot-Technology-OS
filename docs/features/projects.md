# Feature: Projects

## Purpose
Projects are the unit of delivery and the root of the traceability graph. This feature covers the project list, guided creation, the overview (command centre), settings, status transitions, health and progress.

## Data
`projects`, `project_sequences`, `project_members`, `clients`. Derived: `project_progress()`, `project_health()`, stage (TS). See `database/schema.md`, `product/project-lifecycle.md`.

## Permissions
`product/user-roles.md#projects`. Create: any org member. Edit/status/members/archive: manager or org admin. Delete (soft): org admin.

## Project list `/os/projects`

- Data table: key, name, client, status, health, manager (avatar + name), progress (bar + `done/total`), target end (with overdue styling), priority, updated.
- Default filter: status ≠ archived. Filters: status, health, manager, client, priority, "my projects". Sort: name, status, target end, updated, progress. Search: name/key.
- Row click → overview. Row menu: open board, open timeline, archive (manager+).
- URL-state filters; paginated at 50; server-side filtering.
- Empty: "No projects yet — Create your first project". Filtered-empty: "No projects match — Clear filters".
- Admins see a secondary tab "Deleted" (restore within 30 days).

## Create project `/os/projects/new`

Guided wizard, 8 sections, one page with a left stepper (desktop) / vertical accordion (mobile). Steps after **Basics** are optional at creation and can be completed later; the overview readiness checklist drives activation.

| Step | Fields | Validation |
|---|---|---|
| 1 Basics | name*, key* (auto from name, editable), description, client (select or create inline), priority | key `^[A-Z]{2,6}$`, unique in org; name ≤ 120 |
| 2 Team | manager* (defaults to creator), members with project roles | manager must be org member |
| 3 Timeline | start date, target end date, initial milestones (title + date, repeatable) | end ≥ start |
| 4 Goals | repeatable: title*, success criteria, owner | ≥ 1 recommended |
| 5 MVP | repeatable: title*, priority, linked goal | |
| 6 Success criteria | project-level success criteria (text); the wizard explains that per-goal criteria live on goals | |
| 7 Repository | pick from connected GitHub installation repos, or skip | requires installation; manager+ |
| 8 Review | summary of everything; "Create project" | |

Step data is persisted in `sessionStorage` (survives refresh). Submission is one Server Action `createProject()` that performs the inserts in order and emits events; partial failure after project insert leaves a `planning` project with an explanatory toast (nothing is silently lost).

## Project overview `/os/projects/[key]`

Header: key · name · status badge (with transition menu for manager+) · health indicator (computed; override marker) · priority · manager · client · dates · "Activate" primary action while `planning`.

Body (desktop two columns):

Left (facts and progress):
- **Readiness checklist** (while `planning`): goals ✓/✗, MVP ✓/✗, manager ✓/✗, start date ✓/✗, milestone (recommended). Each links to fix.
- **Stage stepper** (derived).
- **Progress**: tasks done/total, by status distribution bar, MVP items done/total, milestones completed/total, next milestone with countdown.
- **Goals & MVP** compact list (top 5, link to full page).
- **Milestones** (next 3).
- **Team** avatars with roles; "Manage" for manager+.
- **GitHub** repo chip with open PRs / issues count.
- **Documents** last 3 with status.

Right:
- **Task summary**: overdue, due this week, in review, in testing (each a link with filter applied).
- **Open bugs** by severity.
- **Recent activity** (10, link to project activity).

Tabs (project navigation): Overview · Goals & MVP · Tasks · Timeline · Testing · GitHub · Documents · Activity · Settings (manager+).

## Health

Computed (`product/project-lifecycle.md#derived-health`). Indicator tooltip lists the contributing signals ("3 of 8 open tasks overdue; milestone 'Beta' 9 days late"). Manager can "Set health" with a reason → `health_override`, shown as "Manager-assessed: At risk (reason)" alongside computed value when they differ; auto-expires after 14 days.

## Status transitions

Menu shows allowed targets only (per state machine). Each transition opens a small dialog: `on_hold` and `archived` require a reason; `completed` shows open work warnings; `active` shows readiness blockers. Server Action + trigger enforce.

## Project settings `/os/projects/[key]/settings`

General (name, description, client, priority, dates), Team (members/roles, transfer manager), Workflow (`qa_required`, key — editable only while planning), Integrations (repository connect/disconnect), Danger zone (archive; delete for admin).

## States
- Loading: skeleton header + skeleton cards.
- Empty overview (new project): checklist prominent; other cards show their empty states with actions ("Add goal").
- Errors: per-card boundaries.
- Not found / no access: `[key]` layout renders access-denied or not-found (key echoed, name withheld).
- Archived: read-only banner with "Unarchive" for admins.

## Events
`project.created`, `project.updated`, `project.status_changed` (metadata: from, to, reason), `project.health_overridden`, `project.member_added/removed/role_changed`, `project.archived`, `project.deleted`, `project.restored`.

## Out of scope (v1)
Project templates, cloning, budgets, custom fields, portfolio views beyond list/timeline/reports.
