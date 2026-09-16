# Feature: Reports

## Purpose
Operational reports that help the team make decisions: where is work stuck, what is late, is testing keeping up, who is overloaded, what did we ship. No vanity metrics (no "velocity trends" or "productivity scores").

## Scope and permissions
Org admins see organisation-wide reports. Everyone else sees reports scoped to projects they belong to (the scoping is automatic through RLS: report functions only aggregate visible rows). Team-page workload is coordination, not surveillance: no per-person time metrics, no rankings.

## Reports (v1)

| Report | Question | Content | Source |
|---|---|---|---|
| **Project progress** | How far along is each project? | Table: project, status, health, progress (done/total), MVP done/total, milestones completed/total, next milestone, target end, days remaining | `report_project_progress(org)` |
| **Task completion** | What got done, and is flow healthy? | Completed per week (last 12 weeks) by project; created vs completed; current distribution by status; median days in `review` and `testing` (flow bottleneck signal) | `report_task_completion(org, from, to)` |
| **Overdue work** | What is late right now? | Overdue tasks and bugs by project and assignee, days overdue, priority/severity; overdue milestones | `report_overdue(org)` |
| **Testing status** | Are we verifying what we build? | Per project: cases, cases never run, latest pass/fail/blocked counts, open bugs by severity, bugs in retest, avg days from `open` to `closed` | `report_testing(org)` |
| **Project timeline** | Are we on plan? | Per project: planned span vs actual, milestone planned vs completed dates, slip in days | `report_timeline(org)` |
| **Workload** | Is anyone overloaded or idle? | Per member: open tasks by status, overdue count, due this week, estimate hours open (if estimates used), bugs assigned; per project split | `report_workload(org)` |
| **Completed projects** | What did we deliver? | Completed/archived projects: client, duration, tasks, MVP completion, deployments, final report link | `report_completed_projects(org)` |

Each report: filters (project(s), date range where relevant), a summary line, a chart where it genuinely helps (bar/line only; no pies), the table, and **Export CSV** (server action → CSV; the raw table).

## Charts
Small, consistent, brand-neutral: bars for distributions and weekly counts, line for created vs completed, no 3D, no gradients. Library: a small charting library (Recharts) loaded only on `/os/reports`; tables always accompany charts (accessibility and precision). Colours from status tokens where the series *are* statuses; otherwise neutral scale.

## Implementation
SQL functions return flat rows (one round-trip each). RSC pages call them in parallel. If any exceeds ~300 ms at realistic volumes, precompute nightly into a `report_snapshots` table (not in v1).

Dashboard widgets reuse the same functions with narrower parameters (single source of numbers — the dashboard and the report never disagree).

## States
- Insufficient data: "Not enough completed work yet to show trends" (for time-series reports before 2 weeks of data) — tables still show.
- Empty org: prompt to create a project.
- Loading: chart + table skeleton.
- Export in progress: button pending; large exports (> 10k rows) are capped with a message to narrow filters.

## Out of scope (v1)
Custom report builder, scheduled report emails, burndown/velocity, time/cost reports, client-facing reports (approved documents serve that purpose).
