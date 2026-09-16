# Environment Variables

All variables are validated at boot by `lib/env.ts` (Zod). `NEXT_PUBLIC_*` are embedded in the browser bundle and must never hold secrets. Everything else is server-only.

| Variable | Scope | Required | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | public | yes | Canonical origin (`https://malhot.tech`, `http://localhost:3000`). Used for redirects, OG URLs, auth callbacks. |
| `NEXT_PUBLIC_SUPABASE_URL` | public | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | yes | Supabase anon/publishable key (RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | server | yes | Service role / secret key. Only `lib/supabase/admin.ts`. |
| `SUPABASE_DB_URL` | CI only | CI | Direct connection for pgTAP / migration checks |
| `GITHUB_APP_ID` | server | prod/staging | GitHub App id |
| `GITHUB_APP_SLUG` | server | prod/staging | For the install URL |
| `GITHUB_APP_PRIVATE_KEY` | server | prod/staging | PEM, base64-encoded |
| `GITHUB_APP_WEBHOOK_SECRET` | server | prod/staging | HMAC secret |
| `GITHUB_STATE_SECRET` | server | prod/staging | Signs the `state` param in the install flow |
| `CRON_SECRET` | server | prod | Bearer token Vercel Cron sends |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | both | optional | Error reporting |
| `SENTRY_AUTH_TOKEN` | build | optional | Source map upload |
| `SENTRY_ENVIRONMENT` | server | optional | `production` / `preview` / `development` |
| `RESEND_API_KEY` | server | roadmap | Email digests / custom SMTP |
| `INQUIRY_IP_SALT` | server | yes | Daily-rotated salt is derived from this + date for hashing IPs |
| `NODE_ENV` | both | auto | |
| `NEXT_PUBLIC_VERCEL_ENV` | public | auto (Vercel) | Distinguish preview/production for banners and analytics |

## Rules

- Add a variable → update `lib/env.ts`, `.env.example` (name + comment, no value), this table, and the Vercel/GitHub environments.
- `.env.local` is git-ignored; `.env.example` is committed.
- Local development uses the local Supabase keys printed by `supabase start`; they are not secrets but still not committed.
- Preview deployments must not receive production secrets. Vercel environment scoping (Production / Preview / Development) enforces this; the staging Supabase project has its own keys.
- No variable is read via `process.env` outside `lib/env.ts`.

## `.env.example` (to be created in Phase 1)

```dotenv
# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase (from `supabase start` locally)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# GitHub App (optional locally)
GITHUB_APP_ID=
GITHUB_APP_SLUG=
GITHUB_APP_PRIVATE_KEY=          # base64 of the PEM
GITHUB_APP_WEBHOOK_SECRET=
GITHUB_STATE_SECRET=

# Jobs
CRON_SECRET=

# Website
INQUIRY_IP_SALT=

# Observability (optional)
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
SENTRY_ENVIRONMENT=development
```
