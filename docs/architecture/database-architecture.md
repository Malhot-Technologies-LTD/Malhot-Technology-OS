# Database Architecture

PostgreSQL 15+ on Supabase. The database is the system of record and the last line of authorisation defence. The full DDL blueprint is in `database/schema.md`; this document defines the conventions that blueprint follows.

## Conventions

| Concern | Convention |
|---|---|
| Naming | `snake_case`; tables plural (`tasks`), columns singular; FK columns `<entity>_id`; booleans `is_*`/`*_required`; timestamps `*_at`; dates `*_date` |
| Primary keys | `id uuid primary key default gen_random_uuid()` |
| Timestamps | `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()` maintained by trigger `set_updated_at()` |
| Authorship | `created_by uuid references profiles(id)` where a human creates the row; nullable when system-created |
| Tenancy | Every business table carries `organization_id` directly **or** reaches it through `project_id` in one hop. RLS helpers resolve the org through the project. |
| Enums | Postgres `enum` types for closed vocabularies (status, priority, role). Adding a value is a migration (`alter type ... add value`), which is acceptable at this change rate and gives exact generated TS unions. |
| Text | `text` with `check (char_length(x) <= N)`; no `varchar(n)` |
| JSON | `jsonb` for editor content, event metadata, webhook payloads, GitHub label arrays. Never for data we filter or join on. |
| Money / hours | `numeric(6,2)` for hours. No money in v1. |
| Ordering | `position double precision` for user-ordered lists (board columns, goals, MVP items, milestones). Insert between neighbours as midpoint; re-space when gaps drop below 1e-6 (rare; handled by a maintenance function). |
| Human keys | `projects.key` (2 to 6 uppercase letters, unique per org); `tasks.number` and `bugs.number` per project via `next_project_sequence(project_id, 'task' | 'bug')` in a `BEFORE INSERT` trigger backed by `project_sequences` (row-locked, gapless enough). |

## Soft deletion

- Soft-deleted (`deleted_at timestamptz null`): `projects`, `tasks`, `comments`, `documents`, `test_cases`, `bugs`. These are things people reference in conversation and may need to restore or audit.
- Hard-deleted: join/link rows (`project_members`, `task_dependencies`, `task_github_links`), `attachments` (with storage object removal), `notifications` (user-cleared), `mvp_items`, `goals`, `milestones` (deleting these is a planning correction; activity records the deletion with a snapshot in metadata).
- All reads on soft-deleted tables filter `deleted_at is null`; RLS `select` policies include the filter too so forgotten filters cannot leak. Org admins can list deleted rows through a dedicated "Recently deleted" query using a separate policy predicate (`is_org_admin`), with restore within 30 days; the daily cron hard-deletes after 30 days.
- Archival is preferred to deletion for projects and documents (`archived_at`).

## Indexing strategy

Index for the queries we run, no more:

- Every FK column (Postgres does not do this automatically).
- `tasks (project_id, status, position)` — board.
- `tasks (assignee_id, status) where deleted_at is null` — My Tasks.
- `tasks (due_date) where status <> 'done' and deleted_at is null` — overdue scans.
- `tasks (project_id, number)` unique — key lookup.
- `activities (project_id, created_at desc)`, `activities (organization_id, created_at desc)`.
- `notifications (user_id, created_at desc) where read_at is null` — badge and popover.
- `documents (project_id, status)`, `documents (organization_id, updated_at desc)`.
- `github_pull_requests (repository_id, state)`, `github_issues (repository_id, state)`.
- `webhook_events (processed_at) where processed_at is null` — retry scan.
- Full-text: `tasks` and `documents` get a generated `search tsvector` column with a GIN index for the command palette (title + description; document title + plain-text extract updated by trigger). Postgres FTS is enough; no external search service.

Review `pg_stat_statements` after the first month of real use and adjust.

## Triggers and functions (invariants only)

| Name | Purpose |
|---|---|
| `set_updated_at()` | Maintain `updated_at` |
| `handle_new_auth_user()` | `auth.users` insert → `profiles` row |
| `assign_project_sequence()` | Per-project `number` for tasks and bugs |
| `enforce_project_status_transition()` | Allowed status pairs (`product/project-lifecycle.md`) |
| `enforce_task_status_rules()` | `done` gating by `qa_required` and role; parent/subtask rule; set/clear `completed_at`; clear `overdue_notified_at` when due date moves to the future |
| `enforce_bug_status_rules()` | Bug state machine, auto `fixed → retest`, `reopen_count` |
| `enforce_document_status_rules()` | Document state machine; snapshot into `document_versions` on approve |
| `reject_writes_on_archived_project()` | Block inserts/updates on child tables of archived projects except by org admins |
| `prevent_task_dependency_cycle()` | Recursive CTE check on insert (depth-limited to 100) |
| `documents_search_update()` | Maintain search vector |
| `project_health(project_id)` | Health computation for list queries (mirrors TS implementation; both tested against the same fixtures) |
| `dashboard_counts(org_id)`, `project_progress(project_id)`, report functions | Aggregates in SQL |

Triggers are kept few and each has a SQL test.

## Migrations

- Supabase CLI migrations in `supabase/migrations/<timestamp>_<name>.sql`. Hand-written SQL (declarative, reviewable), not ORM-generated.
- Each migration is forward-only and idempotent where feasible (`create ... if not exists` for extensions; enums added with `add value if not exists`).
- Destructive changes (drop column/table) require a two-step migration across releases: stop writing → deploy → drop.
- Reversal: documented per migration in a header comment; not automated (Supabase migrations are forward-only; rollback is a new forward migration).
- Local: `supabase db reset` applies all migrations + `seed.sql`. CI runs the same to verify a clean apply.
- Types: `supabase gen types typescript --local > types/database.ts` committed; CI fails if regenerated output differs.

## Seed data

`supabase/seed.sql` creates the development organisation, five development users (clearly named `dev.*@malhot.local`), one sample project with goals/MVP/tasks/tests/documents. Every seeded row has `metadata->>'seed' = true` where a metadata column exists, and the organisation is named "Malhot (Development)". Seeds never run against production; the deploy pipeline has no seed step.

## Realtime publication

`supabase_realtime` publication is restricted to `tasks` and `notifications`. RLS applies to Realtime (Postgres Changes respects policies), so a user only receives rows they could select.

## Backups and retention

- Supabase daily backups (Pro plan) with PITR considered once the OS holds client deliverables. Backup restore rehearsed once before go-live (`engineering/deployment.md`).
- `webhook_events` payloads retained 90 days; `activities` retained indefinitely; `notifications` read > 90 days deleted by cron.

## Scale expectations (design envelope)

5 to 20 users, < 100 projects, < 50k tasks, < 1M activities over several years. Everything above fits a single small Postgres instance with the indexes listed; nothing here needs sharding, read replicas or caching layers.
