# System Architecture

## Overview

```text
                    ┌──────────────────────────────────────────────┐
                    │                  Browser                     │
                    │  Marketing pages · Login · Malhot OS (React) │
                    └───────────────┬──────────────────────────────┘
                                    │ HTTPS (Vercel edge)
                    ┌───────────────▼──────────────────────────────┐
                    │        Next.js application (Vercel)          │
                    │                                              │
                    │  proxy.ts        session refresh, redirects  │
                    │  (marketing)     static / ISR pages          │
                    │  (auth)          login, callback, invite     │
                    │  (os)            RSC pages + Server Actions  │
                    │  /api/webhooks   GitHub (HMAC verified)      │
                    │  /api/cron       daily jobs (bearer secret)  │
                    │  /api/github     App install callback        │
                    │  /api/export     document export (HTML/PDF)  │
                    └───────┬──────────────────────┬───────────────┘
                            │ supabase-js (user JWT, RLS)           │ service role (server only)
                    ┌───────▼──────────────────────▼───────────────┐
                    │                  Supabase                    │
                    │  Auth (GoTrue)   PostgreSQL (RLS, triggers)  │
                    │  Storage (RLS)   Realtime (2 channels)       │
                    └───────────────┬──────────────────────────────┘
                                    │ Octokit (installation tokens)  ▲ webhooks
                    ┌───────────────▼────────────────────────────────┐
                    │                GitHub (GitHub App)             │
                    └────────────────────────────────────────────────┘
```

Single Next.js application, single Supabase project per environment, one GitHub App. No separate API server, no queue, no worker fleet. This is deliberate: a five-person company should operate one deployable unit.

## Layer responsibilities

### Browser (client)
- Render RSC payloads; hydrate interactive islands only (board drag-and-drop, editors, dialogs, command palette, forms).
- Hold ephemeral UI state (open panels, drafts, filters in URL search params).
- Subscribe to exactly two Realtime channels when relevant: the current project board (`tasks` changes filtered by `project_id`) and the viewer's notifications (`notifications` filtered by `user_id`).
- Never hold secrets. Never be the sole enforcer of permissions.

### Next.js application (server)
- **Routing and rendering.** Marketing pages are static or ISR. OS pages are dynamic RSC that fetch with the user-scoped Supabase client (RLS applies).
- **Session management.** `proxy.ts` (Next.js request middleware) refreshes the Supabase session cookie and redirects unauthenticated `/os/*` requests to `/login`.
- **Mutations.** Server Actions: parse with Zod → authorise with `lib/permissions.ts` → write via user-scoped client → record activity + notifications → revalidate.
- **Privileged operations** (service role): invitation acceptance, webhook ingestion, cron jobs, enquiry insertion. Isolated in `lib/supabase/admin.ts`; importable only from `server-only` modules.
- **Integrations.** GitHub App auth (JWT → installation token), webhook verification, Octokit calls.
- **Document generation.** Template functions turn project data into editor JSON; export renders print-optimised HTML.

### Supabase
- **Auth.** Email/password, magic link, invite emails, session JWTs. Custom claims are *not* used for roles (roles change; JWTs are cached) — roles are looked up from tables in RLS helper functions.
- **PostgreSQL.** System of record. RLS on every table. Triggers for `updated_at`, per-project sequence numbers, transition rules, profile creation. SQL functions for health and report aggregates.
- **Storage.** Buckets `avatars` (public read), `attachments` (private, path-scoped RLS), `org-assets` (private).
- **Realtime.** Postgres Changes on `tasks` and `notifications` only. Publication limited to those tables.

### GitHub
- GitHub App installed on the Malhot organisation. The app authenticates as itself (private key → JWT → short-lived installation token). No user tokens stored.
- Webhooks push events to `/api/webhooks/github`; signature verified with `GITHUB_APP_WEBHOOK_SECRET`.

## Cross-cutting concerns

### Authentication
`architecture/authentication-architecture.md`. Summary: Supabase Auth with `@supabase/ssr` cookies; invite-only; route protection in proxy + layout + RLS.

### Authorization
`architecture/authorization.md`. Summary: org role × project role; `lib/permissions.ts` mirrors SQL helpers; RLS on all tables; triggers for transitions.

### Storage
Files are uploaded from the browser directly to Storage using signed upload URLs issued by a Server Action (which first checks permission and creates the `attachments` row). Downloads use short-lived signed URLs. Path convention: `attachments/{project_id}/{attachment_id}/{sanitised_file_name}`.

### Background processes
No queue in v1. Two mechanisms:
- **Vercel Cron** → `/api/cron/daily` for overdue notifications, override expiry, invitation expiry.
- **Webhooks** processed synchronously inside the request (target < 2 s; GitHub allows 10 s). Each delivery is recorded first (`webhook_events`) then processed; failures are stored with the error and retried by the daily cron (up to 3 attempts). If volume ever warrants, swap the inline processor for a queue (Supabase Queues / pgmq) behind the same `processWebhookEvent()` function.

### Notifications and activity
`architecture/backend-architecture.md#activity-and-notification-pipeline`. Written in the application layer inside the same Server Action as the mutation, through one helper, so rules live in code and are testable. In-app only for v1; email digests later via Resend.

### Document generation
Templates are TypeScript functions `(projectData) → TiptapDocument`. The editor stores Tiptap JSON. Export: server renders JSON → HTML with print CSS; PDF is produced by the browser print dialog in v1 (zero dependencies), with a server-side renderer as roadmap.

### Audit logging
`activities` is the audit trail for business events. Security-relevant events (login, invite accepted, role change, repository connected, document approved, project deleted) are always recorded with actor, IP hash and user agent in `metadata`. Supabase Auth logs cover authentication attempts. Activity rows are append-only (no UPDATE/DELETE policies for any role).

### Error handling
`engineering/error-handling.md`. Summary: typed `ActionResult` from Server Actions; `error.tsx` boundaries per route segment; `not-found.tsx` per entity; Sentry for server and client errors (privacy-scrubbed).

### Observability
- Vercel logs + Sentry (errors, performance traces sampled at 10%).
- Supabase dashboard for query performance; `pg_stat_statements` reviewed monthly.
- Health endpoint `/api/health` checks DB connectivity for uptime monitoring.

## Environments

| Environment | Next.js | Supabase | GitHub App | Purpose |
|---|---|---|---|---|
| Local | `next dev` | `supabase start` (Docker) | Dev app pointing at tunnel (optional) | Development, integration tests |
| Preview | Vercel preview per PR | Shared `staging` project | Staging app | Review of PRs with realistic data |
| Production | Vercel production | `production` project | Production app | Live |

Details: `engineering/deployment.md`.

## Non-goals of the architecture
- Multi-region, microservices, event sourcing, GraphQL, custom auth, a separate mobile app. None are justified by current or plausible near-term load (5 to 20 users, tens of projects, thousands of tasks).
