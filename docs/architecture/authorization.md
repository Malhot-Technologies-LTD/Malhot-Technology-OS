# Authorization Architecture

The permission matrix is defined in `product/user-roles.md`. This document defines how it is enforced.

## Principle: three layers that must agree

```text
UI (hide/disable)  →  Server Action (reject)  →  Postgres RLS + triggers (deny)
   convenience           authoritative              backstop / invariant
```

- The UI uses `can()` only to avoid offering actions that will fail. Hiding is not security.
- Server Actions call the same `can()`; a `false` returns `fail('forbidden')` before any query.
- RLS guarantees that even a buggy action, a direct supabase-js call from the browser, or a future API cannot read or write rows outside the viewer's rights.

## Viewer context

Resolved once per request (`lib/auth/context.ts`, wrapped in `React.cache`):

```ts
type Viewer = {
  userId: string
  organizationId: string
  orgRole: 'owner' | 'admin' | 'member'
}
type ProjectContext = {
  projectId: string; key: string; status: ProjectStatus; qaRequired: boolean
  role: ProjectRole | null        // null when not a member
  group: 'admin' | 'manager' | 'contributor' | 'qa' | 'viewer' | 'none'
}
```

`group` is derived: org `owner`/`admin` → `admin`; else by project role (`manager` → `manager`; `developer|designer|marketer` → `contributor`; `qa` → `qa`; `viewer` → `viewer`; no membership → `none`).

## Permission module

`lib/permissions.ts` — pure, dependency-free, fully unit-tested:

```ts
type Action =
  | 'project.edit' | 'project.change_status' | 'project.manage_members' | 'project.archive' | 'project.delete'
  | 'goal.create' | 'goal.edit' | 'goal.delete' | 'goal.achieve'
  | 'mvp.create' | 'mvp.edit' | 'mvp.delete'
  | 'milestone.manage'
  | 'task.create' | 'task.edit' | 'task.assign' | 'task.change_status' | 'task.complete' | 'task.delete'
  | 'comment.create' | 'comment.edit' | 'comment.delete'
  | 'attachment.create' | 'attachment.delete'
  | 'test_case.create' | 'test_case.edit' | 'test_case.delete'
  | 'test_run.create' | 'test_run.record'
  | 'bug.create' | 'bug.edit' | 'bug.transition' | 'bug.verify' | 'bug.delete'
  | 'document.create' | 'document.edit' | 'document.submit' | 'document.approve' | 'document.return' | 'document.archive' | 'document.delete' | 'document.view'
  | 'github.connect' | 'github.sync' | 'github.link' | 'deployment.record'
  | 'org.manage' | 'org.invite' | 'org.integrations' | 'org.reports' | 'org.inquiries'

function can(viewer: Viewer, action: Action, ctx: ProjectContext | null, resource?: ResourceFacts): boolean
```

`ResourceFacts` carries the few per-row facts some rules need: `ownerId` (comment author, attachment uploader, task creator, document author), `documentStatus`, `documentType`, `taskHasChildrenOrDependents`, `bugReporterId`, `bugAssigneeId`, `fromStatus`/`toStatus`.

The matrix in `product/user-roles.md` is the specification; `permissions.test.ts` enumerates every row of it as a test table. If the matrix changes, tests fail until both are updated.

## Database layer

### Helper functions (security definer, `stable`, `search_path = public`)

| Function | Returns |
|---|---|
| `auth_uid()` | `auth.uid()` (wrapper for testability) |
| `is_org_member(org uuid)` | bool |
| `is_org_admin(org uuid)` | bool — owner or admin |
| `project_org(project uuid)` | uuid |
| `is_project_member(project uuid)` | bool — member row exists, or org admin |
| `project_role_of(project uuid)` | `project_role` or null |
| `project_group_of(project uuid)` | text: admin / manager / contributor / qa / viewer / none |
| `can_manage_project(project uuid)` | bool — admin or manager group |
| `can_contribute(project uuid)` | bool — admin / manager / contributor / qa |
| `project_is_writable(project uuid)` | bool — status not `archived` (org admins bypass) |

`security definer` is required so policies on `project_members` can be evaluated without recursing into `project_members` policies. Each function is `revoke execute from public` then `grant execute to authenticated`.

### Policy pattern

Every business table gets four policies (or fewer where writes are not allowed):

```sql
-- select: member of project (or org)
create policy "tasks_select" on tasks for select to authenticated
  using (deleted_at is null and is_project_member(project_id));
-- insert: contributor+ and project writable
create policy "tasks_insert" on tasks for insert to authenticated
  with check (can_contribute(project_id) and project_is_writable(project_id));
-- update: contributor+ and project writable
create policy "tasks_update" on tasks for update to authenticated
  using (is_project_member(project_id)) with check (can_contribute(project_id) and project_is_writable(project_id));
-- delete: rarely granted; soft delete is an update
```

Fine-grained rules (own comment only, `testing → done` gating) that depend on row transitions are enforced by `BEFORE UPDATE` triggers that raise `exception` with a stable error code (`P0001` + message prefix `MALHOT:forbidden:...`) which the app maps to `fail('forbidden')`.

Per-table policies: `database/rls-policies.md`.

### Service role
Bypasses RLS. Used only in the elevated functions listed in `architecture/backend-architecture.md`. Each of those functions performs its own explicit authorisation (e.g. webhook signature, cron secret, invitation token) — "bypasses RLS" never means "unchecked".

## Storage authorisation

Bucket `attachments`: policies on `storage.objects` allow `select` when `is_project_member(split_part(name, '/', 1)::uuid)` and `insert` when `can_contribute(...)`. Uploads always go through a Server Action that creates the `attachments` row first and returns a signed upload URL for the exact path, so the path convention is enforced server-side. Bucket `avatars`: public read, write only to `avatars/{auth.uid()}/*`.

## Realtime authorisation

Postgres Changes honour RLS `select` policies; a user subscribed to `tasks` for a project they leave stops receiving events at the next change.

## Archived projects

`project_is_writable()` returns false for `archived` projects unless the viewer is an org admin. This is included in every `with check` so archived projects are read-only at the database level, not just in the UI.

## Testing the authorisation model

- Unit: `permissions.test.ts` (matrix table).
- Integration (local Supabase): for each role fixture (owner, admin, manager, developer, qa, viewer, non-member, anonymous), attempt representative selects/inserts/updates directly with supabase-js using that user's JWT; assert allowed/denied per matrix. Runs in CI on every PR that touches `supabase/` or `lib/permissions.ts`.
- E2E: one "permission restrictions" Playwright spec exercising the UI paths for viewer vs manager.

## Anti-patterns explicitly avoided

- Roles in JWT claims (stale after change; requires re-login).
- Checking permissions only in React components.
- A generic `is_admin` boolean that grows into "god mode".
- Per-row ACL tables (over-engineering for this team size).
- Using the service role from Server Actions "because RLS is annoying".
