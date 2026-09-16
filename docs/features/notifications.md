# Feature: Activity and Notifications

## Purpose
Activity is the record of what changed (for everyone). Notifications are pointers to what needs *you*. Keeping them separate is how spam is avoided: most events go to activity only.

Pipeline: `architecture/backend-architecture.md#activity-and-notification-pipeline` (`emit()` → `emit_event()` SQL).

## Data
`activities` (append-only), `notifications`.

## Event vocabulary (`lib/events/types.ts`)

Dotted `entity.verb` strings. The full list is the union of the "Events" sections in each feature doc. Every event has a typed metadata schema (Zod) and a renderer that turns it into a sentence with links:

```text
Levi assigned MAL-42 "Board drag and drop" to Kenny
Alpha changed MAL project status from Planning to Active
Brian failed "Login with expired link" in run "Sprint 3 regression" and reported MAL-B7
kenny opened PR #18 "MAL-42 board dnd" in malhot/os
MAL-31 became overdue (due 12 Mar)
Alpha approved "MVP Specification" v2
```

Renderers are pure functions tested with fixture events; they degrade gracefully when the referenced entity no longer exists ("a deleted task").

## Notification rules (`notification_recipients` SQL + mirrored table below)

| Event | Type | Recipients |
|---|---|---|
| task.assigned | task_assigned | new assignee |
| task.reviewer_set / task → review | review_requested | reviewer |
| task → testing | testing_requested | project QA members (if none: manager) |
| task.status_changed backwards from review/testing with comment | mentioned (title "Changes requested") | assignee |
| comment.created with mentions | mentioned | mentioned users (project members only) |
| task.overdue (cron) | task_overdue | assignee (manager if unassigned) |
| bug.assigned | bug_assigned | assignee |
| bug → retest | testing_requested | reporter + project QA members |
| bug.reopened | bug_assigned (title "Bug reopened") | assignee |
| project.status_changed | project_updated | project members (completed/on_hold/archived); org admins (created/activated) |
| project.member_added | project_updated | the added member |
| milestone.overdue (cron) | project_updated | manager |
| deployment.recorded (production success) | project_updated | manager |
| goal.status_changed (achieved/dropped) | project_updated | goal owner |
| document → in_review | document_review_requested | manager + org admins (+ QA for testing_report) |
| document.approved | document_approved | author + project members |
| document → draft (returned) | document_review_requested (title "Returned with comments") | author |
| inquiry.received | inquiry_received | org admins |
| member.joined | project_updated | inviter |

Everything else (task created/updated, PR/issue events, planning edits, test results, comments without mentions) is activity only.

Anti-spam (in `emit_event`): no self-notifications; dedupe identical unread (user, type, entity) within 10 minutes; bulk-assignment collapse (> 3 assignments by one actor to one user within 2 minutes → one "Alpha assigned you 6 tasks in MAL" notification); document edit activity coalesced per author per 10 minutes.

## Delivery
In-app only (v1): bell badge (unread count; realtime insert subscription), popover with the last 10 (grouped by day; mark read on click; "Mark all read"), full page `/os/notifications` with filters (type, project, unread). Email digests: roadmap (per-user daily digest with per-type opt-outs stored in `profiles.preferences`).

Notification `href` is resolved at emit time (deep link to task panel, bug, document, project); on click, mark read then navigate.

## Activity surfaces
- `/os/activity` — organisation-wide (scoped to viewer's projects), filters: project, actor, entity type, date.
- `/os/projects/[key]/activity` — project feed.
- Entity-level: task panel, bug detail, document sidebar (filtered by `entity_type, entity_id`).
- Dashboard "Recent activity" (10 items).
Infinite scroll in pages of 50 (server action `listActivity({ cursor })`).

## Preferences (v1 minimal)
Profile → Notifications: toggle per type for in-app (all on by default except `project_updated` for org admins on "created", which is on but collapsible). Enforced in `notification_recipients` by reading `profiles.preferences`.

## States
- No notifications: "You are all caught up." (plain, no confetti).
- No activity (new project): "Activity will appear here as the team works."
- Realtime disconnected: badge still correct on next navigation; indicator only in the popover footer.

## Retention
Notifications read > 90 days deleted by cron; unread kept until read or 1 year. Activities kept indefinitely.

## Out of scope (v1)
Email/Slack delivery, watchers/subscriptions, snooze, per-project mute (add if a real need appears), push notifications.
