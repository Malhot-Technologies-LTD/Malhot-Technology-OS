# Operational Workflows

Cross-feature workflows as the team will actually experience them. Each names the actors, the screens, the data written, and the automatic side effects. Feature-level detail lives in `features/*`.

## W1 — Onboard a team member

1. Org admin → Settings → Members → Invite: email + org role (+ optional projects and project roles).
2. System creates `invitations` row (token hashed), sends email with link `/invite/[token]` (Supabase Auth invite email in v1; branded template).
3. Invitee opens link → sets password (or magic link) → `profiles` row created by trigger → `organization_members` row created → `project_members` rows created from the invitation payload → invitation `accepted`.
4. Redirect to `/os` with a first-run hint (complete profile: name, title, avatar, timezone).

Side effects: activity `member.joined`; notification to inviter (`project_updated`: member joined).
Failure paths: expired token (offer re-send by admin), already a member (sign in instead), revoked invitation.

## W2 — Start a project

1. Any member → Projects → New project → wizard (basics → team → timeline → goals → MVP → success criteria → repository → review) → Create.
2. Project created in `planning` with `key`, members, goals, MVP items, optional repository connection.
3. Overview shows the **readiness checklist** (goals, MVP, manager, start date, ≥1 milestone recommended).
4. Manager → Activate. Trigger validates transition; Server Action validates readiness.

Side effects: activities per entity created; notifications to members; Project Brief and MVP Specification templates become generatable.

## W3 — Plan the work

1. Manager → Timeline → add milestones (title, due date).
2. Manager/team → Tasks → create tasks (title, priority, assignee, due date, estimate, milestone, MVP item/goal). Bulk-create from an MVP item ("Create task from item") pre-links it.
3. Add dependencies from task detail. Cycle detection blocks A→B→A with a clear message.
4. Timeline shows task bars, milestones, dependencies, today line.

## W4 — Daily work (developer)

1. `/os` shows My Work: overdue, due today, in review awaiting me, testing feedback on my tasks.
2. Open task → detail panel → move to `in_progress` (optimistic) → comment, attach, link PR.
3. Push branch `feature/MAL-42-...`, open PR titled `MAL-42: ...` → webhook links PR to task, activity recorded, task card shows PR badge and state.
4. Move to `review`, pick reviewer → reviewer notified.

## W5 — Review

1. Reviewer opens task from notification; reviews PR in GitHub (link out).
2. Approve: move `review → testing` → QA notified. Request changes: move back to `in_progress` with a required comment → assignee notified (`mentioned`-class notification "changes requested").

## W6 — Test and fix

1. QA → Project → Testing → Test Cases: write cases (optionally linked to task). Or Runs → New run → select cases (filter by task, milestone).
2. Execute run: for each case record pass / fail / blocked, actual result. Fail → "Report bug" pre-filled from case, linked to result and task; assignee defaults to task assignee.
3. Developer fixes → bug `fixed` → auto `retest` → QA notified → retest → `closed` (or reopen).
4. When all results for the task pass and no open bugs remain, QA moves task `testing → done`.

Side effects: Testing Report template can be generated from a run (cases, results, bugs, pass rate).

## W7 — Deploy and deliver

1. Deployment recorded (manual form or GitHub `deployment_status` webhook) → activity + manager notification for production.
2. Manager generates Deployment Report and Final Project Report from templates (pre-filled with goals, MVP completion, milestones, test summary, deployments) → edits → submit for review → org admin approves → version snapshot.
3. Manager → Complete project → `completed`. Later → Archive.

## W8 — Handle a website enquiry

1. Visitor submits `/contact` → Server Action validates (Zod, honeypot, rate limit by IP hash) → `inquiries` row via admin client.
2. In-app notification to all org admins (`inquiry_received`). Email notification is roadmap.
3. Admin views enquiries under Settings → Enquiries; marks handled. Conversion into a project is manual (button pre-fills the wizard with client name and description) — no CRM.

## W9 — Overdue handling (automated, daily)

Vercel Cron → `/api/cron/daily` (bearer `CRON_SECRET`):

1. For each open task with `due_date < today` and `overdue_notified_at IS NULL`: notify assignee (`task_overdue`), set `overdue_notified_at`. One notification per task, ever; if due date changes to the future, the field is cleared by trigger so a later slip re-notifies.
2. For each milestone overdue and incomplete: notify manager once (`project_updated`: milestone overdue) using `overdue_notified_at` on milestones.
3. Clear `health_override` older than 14 days.
4. Expire `invitations` past `expires_at`.

## W10 — Connect GitHub

1. Org admin → Settings → Integrations → Install GitHub App → GitHub installation flow → callback `/api/github/setup` receives `installation_id` + `state` → stored in `github_installations`.
2. Manager → Project → GitHub → Connect repository → list repos from the installation → pick one → `github_repositories` row → initial sync (open issues, open PRs, default branch).
3. Webhooks (`issues`, `pull_request`, `push`, `deployment_status`, `installation`) keep the cache current; every delivery recorded in `webhook_events` (idempotent on `delivery_id`).
4. Task linking: automatic from `KEY-n` in PR title/branch/body or issue title; manual from task detail.

## W11 — Permission denied path

A member opens a project URL they are not a member of:
- RLS returns no row → page renders "You do not have access to this project" with the project key (not name — the name is not disclosed), who to ask (managers are not disclosed either; message says "Ask an organisation admin"), and a link back.
- No 500s, no leaking of existence beyond the key present in the URL.

## W12 — Unsaved changes

Document editor autosaves drafts every 3 s of inactivity (debounced) and on blur; the header shows "Saved · 12:03" / "Saving…" / "Unsaved changes — retry". Navigation with unsaved changes prompts. Long forms (project wizard) persist step state in `sessionStorage` so a refresh does not lose work.
