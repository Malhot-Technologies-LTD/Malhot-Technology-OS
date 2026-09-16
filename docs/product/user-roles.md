# User Roles and Permissions

## Design goals

1. Support the current five-person team without hardcoding people.
2. Support future roles and contractors with restricted access.
3. Keep the permission model small enough to be enforced identically in TypeScript (UI, Server Actions) and SQL (RLS, triggers).
4. Separate **discipline** (what someone does: frontend, backend, marketing) from **permission** (what someone may change).

## Two-layer model

```text
Organisation role  — who you are in Malhot
      ↓
Project role       — what you may do inside a given project
```

### Organisation roles (`org_role`)

| Role | Meaning |
|---|---|
| `owner` | Founder/director. Everything `admin` can do, plus: transfer ownership, delete the organisation, manage billing (future). At least one owner always exists. |
| `admin` | Runs the company operationally. Full access to every project, members, invitations, integrations, organisation settings. |
| `member` | Regular team member. Sees only projects they belong to, plus organisation-wide read views scoped to those projects (team page, reports for their projects). |

There is intentionally no organisation-level `viewer`: a read-only person is given `viewer` on specific projects.

### Project roles (`project_role`)

| Role | Meaning | Permission group |
|---|---|---|
| `manager` | Project manager. Owns scope, team, timeline, status, approvals. | Manager |
| `developer` | Builds. | Contributor |
| `designer` | Designs. | Contributor |
| `marketer` | Marketing / content / launch work. | Contributor |
| `qa` | Tests and signs off. | QA (Contributor + testing authority) |
| `viewer` | Read-only (stakeholder, contractor observing). | Viewer |

`developer`, `designer` and `marketer` have identical permissions. The distinction exists for workload views, filters, defaults and future features, not for access control. This keeps the matrix small and honest.

Organisation `owner`/`admin` implicitly have `manager` capability on every project without needing a `project_members` row (they may still be added as members to appear on the team list and receive assignments).

## Initial team mapping (data, not code)

| Person | Org role | Default project role | Discipline (profile title) |
|---|---|---|---|
| Alpha | `admin` | `manager` | Project Manager |
| Levi | `member` | `developer` | Frontend Developer |
| Kenny | `member` | `developer` | Backend Developer |
| Brian | `member` | `qa` | QA / Testing |
| Malvyn | `member` | `marketer` | Marketer |

The organisation `owner` is whoever bootstraps the organisation (see `architecture/authentication-architecture.md`). Names appear only in seed data marked as development data.

## Permission matrix

Columns are effective permission groups. "Org Admin" = `owner` or `admin`.

Legend: ✓ allowed · ✓* allowed with restriction noted · — not allowed

### Organisation

| Capability | Org Admin | Manager | Contributor | QA | Viewer |
|---|---|---|---|---|---|
| View organisation settings | ✓ | — | — | — | — |
| Edit organisation (name, logo) | ✓ | — | — | — | — |
| Invite / remove members, change org roles | ✓ | — | — | — | — |
| Transfer ownership / delete org | owner only | — | — | — | — |
| Manage GitHub installation | ✓ | — | — | — | — |
| View team page | ✓ | ✓* own projects | ✓* own projects | ✓* own projects | — |
| View organisation activity | ✓ | ✓* own projects | ✓* own projects | ✓* own projects | — |
| View website enquiries | ✓ | — | — | — | — |

### Projects

| Capability | Org Admin | Manager | Contributor | QA | Viewer |
|---|---|---|---|---|---|
| Create project | ✓ | ✓ — any org `member` may create; the creator becomes `manager` | same | same | same |
| View project | ✓ all | ✓ | ✓ | ✓ | ✓ |
| Edit project details, dates, priority | ✓ | ✓ | — | — | — |
| Change project status | ✓ | ✓ | — | — | — |
| Override health | ✓ | ✓ | — | — | — |
| Add / remove project members, set project roles | ✓ | ✓ | — | — | — |
| Archive project | ✓ | ✓ | — | — | — |
| Delete project (soft) | ✓ | — | — | — | — |
| Connect / disconnect repository | ✓ | ✓ | — | — | — |
| Edit project settings (`qa_required`, key) | ✓ | ✓ | — | — | — |

### Goals, MVP, milestones

| Capability | Org Admin | Manager | Contributor | QA | Viewer |
|---|---|---|---|---|---|
| View | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create / edit / reorder goals and MVP items | ✓ | ✓ | ✓ | ✓ | — |
| Delete goals and MVP items | ✓ | ✓ | — | — | — |
| Change goal status to `achieved` | ✓ | ✓ | — | — | — |
| Create / edit / complete milestones | ✓ | ✓ | — | — | — |

### Tasks

| Capability | Org Admin | Manager | Contributor | QA | Viewer |
|---|---|---|---|---|---|
| View tasks | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create task, subtask | ✓ | ✓ | ✓ | ✓ | — |
| Edit any task fields | ✓ | ✓ | ✓ | ✓ | — |
| Assign / reassign | ✓ | ✓ | ✓ | ✓ | — |
| Move status (except into `done`) | ✓ | ✓ | ✓ | ✓ | — |
| Move `testing → done` when `qa_required = true` | ✓ | ✓ | — | ✓ | — |
| Move `testing → done` when `qa_required = false` | ✓ | ✓ | ✓ | ✓ | — |
| Add / remove dependencies | ✓ | ✓ | ✓ | ✓ | — |
| Comment | ✓ | ✓ | ✓ | ✓ | — |
| Edit / delete own comment | ✓ | ✓ | ✓ | ✓ | — |
| Delete comments by other people | ✓ | ✓ | — | — | — |
| Upload attachment | ✓ | ✓ | ✓ | ✓ | — |
| Delete attachment | ✓ | ✓ | own | own | — |
| Link / unlink GitHub issue or PR | ✓ | ✓ | ✓ | ✓ | — |
| Delete task (soft) | ✓ | ✓ | own, if no subtasks or dependents | — | — |

### Testing

| Capability | Org Admin | Manager | Contributor | QA | Viewer |
|---|---|---|---|---|---|
| View test cases, runs, results, bugs | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create / edit test cases | ✓ | ✓ | ✓ | ✓ | — |
| Delete test cases | ✓ | ✓ | — | ✓ | — |
| Create test run, record results | ✓ | ✓ | — | ✓ | — |
| Report bug | ✓ | ✓ | ✓ | ✓ | — |
| Edit bug details, severity | ✓ | ✓ | reporter or assignee | ✓ | — |
| Bug `open → in_progress → fixed` | ✓ | ✓ | assignee | ✓ | — |
| Bug `fixed → retest` | automatic when marked fixed | | | | |
| Bug `retest → closed` or `retest → open` (reopen) | ✓ | ✓ | — | ✓ | — |
| Delete bug (soft) | ✓ | ✓ | — | — | — |

### Documents

| Capability | Org Admin | Manager | Contributor | QA | Viewer |
|---|---|---|---|---|---|
| View project documents | ✓ | ✓ | ✓ | ✓ | ✓* approved only |
| Create document (blank or from template) | ✓ | ✓ | ✓ | ✓ | — |
| Edit document in `draft` | ✓ | ✓ | ✓ | ✓ | — |
| Edit document in `in_review` | ✓ | ✓ | author only | author only | — |
| Submit for review (`draft → in_review`) | ✓ | ✓ | author | author | — |
| Approve (`in_review → approved`) | ✓ | ✓ | — | ✓* `testing_report` only | — |
| Return to draft | ✓ | ✓ | — | — | — |
| Archive document | ✓ | ✓ | — | — | — |
| Delete document (soft) | ✓ | ✓ | — | — | — |
| Create organisation-level document (no project) | ✓ | — | — | — | — |

### GitHub

| Capability | Org Admin | Manager | Contributor | QA | Viewer |
|---|---|---|---|---|---|
| View repositories, issues, PRs, deployments | ✓ | ✓ | ✓ | ✓ | ✓ |
| Connect repository to project | ✓ | ✓ | — | — | — |
| Trigger manual sync | ✓ | ✓ | ✓ | ✓ | — |
| Record deployment manually | ✓ | ✓ | ✓ | — | — |

### Reports, activity, notifications

| Capability | Org Admin | Manager | Contributor | QA | Viewer |
|---|---|---|---|---|---|
| Organisation-wide reports | ✓ | — | — | — | — |
| Reports scoped to own projects | ✓ | ✓ | ✓ | ✓ | ✓ |
| Project activity | ✓ | ✓ | ✓ | ✓ | ✓ |
| Own notifications | ✓ | ✓ | ✓ | ✓ | ✓ |

## Enforcement

The matrix above is implemented in exactly three places, and they must agree:

1. `lib/permissions.ts` — pure function `can(viewer, action, resource)`. Used by UI (to hide/disable) and Server Actions (to reject).
2. Postgres RLS policies — row visibility and write gates per table (`database/rls-policies.md`).
3. Postgres triggers — for transition rules RLS cannot express (e.g. `testing → done` with `qa_required`, bug reopen rules).

Integration tests assert that each matrix row behaves the same through the Server Action and directly against the database (`engineering/testing-strategy.md`).

## Future roles

Adding a role means: extend the enum, add a column to this matrix, update `lib/permissions.ts`, update the SQL helper `project_permission_group()`, add tests. No UI changes are required for a new project role beyond the selector.

Candidate future roles: `client` (project viewer with commenting on approved documents only), `finance` (org role, reports only).
