# Row Level Security Policies

RLS is enabled on **every** table in `public`. `anon` has no policies on any table (the website inserts enquiries through the service role after validation). `authenticated` gets the policies below. `service_role` bypasses RLS by design and is used only where `architecture/backend-architecture.md` says so.

Helper functions are defined in `architecture/authorization.md`. All are `security definer stable` with `set search_path = public`, executable only by `authenticated`.

## Policy matrix

Notation: **S** select, **I** insert, **U** update, **D** delete. `member(p)` = `is_project_member(p)`, `contrib(p)` = `can_contribute(p)`, `manage(p)` = `can_manage_project(p)`, `writable(p)` = `project_is_writable(p)`, `orgadmin(o)` = `is_org_admin(o)`, `orgmember(o)` = `is_org_member(o)`, `me` = `auth_uid()`.

| Table | S | I | U | D |
|---|---|---|---|---|
| organizations | `orgmember(id)` | — (bootstrap only) | `orgadmin(id)` | — |
| profiles | any authenticated user sharing an organisation with the row (`exists org member overlap`) | — (trigger) | `id = me` | — |
| organization_members | `orgmember(organization_id)` | `orgadmin(organization_id)` | `orgadmin(organization_id)` (trigger prevents removing last owner and self-demotion of last owner) | `orgadmin(organization_id) and user_id <> me` |
| invitations | `orgadmin(organization_id)` | `orgadmin(organization_id)` | `orgadmin(organization_id)` (revoke) | — |
| clients | `orgmember(organization_id)` | `orgmember(organization_id)` | `orgadmin(organization_id) or created_by = me` | `orgadmin(organization_id)` |
| projects | `deleted_at is null and member(id)` **or** `orgadmin(organization_id)` (admins also see soft-deleted for restore) | `orgmember(organization_id) and created_by = me` | `manage(id)`; soft delete (`deleted_at` set) only `orgadmin` — trigger | — |
| project_sequences | `member(project_id)` | — (trigger) | — (function) | — |
| project_members | `member(project_id)` | `manage(project_id) and writable(project_id)` | `manage(project_id)` | `manage(project_id)` |
| goals | `member(project_id)` | `contrib(project_id) and writable(project_id)` | `contrib(project_id) and writable(project_id)` (status → achieved: manage, trigger) | `manage(project_id)` |
| mvp_items | `member(project_id)` | `contrib and writable` | `contrib and writable` | `manage(project_id)` |
| milestones | `member(project_id)` | `manage and writable` | `manage and writable` | `manage(project_id)` |
| tasks | `deleted_at is null and member(project_id)` (+ admin sees deleted) | `contrib and writable and created_by = me` | `contrib and writable` (transition rules in trigger) | — (soft only) |
| task_dependencies | `member(project of blocking task)` | `contrib and writable` | — | `contrib and writable` |
| comments | `deleted_at is null and member(project_id)` | `contrib and writable and author_id = me` | `author_id = me or manage(project_id)` (trigger: non-author may only set `deleted_at`) | — |
| attachments | `member(project_id)` | `contrib and writable and uploaded_by = me` | — | `uploaded_by = me or manage(project_id)` |
| test_cases | `deleted_at is null and member(project_id)` | `contrib and writable` | `contrib and writable` | — (soft) |
| test_runs | `member(project_id)` | `(group in qa,manager,admin) and writable` | same | `manage(project_id)` |
| test_run_cases | `member(project of run)` | `(qa,manager,admin) and writable` | — | same |
| test_results | `member(project of run)` | `(qa,manager,admin) and writable and executed_by = me` | `executed_by = me or manage` | — |
| bugs | `deleted_at is null and member(project_id)` | `contrib and writable and reporter_id = me` | `contrib and writable` (transition/role rules in trigger) | — (soft) |
| documents | project docs: `member(project_id)` and (`status = approved` or group ≠ viewer); org docs: `orgadmin(organization_id)` | `contrib and writable` (org-level: orgadmin) | `contrib and writable` (status/author rules in trigger) | — (soft) |
| document_versions | same as parent document select | — (trigger) | — | — |
| activities | `project_id is null ? orgadmin(organization_id) : member(project_id)` | via `emit()` with user client: `orgmember(organization_id) and actor_id = me` | — | — |
| notifications | `user_id = me` | — (only via `emit_event()`, see note below) | `user_id = me` (read_at only, trigger) | `user_id = me` |
| github_installations | `orgmember(organization_id)` | `orgadmin(organization_id)` | `orgadmin` | `orgadmin` |
| github_repositories | `member(project_id)` | `manage and writable` | `manage` | `manage` |
| github_issues / github_pull_requests | `member(project of repository)` | — (service) | — (service) | — |
| task_github_links | `member(project of task)` | `contrib and writable` | — | `contrib and writable` |
| deployments | `member(project_id)` | `contrib and writable` (manual) | `manage` | `manage` |
| webhook_events | — (service only) | — | — | — |
| inquiries | `orgadmin(organization_id)` | — (service) | `orgadmin(organization_id)` (handled_at) | — |
| inquiry_rate_limits | — (service only) | — | — | — |

### Note on notification inserts
`emit()` creates notifications for *other* users. With a user-scoped client the `with check (user_id = me)` would reject that. Two options were weighed: (a) let `emit()` use the admin client for the notification insert only; (b) a `security definer` SQL function `emit_event(...)` that inserts activity and notifications atomically after checking `is_project_member`. **(b) is chosen**: it keeps the service role out of Server Actions, makes activity + notifications transactional, and centralises fan-out rules that need DB data (project QA members, manager). The TypeScript `emit()` calls `rpc('emit_event', …)`; the rule map for *who* is notified lives in SQL (`notification_recipients(event)`) with the anti-spam logic, and is covered by SQL tests. The TS side keeps the event type vocabulary and metadata shaping.

## Triggers that complement RLS

| Trigger | Table | Rule |
|---|---|---|
| `enforce_task_status_rules` | tasks | into `done`: from `testing` (or `review` when `qa_required=false`); role gate when `qa_required`; from `done` only manager/qa/admin; parent/subtask rule; maintain `completed_at`, clear `overdue_notified_at` |
| `enforce_bug_status_rules` | bugs | allowed pairs; `fixed` → rewrite to `retest`, set `fixed_at`; `retest → closed/open` only qa/manager/admin; `closed` sets `closed_at`; reopen increments `reopen_count` |
| `enforce_document_status_rules` | documents | allowed pairs; `approve` only manager/admin (qa for `testing_report`); snapshot version; approved docs immutable except status |
| `enforce_project_status_transition` | projects | allowed pairs; `key` immutable after `planning`; soft delete admin-only |
| `enforce_comment_edit` | comments | non-author can only set `deleted_at` |
| `enforce_notification_update` | notifications | only `read_at` may change |
| `enforce_goal_achieve` | goals | `achieved` only manager/admin |
| `protect_last_owner` | organization_members | keep ≥ 1 owner |
| `member_must_be_in_org` | project_members | user is org member |
| `same_project_refs` | tasks, mvp_items, test_cases, bugs, task_dependencies | referenced rows share `project_id` |
| `prevent_task_dependency_cycle` | task_dependencies | recursive CTE |
| `reject_writes_on_archived_project` | all project child tables | via `writable()` in `with check`; trigger used where `with check` is not available (delete) |

Trigger errors use `raise exception using errcode = 'P0001', message = 'MALHOT:<code>:<detail>'`. Codes: `forbidden`, `invalid_transition`, `invariant`. The app maps them to `ActionResult` errors.

## Storage policies

```sql
-- attachments bucket
create policy "attachments_read" on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and is_project_member((storage.foldername(name))[1]::uuid));
create policy "attachments_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and can_contribute((storage.foldername(name))[1]::uuid)
              and exists (select 1 from attachments a where a.storage_path = name and a.uploaded_by = auth.uid()));
create policy "attachments_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and (owner = auth.uid() or can_manage_project((storage.foldername(name))[1]::uuid)));
-- avatars bucket: public read; write/delete own folder
```

## Realtime
Publication contains `tasks` and `notifications`; RLS select policies apply to change events.

## Testing
`tests/integration/rls/*.test.ts` — for each table, for each role fixture, assert S/I/U/D outcomes per this matrix. The matrix rows are the test cases; a change here without a test change fails review.

## Known trade-offs
- Polymorphic `entity_id` cannot be FK-enforced; mitigated by `project_id` on the row and app validation.
- `security definer` helpers are a privilege boundary; they are tiny, read-only, and have no dynamic SQL.
- Admin "see deleted rows" doubles some select policies; kept explicit rather than clever.
