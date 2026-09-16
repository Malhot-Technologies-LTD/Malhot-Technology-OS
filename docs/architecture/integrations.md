# Integrations

Every integration is a liability with a maintenance cost. v1 has exactly one real external integration (GitHub) plus platform services (Vercel Cron, Sentry, analytics). Email is deferred.

## GitHub (v1)

### Authentication method — decision

| Option | Assessment |
|---|---|
| Personal access token stored in DB | Rejected. Long-lived, tied to one person, broad scope, rotation burden, leaks are catastrophic. |
| OAuth App with per-user tokens | Rejected for v1. Requires storing encrypted user tokens, refresh handling, and acts *as the user*. Useful later for user-attributed actions. |
| **GitHub App** | **Chosen.** The app is installed on the Malhot GitHub organisation; it authenticates as itself with a private key → JWT → short-lived (1 h) installation access token generated on demand. Fine-grained permissions, webhooks included, no user secrets stored, survives staff changes. |

Required App permissions (least privilege): Repository `metadata: read`, `contents: read` (commits, branches), `issues: read` (write later if we create issues from tasks), `pull_requests: read`, `deployments: read`. Webhook events: `installation`, `installation_repositories`, `issues`, `pull_request`, `push`, `deployment_status`.

Secrets: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` (base64 PEM), `GITHUB_APP_WEBHOOK_SECRET`, `GITHUB_APP_SLUG` (for the install URL). Server only.

Library: `octokit` (`@octokit/app`, `@octokit/webhooks`), well-maintained, handles JWT/installation token caching.

### Data model
`github_installations`, `github_repositories`, `github_issues`, `github_pull_requests`, `task_github_links`, `deployments`, `webhook_events` — see `database/schema.md`.

The OS keeps a **cache**, not a copy: enough fields to list, filter and link. Everything else links out to GitHub. Cache freshness is webhook-driven with a manual "Sync now" and a nightly reconciliation (cron, per repository: open issues/PRs pages) for missed deliveries.

### Capabilities by phase

| Capability | v1 | Later |
|---|---|---|
| Install app, connect repo to project | ✓ | |
| Repository info (default branch, visibility, last push) | ✓ | |
| Open/closed issues list | ✓ | Create issue from task |
| PR list with state, draft, branches, author | ✓ | Review status, checks |
| Auto-link PR/issue ↔ task by `KEY-n` | ✓ | |
| Manual link from task | ✓ | |
| Commit list for a PR | link out | inline |
| Push events → activity ("3 commits to main") | ✓ (summary) | |
| Deployments via `deployment_status` | ✓ if repo uses GitHub Deployments | Vercel integration |
| Branch list | roadmap | ✓ |

### Webhook processing
See `architecture/backend-architecture.md#route-handlers`. Idempotent by delivery id; 200 after persistence; retries via cron.

### Linking rules
Regex `\b([A-Z]{2,6})-(\d+)\b` over PR title, head branch, body and issue title. Match against `projects.key` of projects whose connected repository is the event's repository (a repo may serve one project in v1; unique constraint on `github_repositories.repo_id` per organisation). Links are inserted with `created_by = null` and `source = 'auto'`; manual links have `source = 'manual'`. Auto-linking never removes links.

## Email (deferred → roadmap, provider: Resend)

v1 relies on Supabase Auth emails (invite, magic link, password reset) using branded templates configured in the Supabase dashboard (templates versioned in `supabase/templates/*.html`). Application notifications are in-app only. When email digests are added: Resend + React Email, daily digest per user with a per-type opt-out, never per-event emails by default. Secret: `RESEND_API_KEY`.

## Vercel Cron (v1)
`vercel.json` schedules `GET /api/cron/daily` as `0 4 * * *` (UTC), which is 06:00 in Africa/Kigali (UTC+2) — early enough that overdue notifications land before the working day. The team timezone assumption is listed in `planning/open-decisions.md`. Authenticated by `CRON_SECRET`.

## Sentry (v1)
`@sentry/nextjs` for server, edge and client. Sampling: errors 100%, traces 10%. PII scrubbing in `beforeSend`. Source maps uploaded at build. DSN is public by design; `SENTRY_AUTH_TOKEN` server-only for uploads.

## Analytics (v1, marketing only)
Vercel Web Analytics (cookie-less, no consent banner required for aggregate page views under most regimes; privacy notice still describes it). Not loaded under `/os`. Decision ADR-014.

## Document export (v1)
No external service. HTML render + print CSS. Roadmap: server-side PDF (`@react-pdf/renderer` or headless Chromium via a small Vercel function) if clients need pixel-consistent PDFs.

## Future integrations (not designed yet, only reserved)

| Integration | Trigger to build |
|---|---|
| Vercel deployments API | When most client projects deploy on Vercel and manual deployment recording becomes tedious |
| Slack / Discord notifications | When the team asks; would reuse `lib/events/rules.ts` fan-out |
| Google Workspace SSO | If the company standardises on Workspace |
| Calendar (milestones → ICS feed) | Cheap; consider in v1.x — a signed ICS URL per user |
| AI drafting for documents | After templates prove out; AI proposes text into the editor, never writes to project tables |
