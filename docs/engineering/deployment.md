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
2. `.github/workflows/release.yml` runs on merge: it applies migrations with `supabase db push`, then triggers the Vercel deploy by hook. The deploy only happens if the migration job succeeded, so the app can never go live ahead of its schema.

### Setting the release workflow up

Until these are in place the workflow fails loudly rather than deploying something half-configured.

Create a **production** environment on the repository (Settings → Environments), and add four secrets to it:

| Secret | Where it comes from |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Supabase → Account → Access Tokens |
| `SUPABASE_PROJECT_REF` | The `xxxx` in `https://xxxx.supabase.co` for **production** |
| `SUPABASE_DB_PASSWORD` | The database password set when the project was created |
| `VERCEL_DEPLOY_HOOK_URL` | Vercel → Project → Settings → Git → Deploy Hooks |

Then **turn off Vercel's Git integration for production**, or it will keep deploying on push and race the migration job. That auto-deploy is precisely what this workflow replaces.

The project ref is named in a secret rather than read from an env file on purpose. The failure that motivated all of this was an app pointed at an entirely different Supabase project — one belonging to another product — and nothing in the pipeline said out loud which database it was about to change. A release should name its target.

### Why ordering needs a workflow at all

Vercel's Git integration starts building the moment `main` moves. It has no way to wait for a migration, so a deploy can go live against a database that has not caught up. In this project that produced three separate incidents, each surfacing as a different confusing error: a refused insert, a missing column reported as "something went wrong", and an empty picker that looked like missing data. The expand → migrate → contract rule below keeps each individual migration safe; this workflow is what keeps the *ordering* safe.
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
