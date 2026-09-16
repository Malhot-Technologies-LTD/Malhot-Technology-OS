# Feature: Testing (QA)

## Purpose
Make verification a first-class stage that loops back to work: TASK → BUILD → TEST → BUG → FIX → RETEST. Give QA a fast execution surface and give everyone visibility of what is verified and what is broken.

## Data
`test_cases`, `test_runs`, `test_run_cases`, `test_results`, `bugs`. Bug lifecycle: `open → in_progress → fixed → (auto) retest → closed`, reopen `retest → open`.

## Permissions
`product/user-roles.md#testing`. Anyone contributes cases and reports bugs; only QA/manager/admin run tests, record results and verify (close/reopen) bugs; the assignee moves a bug to `in_progress`/`fixed`.

## Testing dashboard `/os/testing`
Cross-project, scoped to the viewer's projects:
- Counters: pending (selected cases without results in open runs), failed (latest results), passed, blocked, open bugs by severity.
- "Tasks awaiting testing" (status `testing`) grouped by project, with "Start run" shortcut pre-selecting cases linked to that task.
- "Bugs in retest" list (for QA), "Bugs assigned to me" (for developers).
- Recent runs with pass rate.

## Project testing workspace `/os/projects/[key]/testing`
Tabs: **Test cases** · **Runs** · **Bugs**.

### Test cases
Table: id, title, linked task (`KEY-n`), priority, latest result (pass/fail/blocked/never run, with run name and date), open bug count. Filters: task, milestone (via task), priority, latest result. Create/edit in a side panel: title*, preconditions, steps* (numbered Markdown list), expected result*, priority, task link. Duplicate. Soft delete (QA/manager).

Bulk create: "Generate cases from task" creates one blank case linked to the task with the title pre-filled — no AI, just a starting point.

### Runs
List: name, environment, executor, started, completed, progress `executed/selected`, pass rate, linked milestone. Create run: name*, description, environment (free text: URL/build), milestone, select cases (filter by task/milestone/priority; select all filtered).

**Execution grid** (the key QA surface): one row per selected case; columns: case title (expand for steps/expected), status buttons **Pass / Fail / Blocked** (keyboard `p` / `f` / `b` on the focused row, `j`/`k` move), actual result (textarea appears on Fail/Blocked), bug (create or link), notes, executed by/at. Recording is one Server Action per result (fast, optimistic); the grid shows saved/saving states per row. "Complete run" when all selected have results (or after removing unexecuted cases from the selection with confirmation).

Fail → "Report bug" dialog pre-filled: title from case, steps from case, expected vs actual, severity, assignee defaults to linked task assignee, links `test_result_id` and `task_id`.

### Bugs
Table: `KEY-Bn`, title, severity, status, assignee, reporter, task, age, reopen count. Filters: status, severity, assignee, task. Bug detail (panel/page): description, steps, expected/actual (from result), attachments (screenshots), comments, linked task and result, status control (allowed transitions only), activity.

Transitions:
| From | To | Who | Effect |
|---|---|---|---|
| open | in_progress | assignee, QA, manager | |
| in_progress | fixed | assignee, QA, manager | trigger rewrites to `retest`, sets `fixed_at`; notifies reporter + QA |
| retest | closed | QA, manager | `closed_at` |
| retest | open | QA, manager | `reopen_count + 1`; notifies assignee |
| open / in_progress | closed | manager only ("won't fix" / duplicate) with required reason | |

The bug's linked task cannot move `testing → done` while the bug is open/in_progress/retest with severity ≥ high (trigger: `MALHOT:invariant:open_high_severity_bugs`). Lower severities show a warning only.

## Connecting to tasks
- Task detail shows "Test coverage": linked cases with latest result and open bugs.
- When a task enters `testing`, project QA members get `testing_requested`; the notification deep-links to "Start run for MAL-42" (cases linked to the task pre-selected; if none exist, opens case creation).
- When all latest results for a task's cases pass and no blocking bugs remain, the task shows "Ready to complete".

## Reports
Testing Report document template pulls: run summary, per-case results, bugs found, pass rate, open bugs at report time (`features/documents.md`).

## States
- No cases: "Test cases describe how to verify a feature. Start from a task." → Create case / Generate from task.
- No runs: "Runs execute a set of cases against a build." → New run (disabled with hint if no cases).
- No bugs: "No open bugs." (that is good news; say so plainly).
- Run with zero selected cases cannot be created.
- Loading skeletons for each tab; grid rows show per-row saving state; errors per row with retry.

## Events
`test_case.created/updated/deleted`, `test_run.created/started/completed`, `test_result.recorded` (status, case, bug), `bug.reported`, `bug.updated`, `bug.assigned`, `bug.status_changed` (from, to, reason), `bug.reopened`, `bug.closed`.

Notifications: `bug_assigned` (assignee), `testing_requested` (QA on task → testing; reporter/QA on bug → retest), `mentioned` in bug comments.

## Out of scope (v1)
Automated test ingestion (JUnit/Playwright reports), test plans/suites hierarchy, requirement coverage matrices beyond the MVP verification view, flaky-test analytics.
