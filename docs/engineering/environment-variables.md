# Environment Variables

All variables are validated at boot by `lib/env.ts` (Zod). `NEXT_PUBLIC_*` are embedded in the browser bundle and must never hold secrets. Everything else is server-only.

The Supabase project uses the **new key format** (`sb_publishable_…` / `sb_secret_…`). The secret key carries `service_role` privileges (bypasses RLS) and is treated exactly as the legacy service-role key in these docs.

| Variable                                | Scope        | Required      | Purpose                                                                                                      |
| --------------------------------------- | ------------ | ------------- | ------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL`                  | public       | yes           | Canonical origin (`https://<domain>`, `http://localhost:3000`). Used for redirects, OG URLs, auth callbacks. |
| `NEXT_PUBLIC_SUPABASE_URL`              | public       | yes           | Supabase project URL                                                                                         |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`  | public       | yes           | Publishable key (`sb_publishable_…`). RLS protects data.                                                     |
| `SUPABASE_SECRET_KEY`                   | server       | yes           | Secret key (`sb_secret_…`), service-role privileges. Only `lib/supabase/admin.ts`.                           |
| `SUPABASE_PROJECT_REF`                  | CI / scripts | CI            | Project ref for `supabase link` / `db push`                                                                  |
| `SUPABASE_ACCESS_TOKEN`                 | CI / scripts | CI            | Supabase CLI personal access token for migrations in CI                                                      |
| `SUPABASE_DB_PASSWORD`                  | CI / scripts | CI            | Database password for `db push`                                                                              |
| `GITHUB_APP_ID`                         | server       | prod/staging  | GitHub App id                                                                                                |
| `GITHUB_APP_SLUG`                       | server       | prod/staging  | For the install URL                                                                                          |
| `GITHUB_APP_PRIVATE_KEY`                | server       | prod/staging  | PEM, base64-encoded                                                                                          |
| `GITHUB_APP_WEBHOOK_SECRET`             | server       | prod/staging  | HMAC secret                                                                                                  |
| `GITHUB_STATE_SECRET`                   | server       | prod/staging  | Signs the `state` param in the install flow                                                                  |
| `CRON_SECRET`                           | server       | prod          | Bearer token Vercel Cron sends                                                                               |
| `INQUIRY_IP_SALT`                       | server       | yes           | Base salt for hashing enquiry IPs (daily-derived)                                                            |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | both         | optional      | Error reporting                                                                                              |
| `SENTRY_AUTH_TOKEN`                     | build        | optional      | Source map upload                                                                                            |
| `SENTRY_ENVIRONMENT`                    | server       | optional      | `production` / `preview` / `development`                                                                     |
| `RESEND_API_KEY`                        | server       | roadmap       | Email digests / custom SMTP                                                                                  |
| `NODE_ENV`                              | both         | auto          |                                                                                                              |
| `NEXT_PUBLIC_VERCEL_ENV`                | public       | auto (Vercel) | Distinguish preview/production for banners and analytics                                                     |

OAuth provider credentials (GitHub, Google) are **not** application environment variables: they are configured in the Supabase dashboard (Authentication → Providers). See `architecture/authentication-architecture.md`.

## Vercel configuration

Set in Vercel → Project → Settings → Environment Variables. Scope column: P = Production, Pr = Preview, D = Development.

| Variable                                                    | P   | Pr  | D   | Value source                                                                                                                                                          |
| ----------------------------------------------------------- | --- | --- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                                      | ✓   | ✓   | ✓   | Production: the final domain (until then, the `*.vercel.app` production URL). Preview: leave **unset** — the app falls back to `https://${VERCEL_URL}` automatically. |
| `NEXT_PUBLIC_SUPABASE_URL`                                  | ✓   | ✓   | ✓   | Supabase → Settings → API                                                                                                                                             |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`                      | ✓   | ✓   | ✓   | Supabase → Settings → API Keys → Publishable                                                                                                                          |
| `SUPABASE_SECRET_KEY`                                       | ✓   | ✓   | ✓   | Supabase → Settings → API Keys → Secret (mark **Sensitive** in Vercel)                                                                                                |
| `GITHUB_APP_ID`                                             | ✓   | ✓   |     | GitHub → Org settings → Developer settings → GitHub Apps → the app                                                                                                    |
| `GITHUB_APP_SLUG`                                           | ✓   | ✓   |     | URL slug of the app (`github.com/apps/<slug>`)                                                                                                                        |
| `GITHUB_APP_PRIVATE_KEY`                                    | ✓   | ✓   |     | Generate a private key in the app settings; base64-encode the `.pem` (`base64 -w0 key.pem`); mark Sensitive                                                           |
| `GITHUB_APP_WEBHOOK_SECRET`                                 | ✓   | ✓   |     | The webhook secret set on the app; mark Sensitive                                                                                                                     |
| `GITHUB_STATE_SECRET`                                       | ✓   | ✓   |     | Random 32+ bytes (`openssl rand -base64 32`); mark Sensitive                                                                                                          |
| `CRON_SECRET`                                               | ✓   |     |     | Random 32+ bytes; mark Sensitive. Vercel Cron sends it automatically when the variable exists.                                                                        |
| `INQUIRY_IP_SALT`                                           | ✓   | ✓   | ✓   | Random 32+ bytes; mark Sensitive                                                                                                                                      |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | ✓   | ✓   |     | Sentry project (when added)                                                                                                                                           |

Until a staging Supabase project exists, Preview and Production point at the same Supabase project (single project provided). This is acceptable while the team is the only user base and no client data exists; create a staging project before onboarding real client work (`engineering/deployment.md`).

## Rules

- Add a variable → update `lib/env.ts`, `.env.example` (name + comment, no value), this table, and the Vercel/GitHub environments.
- `.env.local` is git-ignored; `.env.example` is committed.
- No variable is read via `process.env` outside `lib/env.ts`.
- Preview deployments must not receive production-only secrets (`CRON_SECRET`).
