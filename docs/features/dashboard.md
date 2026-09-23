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

## Built so far (Phase 3 slice)

The layout above is the target. Task data does not exist yet, so Home cannot answer "what needs *me* now"; what it can answer honestly is "what is stuck, and what is late". `app/(os)/os/page.tsx` ships that, in the same order of loudness the target uses:

1. **Greeting and date**, in the viewer's own timezone (`profile.timezone`, falling back to UTC) — a dashboard that says "Good morning" at 9pm has admitted the whole page is guessing. Beside it, an org card: where you are and how many projects it holds.
2. **Focus panel** — one `FocusCard`, picked in order of how much it hurts: the most overdue project, else the most blocked one, else the next target date. Never more than one, per `design/design-system.md#the-one-coloured-surface`.
3. **Setup checklist** — profile, first project, goals, MVP, manager. Every step is read off data that already exists, so it cannot claim something is done when it is not, and it removes itself once the required steps pass.
4. **Stat tiles** — active, in planning, past target, total. Each links to the list that explains it.
5. **Needs attention / Projects** (two thirds) beside **Ready to start** and **Upcoming targets** (one third). "Ready" means a project has a manager, a start date, goals and an MVP — the same four checks `getDashboardProjects` counts as blockers.

Data is still the single wave of three flat selects in `getDashboardProjects`; nothing here added a query. Loading is `DashboardSkeleton`, which copies the real measurements rather than approximating them.

Still to come with the phases that own them: My Work (4), recent activity and notifications (4), project health and progress bars (5), per-widget error boundaries.
