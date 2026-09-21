# Authentication Architecture

## Decision

**Supabase Auth**, invite-only, using `@supabase/ssr` for cookie-based sessions in Next.js. Rationale: ADR-004 in `planning/technical-decisions.md`. Custom auth is never rolled here.

## Identity model

```text
auth.users (Supabase-managed)  1 ──── 1  public.profiles (ours)
                                          └── n  organization_members (org role)
                                          └── n  project_members (project role)
```

- `auth.users` holds credentials, email, providers. We never write to it directly except via the Auth Admin API (invites).
- `profiles.id = auth.users.id`. Created by trigger `handle_new_auth_user()` with `full_name`/`avatar_url` from `raw_user_meta_data` when present.
- Being authenticated is not enough to enter the OS: the user must have an `organization_members` row. Otherwise `/os` shows "No organisation access" with instructions (ask an admin for an invitation) and a sign-out button.

## Sign-in methods

| Method | v1 | Notes |
|---|---|---|
| Email + password | Yes | Minimum 12 characters, checked against HaveIBeenPwned via Supabase "leaked password protection". |
| Magic link | Yes | Same form ("Email me a link"). |
| Sign in with GitHub | Roadmap | OAuth via Supabase Auth (PKCE). Deferred by the owner (OD-3); design in ADR-025 and below. |
| Sign in with Google | Roadmap | As above. |
| SAML / Workspace SSO | Roadmap | Only if the company adopts enterprise SSO. |

Public sign-up is **disabled** (`enable_signup = false` in Supabase Auth config). Accounts exist only via invitation or the bootstrap script.

### OAuth account linking rules (roadmap — not built in v1)

Invitations always create the account through the email provider (`inviteUserByEmail`). OAuth is a *second way in* for an existing account, never a way to create one.

1. A user signs in with GitHub/Google → Supabase receives the provider's verified email.
2. If an `auth.users` row exists with that email, Supabase **automatically links** the new identity to it (default "automatic linking" for verified provider emails). The user lands in the OS as themselves.
3. If no user exists with that email, GoTrue returns `signup_disabled`. The login page shows: "No Malhot account uses this <GitHub/Google> email. Sign in with the email you were invited with, or ask an admin for an invitation."
4. Provider emails that are unverified are rejected by Supabase (no linking) — same message.
5. Users can see and unlink identities under Settings → Security (`user.identities`); at least one sign-in method must remain (password/email counts).

Consequence for invitations: the admin should invite the address the person uses on GitHub/Google (the UI hint says so). If a person's GitHub primary email differs, they sign in by email first and may then link GitHub from Settings → Security (`linkIdentity`).

### Provider configuration (Supabase dashboard, not app env)

- **GitHub**: reuse the registered Malhot GitHub App as the OAuth client. In the App settings use its **Client ID**, generate a **Client secret**, and add the Supabase callback `https://<project-ref>.supabase.co/auth/v1/callback` to the App's *Callback URLs* (the "Request user authorization during installation" option can stay off). One app serves both the integration and sign-in; a separate GitHub "OAuth App" is also acceptable if preferred.
- **Google**: Google Cloud Console → OAuth client (Web) with the same Supabase callback as authorised redirect URI; add Client ID/secret in Supabase.
- Redirect allow-list in Supabase Auth: `http://localhost:3000/**`, the Vercel production URL `/**`, and `https://*-<team>.vercel.app/**` for previews.

### OAuth flow in the app (roadmap)

`signInWithOAuth({ provider, options: { redirectTo: `${SITE_URL}/auth/callback?next=…` } })` from a Server Action (returns the provider URL; the action redirects). `/auth/callback` exchanges the code (`exchangeCodeForSession`) and applies the same `next` validation as email flows. Errors from the provider arrive as `?error=…&error_description=…` and are mapped to friendly messages on `/login`.

## Sessions

- `@supabase/ssr` stores the session in HTTP-only, `Secure`, `SameSite=Lax` cookies chunked as needed.
- `proxy.ts` (Next.js request middleware) runs on every request except static assets: it refreshes an expiring access token (rotating the refresh token) and writes updated cookies to the response. It redirects unauthenticated requests to `/os/*` → `/login?next=/os/...` and authenticated requests to `/login` → `/os`.
- JWT lifetime 1 hour; refresh token reuse detection on (Supabase default). Absolute session lifetime 30 days of inactivity (Supabase "time-box" setting) — an internal tool should not stay signed in forever on lost laptops.
- Sign out: server action calls `supabase.auth.signOut({ scope: 'global' })` to revoke all refresh tokens for the user, then redirects to `/`.

## Route protection (three layers)

1. **Proxy**: cheap redirect for obviously unauthenticated requests. Not trusted for authorisation.
2. **Layouts**: `(os)/layout.tsx` calls `requireViewer()` which loads session + profile + org membership; redirects or renders the "no access" state. Project layout calls `requireProjectContext(key)`.
3. **RLS**: even if 1 and 2 are bypassed (direct Server Action call, bug), the database returns only permitted rows.

## Invitations

Flow (`product/workflows.md#w1`):

1. Admin action `inviteMember({ email, orgRole, projects: [{ projectId, role }] })` → validates → creates `invitations` row with `token_hash = sha256(token)`, `expires_at = now() + 7 days` → calls Supabase Auth Admin `inviteUserByEmail(email, { redirectTo: SITE_URL/auth/callback?next=/invite/<token> })`.
   - If the email already has an `auth.users` account (e.g. removed member re-invited), we skip the Auth invite and send a plain notification email with the same `/invite/<token>` link (roadmap: Resend; v1: admin copies the link from the UI, shown once).
2. `/auth/callback` exchanges the code, sets the session, redirects to `next`.
3. `/invite/[token]` (RSC): hashes the token, loads the pending invitation (admin client — the user has no membership yet), checks expiry and email match with the session user, shows "Join Malhot as <role>" → action `acceptInvitation()` → elevated function inserts `organization_members` + `project_members`, marks invitation accepted, emits activity.
4. Redirect to `/os` with the first-run profile prompt.

Security notes: raw tokens are never stored; tokens are single-use; email must match the authenticated user's email; invitations can be revoked; expired ones are cleaned by cron.

## Password reset

`/forgot-password` → `resetPasswordForEmail(email, { redirectTo: /auth/callback?next=/reset-password })` → `/reset-password` → `updateUser({ password })`. Always show the same success message regardless of whether the email exists.

## Changing a password

`Settings → Password` (`/os/settings/password`) calls `changePassword`, which re-authenticates the caller before `updateUser({ password })`. Re-authentication runs `signInWithPassword` on a throwaway publishable-key client (`lib/supabase/password-check.ts`) that never persists a session, so proving the current password cannot disturb the caller's own cookies. A wrong current password comes back as a field error, and Supabase Auth rate-limits the attempts. This is the in-app path; `/reset-password` remains the path for people who cannot sign in at all.

## Bootstrap (first organisation)

A one-time CLI script `scripts/bootstrap-org.ts` (run locally with the secret key against the target environment) creates the first owner user via Auth Admin, the organisation, and the owner membership. It refuses to run if any organisation exists. No UI for this: it is a one-off operational step and having a public "create organisation" screen would be an attack surface.

`scripts/reset-owner.ts` is its recovery twin: when the owner password is lost and no reset email can be received, it deletes the owner's auth user and creates a fresh one with the same email. It parks the old address, creates and promotes the replacement, re-points `invitations.invited_by` / `clients.created_by` / `inquiries.handled_by`, and only then deletes the old user — so the "an organisation always keeps at least one owner" invariant holds at every step.

## Auth callback and open-redirect protection

`/auth/callback` (`app/(auth)/auth/callback/route.ts`) is the single landing point for every Supabase redirect and accepts two shapes:

- `?code=…` — PKCE exchange for OAuth started from this app (`exchangeCodeForSession`).
- `?token_hash=…&type=invite|recovery|magiclink` — server-initiated emails. Supabase's default `{{ .ConfirmationURL }}` lands with an implicit-flow hash the server cannot read, so the email templates in `supabase/templates/` link straight to the callback with `{{ .TokenHash }}` and the route calls `verifyOtp`. The hosted project's templates must be set to these files by hand (Authentication → Email Templates); `supabase/config.toml` wires them for local development.

Failures redirect to `/login?error=…&error_code=…`, which `features/auth/lib/auth-errors.ts` maps to a sentence.

`next` parameters are validated: must start with `/`, must not start with `//`, must not contain `\`. Otherwise fall back to `/os`.

## Client-side use of auth

The browser client (`lib/supabase/client.ts`, publishable key) is used only for: Realtime subscriptions, Storage uploads with signed URLs, reading the current user for UI. All data reads go through RSC; all writes through Server Actions. The anon key is public by design; RLS is what protects data.

## Keys

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`) — safe in the browser.
- `SUPABASE_SECRET_KEY` (`sb_secret_…`, service-role privileges) — server only; see `architecture/backend-architecture.md`.
- The project uses the new Supabase key format; legacy anon/service-role JWT keys are not used anywhere.

## Audit

Auth events (sign-in, sign-out, password change, invite accepted) → `activities` with `entity_type = 'member'` and `metadata.ip_hash`, `metadata.user_agent`. Supabase Auth logs retained per plan; exported to the audit doc if ever needed.

## Threats considered

| Threat | Mitigation |
|---|---|
| Credential stuffing | Leaked-password check, Supabase rate limits, no public signup |
| Session theft | HTTP-only secure cookies, short access tokens, refresh rotation, global sign-out |
| OAuth account takeover via unverified provider email | Supabase links only verified emails; sign-up disabled so no new accounts via OAuth |
| Invitation token leak | Hashed storage, single-use, 7-day expiry, email match |
| Open redirect | `next` validation |
| Privilege via stale JWT claims | Roles are never in JWT; looked up per request |
| Lost device | 30-day inactivity timebox; admin can remove membership (immediate effect through RLS) |
