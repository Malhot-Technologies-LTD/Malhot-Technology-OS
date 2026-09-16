# Feature: Dashboard (OS Home)

## Purpose
Answer, in this order: what needs *me* now → what needs the team's attention → how are projects doing → what changed → what is coming. Every number is a link to the filtered view that explains it.

## Layout (desktop, three columns; collapses per `design/responsive-strategy.md`)

### Row 1 — My Work (full width, first)
- **Overdue** (my tasks + bugs past due), **Due today**, **Awaiting my review**, **In testing feedback** (my tasks with failed results or open bugs), **Upcoming (7 days)**. Compact list, max 5 per group with "View all in My Tasks".
- Empty: "Nothing due today. Your upcoming work: …" or "You have no assigned tasks." with link to projects.

### Row 2 — Needs attention (org/team scope, visible projects only)
Stat tiles, each a link:
- Active projects · Projects at risk / off track (computed health) · Overdue tasks · Tasks due today · Awaiting review · Testing queue (tasks in testing + bugs in retest) · Open critical bugs.
Tiles show the count and a one-line detail ("2 in MAL, 1 in NGA"). Zero states are shown plainly (no hiding).

### Row 3
- **Project progress** (2/3 width): one row per active project — key, name, health, progress bar with `done/total`, next milestone and date, manager. Sorted: off track, at risk, on track; then by target date. "View all projects".
- **Upcoming** (1/3): milestones and project target dates in the next 30 days, chronological, overdue ones pinned at top in danger colour.

### Row 4
- **Recent activity** (2/3): last 10 across visible projects; "View all".
- **Notifications** (1/3): last 5 unread; "View all".

## Data
One RSC page calling in parallel: `dashboard_counts(org)`, `my_work(user)`, `report_project_progress(org)` (limited), `upcoming(org, 30)`, `listActivity(limit 10)`, `listNotifications(unread, 5)`. All RLS-scoped. Target: < 6 queries, < 400 ms server time at team scale.

## Personalisation
None beyond role scoping in v1. Org admins see org-wide numbers; members see their projects. No widget rearrangement (keep it simple; revisit if asked).

## States
- First run (no projects): welcome panel with "Create your first project" and "Invite your team" (admins), replacing rows 2 to 4.
- Widget errors isolated (per-widget boundary).
- Loading: skeleton grid mirroring layout.

## Out of scope
Custom widgets, saved views, charts on the dashboard (reports own charts), team announcements.
