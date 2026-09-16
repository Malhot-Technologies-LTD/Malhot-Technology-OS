# Deployment

```text
Domain (malhot.tech — TBC)
   ↓ DNS → Vercel
Next.js on Vercel (production + preview)
   ↓
Supabase (production project; staging project for previews)
   ↓ ↑
GitHub (source, CI, GitHub App webhooks)
```

## Environments

| | Local | Preview | Production |
|---|---|---|---|
| App | `npm run dev` | Vercel preview per PR | Vercel production (main) |
| Database | `supabase start` (Docker) | Supabase **staging** project | Supabase **production** project |
| Auth emails | Mailpit (local) | Supabase built-in SMTP (staging) → custom SMTP later | Custom SMTP (Resend) recommended before go-live for deliverability |
| GitHub App | "Malhot OS (Dev)" pointing to a tunnel (optional) | "Malhot OS (Staging)" | "Malhot OS" |
| Cron | manual `curl` | disabled | Vercel Cron |
| Sentry | disabled | env `preview` | env `production` |
| Analytics | off | off | on (marketing) |

Why a shared staging database for previews rather than Supabase branching: branching adds cost and cold-start friction; the team is five people and previews mostly need realistic, persistent data to review UI. Revisit if preview interference becomes a problem.

## Release flow

1. PR → CI green → review → squash-merge to `main`.
2. Vercel builds `main` → **production deploy**. Migrations are applied **before** the app deploy by a GitHub Actions job (`supabase db push` against production using `SUPABASE_ACCESS_TOKEN` + project ref) that runs on merge and must succeed before the Vercel deploy is promoted (Vercel deploy is triggered by the workflow via deploy hook, not by Git integration, so ordering is guaranteed).
3. Post-deploy smoke: `GET /api/health`, login e2e against production with a dedicated smoke user (read-only project).

Migration compatibility rule: every migration must be backward-compatible with the currently running app version (expand → migrate → contract). Column removals happen one release after the code stops using them.

## Rollback

- **App:** Vercel "Promote previous deployment" (instant). Works when the migration was backward compatible (the rule above).
- **Database:** forward-fix migration. For data damage: Supabase PITR (Pro plan) to a point before the incident into a new project, then targeted restore. Rehearsed once before go-live and documented in `docs/engineering/runbooks/restore.md` (to be written during Phase 1).

## Health and observability

- `/api/health` polled by an uptime monitor (Better Uptime / Vercel checks) every minute; alerts to the team channel.
- Sentry alerts on new issue types and on error-rate spikes.
- Supabase: database size, connection count and slow query dashboards checked weekly; alerts on > 80% of plan limits.
- Vercel: function duration and error rate.

## Configuration and secrets

- Secrets live in Vercel project env vars (per environment) and GitHub Actions secrets. Never in the repo. `.env.example` lists names only.
- `lib/env.ts` validates at boot; a missing variable fails the build/start with a clear message.
- Rotation: GitHub App private key and webhook secret rotate yearly or on suspicion; Supabase service role key rotates on staff change; `CRON_SECRET` rotates with the key rotation.

## Supabase project setup checklist (per environment)

1. Create project (region closest to the team and users; confirm in open decisions).
2. Auth: disable public signup; enable email confirmations; set site URL and redirect allow-list (`/auth/callback`); enable leaked-password protection; set session timebox 30 days; upload branded email templates.
3. Storage: create buckets with size/MIME limits per `database/schema.md`.
4. Apply migrations; verify RLS enabled on all tables (`scripts/check-rls.sql` in CI).
5. Realtime: restrict publication to `tasks`, `notifications`.
6. Backups: confirm daily; enable PITR for production.
7. Run `scripts/bootstrap-org.ts` once (production) to create the owner and organisation.

## Vercel setup

- Framework preset Next.js; Node 22 LTS runtime (or the current LTS at go-live).
- Env vars per environment; `NEXT_PUBLIC_SITE_URL` set per environment.
- `vercel.json`: cron schedule; security headers (CSP report-only first, then enforce; HSTS; X-Content-Type-Options; Referrer-Policy; Permissions-Policy).
- Custom domain + `www` redirect; `/os` not indexed via robots + meta.

## GitHub App setup

Register under the Malhot GitHub organisation: permissions and events per `architecture/integrations.md`; webhook URL `https://<domain>/api/webhooks/github`; generate private key → base64 → env. Install on the organisation; restrict to selected repositories initially.

## Cost expectations (order of magnitude, verify at setup)

Vercel Pro (team, previews, cron), Supabase Pro (backups, PITR, no pausing), Sentry developer/team tier, domain. Roughly the cost of a couple of SaaS seats per month — acceptable for a company operating client projects; free tiers are not appropriate for production (pausing, no backups).
