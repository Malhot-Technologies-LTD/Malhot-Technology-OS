# Implementation Phases

Principles: build vertically (UI → validation → server → database → permissions → states → tests per feature), kill the biggest risk first (auth + RLS + the action pattern), keep the system demonstrable at the end of every phase. Each phase lists its completion criteria; a phase is not done until they all hold.

Sequence follows the brief's preferred order (Authentication → Project → Goals → MVP → Tasks → Timeline → Testing → Documents → GitHub → Reports), with the public website placed right after the foundation because it is independent and de-risks brand/design decisions early.

Estimates are ranges for one to two engineers working with AI assistance; they are for sequencing, not commitments.

## Phase 0 — Documentation and architecture (this phase)
Deliverable: `/docs` complete, readiness report, open decisions approved.

## Phase 1 — Foundation, auth, shell (1 to 2 weeks)
- Repo scaffold: Next.js, TypeScript strict, Tailwind v4, shadcn/ui, ESLint/Prettier, Vitest, Playwright, Husky; `.env.example`; `lib/env.ts`.
- Design tokens (`tokens.css`), fonts, theme switching, base components, a tokens showcase route (dev-only).
- Supabase local; migrations 1 to 2 (enums, identity tables), auth trigger, RLS helpers, first policies; type generation; pgTAP harness; RLS integration test harness with role fixtures.
- Auth: login (password, magic link), callback, forgot/reset, invite acceptance, sign-out, proxy redirects, `requireViewer()`, no-access state; bootstrap script.
- OS shell: sidebar, topbar, command palette scaffold, notifications bell (static), settings → profile/appearance; error/not-found boundaries.
- `ActionResult`, `withAction`, db error mapping; `emit_event` SQL with activity insert (notifications rules added per feature).
- CI pipeline green end to end; Vercel project + staging Supabase provisioned; Sentry.
- **Done when:** a newly invited user can sign in, land on an empty dashboard, edit their profile; RLS tests pass for identity tables; e2e journeys 1 to 2 pass; deploy to preview works.

## Phase 2 — Public website (1 to 2 weeks, can overlap Phase 3)
- Marketing layout, all pages, content files (with placeholder copy clearly marked `TODO-CONTENT` until real content arrives), case study MDX pipeline, contact form → `inquiries` + admin notification, privacy page, SEO artefacts, OG images, analytics, Lighthouse CI.
- Login page styled as part of the website.
- **Done when:** Lighthouse budgets met on mobile; axe clean; enquiry appears in OS (Settings → Enquiries) — journey 12; content owner has a list of exact copy/asset gaps.

## Phase 3 — Organisation, projects, goals, MVP (2 weeks)
- Members/invitations UI, org settings, permissions page, team page (basic).
- Migrations 3: projects, sequences, members, goals, mvp items, milestones; policies; triggers (status transition, key immutability, same-project refs); `project_progress()`, `project_health()`.
- Project list, wizard, overview (checklist, stage, health, progress), settings, status transitions, archive/delete/restore, clients.
- Goals & MVP page with ordering, linking, verification placeholder (until testing exists).
- `lib/permissions.ts` full matrix + tests.
- **Done when:** journeys 3 to 4 pass; RLS matrix tests for these tables pass; permission unit tests cover the matrix; docs updated.

## Phase 4 — Tasks, comments, attachments, activity, notifications (2 to 3 weeks)
- Migrations 4 and 7: tasks, dependencies, comments, attachments, activities, notifications; task triggers; search vectors; storage bucket + policies; realtime publication.
- Board (dnd-kit, keyboard), list view + bulk, quick create, filters/URL state, task panel with all sections, My Tasks, creation form, positioning logic, cycle detection.
- `emit_event` recipients rules for task events; notifications bell/popover/page with realtime; activity pages.
- Overdue cron job (`/api/cron/daily`) with `CRON_SECRET`.
- **Done when:** journeys 5, 6, 13 pass; QA gate enforced in trigger and action; board works with keyboard; realtime refresh verified with two sessions; a11y clean on board and panel.

## Phase 5 — Milestones and timeline (1 week)
- Timeline component (scale, bars, arrows, today, drag), project + cross-project views, milestone list, milestone overdue cron.
- **Done when:** journey 7 passes; list mode on mobile; drag has keyboard/form equivalent.

## Phase 6 — Testing (1 to 2 weeks)
- Migration 5: test cases, runs, run cases, results, bugs; bug triggers; task-done gate for high-severity bugs.
- Testing dashboard, project testing workspace (cases, runs with execution grid, bugs), bug detail, task test coverage, notifications rules for testing events; MVP verification view wired.
- **Done when:** journey 8 passes; grid keyboard flow works; RLS tests pass for testing tables.

## Phase 7 — Documents (1 to 2 weeks)
- Migration 6: documents, versions; document triggers (status rules, snapshot, search).
- Tiptap editor with schema and `dataBlock`/`callout`; autosave + conflict banner; 8 templates with unit tests; documents pages; approval flow; export route + print CSS.
- **Done when:** journey 9 passes; approved document is immutable (trigger test); export renders all 8 templates.

## Phase 8 — GitHub (1 to 2 weeks)
- Migration 8: github tables, links, deployments, webhook events.
- GitHub App registration (staging + production) — requires human action; `lib/github/*`; setup callback; webhook handler with signature + idempotency + retry; sync/reconciliation; project GitHub page; task linking (auto + manual); deployments; Settings → Integrations.
- **Done when:** journey 10 passes with fixtures; a real PR against a staging repo links to a task in staging; nightly reconciliation runs.

## Phase 9 — Reports, dashboard completion, team workload (1 week)
- Report SQL functions, reports pages with charts and CSV export; dashboard wired to real functions; team workload numbers; upcoming widget.
- **Done when:** dashboard and reports use the same functions; report functions each < 300 ms on seed data ×10.

## Phase 10 — Final quality pass (1 week)
- Full audit against the brief's Phase 6 checklist: product, UX, design, architecture, security (attempt cross-tenant/role escalation manually and via tests), database (indexes vs `pg_stat_statements`), performance (bundle sizes, waterfalls), mobile (website), accessibility (axe + manual keyboard/screen-reader pass), documentation accuracy.
- Restore rehearsal; runbooks; production bootstrap; go-live checklist.
- **Done when:** every item in `mvp-scope.md` is verified in production or staging and the docs describe what was built.

## Parallelisation
Phase 2 (website) runs alongside Phase 3 with a second engineer (or with the marketer supplying content while engineering proceeds). Phases 5 to 8 are independent of each other after Phase 4 and can be reordered by business urgency (e.g. GitHub before Testing if developers want linking sooner). Dependency graph: 1 → {2, 3} → 4 → {5, 6, 7, 8} → 9 → 10.

## Dogfooding
From the end of Phase 3, the Malhot OS build itself is tracked as a project in the staging OS (`MOS`). From Phase 8, its GitHub repo is connected. This is the fastest way to find workflow gaps.
