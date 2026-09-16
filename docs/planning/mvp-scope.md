# MVP Scope

## Definition of the MVP

**The Malhot team can run one real client project end-to-end in Malhot OS, and the public website is live with real content.** End-to-end means: sign in → create project → define goals and MVP → plan milestones and tasks → work the board with GitHub links → test and track bugs → produce approved documents → complete and archive → see it in reports.

Everything below is either **in** (ships before the MVP is declared done) or **out** (explicitly deferred). Anything not listed is out.

## In

### Platform
- Next.js app on Vercel; Supabase (Auth, Postgres, Storage, Realtime); CI with lint/type/unit/RLS/e2e gates; Sentry; health endpoint; daily cron.
- Design system tokens, light/dark OS themes, shadcn/ui component set, responsive per strategy.

### Public website
- Pages: home, about, services, work (index + ≥ 2 case studies with real or clearly "confidential client" content), process, contact, privacy, login.
- Contact form → enquiries in OS with admin notification; rate limiting.
- SEO: metadata, OG images, sitemap, robots; performance budget met (Lighthouse ≥ 90 performance/accessibility/best practices/SEO on mobile).
- Vercel Web Analytics.

### Authentication and organisation
- Email/password + magic link; invite-only; password reset; global sign-out; 30-day timebox.
- Bootstrap script for the first owner/org.
- Members, invitations (with project grants), org roles; organisation settings; profile and appearance settings; notification preferences (in-app toggles).

### Projects
- List with filters/sort/search; guided creation wizard; overview with readiness checklist, derived stage, computed health with override, progress; status transitions with enforcement; project settings; archive; soft delete + restore (admin); clients.

### Goals and MVP
- Goals with success criteria and owner; MVP items with priority and goal link; ordering; task linking; verification indicator; traceability popover.

### Tasks
- Board (dnd + keyboard), list view with bulk actions, quick create, filters/URL state, realtime refresh.
- Task panel/page: inline editing, subtasks (1 level), dependencies with cycle detection, comments with mentions, attachments, GitHub links, activity, test coverage.
- My Tasks with sections and filters; bugs assigned to me.
- Status machine with QA gate, parent/subtask rule, backward-move comment.
- Overdue notifications (cron).

### Timeline
- Project timeline (Gantt-lite: bars, milestones, dependencies, today line, drag to reschedule), cross-project timeline, milestone list; milestone management and overdue notification.

### Testing
- Test cases, runs with execution grid, results, bugs with lifecycle and gates; testing dashboard; task ↔ test coverage; bug ↔ result/task links.

### Documents
- Tiptap editor with data blocks; 8 templates; lifecycle with approval and versions (frozen snapshots); documents pages; HTML export/print to PDF; search.

### GitHub
- GitHub App install; connect one repo per project; cached issues/PRs; auto + manual task linking; push summaries; deployments (manual + `deployment_status`); nightly reconciliation; webhooks with idempotency and retry.

### Activity and notifications
- `emit_event` pipeline with rules and anti-spam; activity pages/feeds; in-app notifications (bell, popover, page, realtime badge).

### Reports and team
- The 7 reports with CSV export; dashboard; team page; permissions page.

### Quality
- All states (loading/empty/error/denied/not-found/unsaved/offline messaging) per feature docs.
- Accessibility: axe-clean key pages; keyboard paths for board and grid.
- Tests: the 13 critical e2e journeys; RLS matrix integration tests; pgTAP for triggers; unit coverage on permissions/state machines/templates.
- Documentation in `/docs` matches the implementation (audited in the final quality pass).

## Out (deferred, with the trigger that would bring it in)

| Item | Trigger |
|---|---|
| Email notifications / digests | Team misses in-app notifications for > 1 day regularly |
| Slack/Discord delivery | Team request |
| GitHub sign-in, Google SSO | Team request / Workspace adoption |
| Vercel deployment ingestion | Manual recording becomes tedious |
| Server-side PDF export | A client needs pixel-consistent PDFs |
| Collaborative editing | Two people actually need to edit one document at once |
| Text-anchored document comments | Review cycles suffer without them |
| Client portal / shared document links | A client asks for self-service access |
| Time tracking / billing | Business model needs it |
| Sprints, story points, labels, custom fields | The team adopts the practice |
| Multiple repos per project; create issues from tasks | Real project needs it |
| AI drafting in documents | Templates prove out first |
| Materialised report snapshots | A report exceeds 300 ms |
| Multi-organisation UI | Malhot operates more than one legal entity/brand |
| CMS for case studies | Non-engineers need to publish frequently |
| Mobile drag-and-drop, PWA, offline | Team request |

## Non-negotiables that are not "features"
- No service role in Server Actions.
- RLS on every table before data exists.
- No fake production data; seeds labelled.
- No feature is done without its states, permissions, tests and docs (`README` Definition of Done).
