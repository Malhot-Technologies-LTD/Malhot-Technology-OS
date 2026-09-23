# Feature: Team and Settings

## Team page `/os/team`

### Purpose
Coordination: who is here, what they do, what they are on, and whether load is balanced. Not surveillance: no hours, no activity heatmaps, no rankings, no idle indicators.

### Content
Cards or table (toggle): avatar, name, title (discipline), org role, active projects (chips with project role), open tasks (by status: to do / in progress / review / testing), overdue count (link), due this week, bugs assigned. Filters: project, org role, discipline. Sort: name, open tasks, overdue.

Click → member profile view: the same numbers plus their open tasks list (visible to those who share projects; RLS scopes automatically) and recent activity by them in shared projects.

Admin actions (from the row menu): change org role, remove from organisation (confirmation; explains they lose access immediately and their authored items are kept), resend invitation (for pending). Pending invitations appear in a separate section for admins with revoke.

### Workload signal
A simple, honest indicator per person: open task count vs the team median, shown as text ("Above typical load") with the numbers. No score.

### States
- Only you: "Invite your team to start assigning work." (admin) / "No other members yet." (member).
- Pending invitations list empty: hidden.

## Settings `/os/settings/*`

Only settings people need. Left navigation → form pages.

| Page | Who | Contents |
|---|---|---|
| **Profile** | everyone | name, avatar (upload to `avatars`), title, timezone, email (read-only; change via Supabase auth flow later) |
| **Appearance** | everyone | theme (system/light/dark), density (comfortable/compact — affects table row height and board card detail), reduced motion (follows OS by default; explicit override) |
| **Notifications** | everyone | per-type in-app toggles; (email digest placeholder disabled with "coming later") |
| **Security** | everyone | change password, sign out of all devices, active sessions (list from Supabase if available; otherwise just the global sign-out) |
| **Organisation** | admin | name, slug, logo, timezone (org default for overdue computation), default `qa_required` for new projects |
| **Members** | admin | members table (role change/remove), invite form (email, org role, optional project grants), pending invitations (revoke/resend, copy link) |
| **Permissions** | admin | read-only rendering of the permission matrix from `lib/permissions.ts` (documentation in-product; no custom roles in v1) |
| **Integrations** | admin | GitHub App installation status, repos granted, reinstall/uninstall link; future: email provider |
| **Enquiries** | admin | website enquiries table: name, email, company, message preview, received, handled; actions: mark handled, "Create project from enquiry" |
| **Danger zone** | owner | transfer ownership; (delete organisation intentionally not exposed in UI — operational script only) |

## Permissions
`product/user-roles.md#organisation`. Members cannot see admin pages (navigation hidden and route returns access-denied).

## Events
`member.invited`, `member.joined`, `member.role_changed`, `member.removed`, `invitation.revoked`, `organization.updated`, `github.installation_*`, `inquiry.handled`, `profile.updated` (activity only for name/title changes; not for appearance).

## Out of scope (v1)
Custom roles, groups/departments, per-user API tokens, audit log export UI (activity page covers reading; export is a script), billing.

## Built so far: project membership

`/os/team` is still a placeholder, but the part that gates access now exists on the project overview.

Approval into the organisation gets someone an account, not the work. `projects_select` shows a plain member only the projects they belong to, so an approved person signs in to an empty OS until they appear on a project. **Assignment is the moment access begins** — that is why the control lives on the project rather than in Settings, next to the thing it grants.

The Team card (`features/projects/components/project-team.client.tsx`) lists who is on the project, what role each holds, and — for a manager or an org admin — lets them add, re-role and remove people. The picker offers only organisation members who are not already on the project, because the `member_must_be_in_org` trigger and the `(project_id, user_id)` unique constraint would refuse anyone else, and an option that always fails is worse than no option.

Roles come from `features/projects/roles.ts`, which is the vocabulary; `lib/permissions.ts` is the enforcement. `roles.test.ts` is the seam between them: it asserts that what a summary claims a role can do is what `can()` actually allows, so the words on screen cannot drift from the matrix.

Removing the last manager is refused. A project whose only manager has been removed cannot be administered by anyone in the product, and the person doing it may well be removing themselves — recovering from that needs a database edit, so it is stopped at the action.

Still to come with the phases that own them: the organisation-wide team page, workload columns, discipline filters, and per-project chips on a member's profile.
