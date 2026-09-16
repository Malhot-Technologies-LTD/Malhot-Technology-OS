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
| Email + password | Yes | Primary. Minimum 12 characters, checked against HaveIBeenPwned via Supabase "leaked password protection". |
| Magic link | Yes | Same form ("Email me a link"). |
| GitHub OAuth (sign in with GitHub) | Roadmap | Useful for developers; requires account linking rules. Deferred to keep v1 surface small. |
| Google / SSO | Roadmap | Only if the company adopts Google Workspace SSO. |

Public sign-up is **disabled** (`enable_signup = false` in Supabase Auth config). Accounts exist only via invitation or the bootstrap script.

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

## Bootstrap (first organisation)

A one-time CLI script `scripts/bootstrap-org.ts` (run locally with the service role key against the target environment) creates the first owner user via Auth Admin, the organisation, and the owner membership. It refuses to run if any organisation exists. No UI for this: it is a one-off operational step and having a public "create organisation" screen would be an attack surface.

## Auth callback and open-redirect protection

`next` parameters are validated: must start with `/`, must not start with `//`, must not contain `\`. Otherwise fall back to `/os`.

## Client-side use of auth

The browser client (`lib/supabase/client.ts`, anon key) is used only for: Realtime subscriptions, Storage uploads with signed URLs, reading the current user for UI. All data reads go through RSC; all writes through Server Actions. The anon key is public by design; RLS is what protects data.

## Keys

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable) — safe in the browser.
- `SUPABASE_SERVICE_ROLE_KEY` — server only; see `architecture/backend-architecture.md`.
- Supabase project uses the newer publishable/secret key format if available at project creation; names in `engineering/environment-variables.md` are kept stable either way.

## Audit

Auth events (sign-in, sign-out, password change, invite accepted) → `activities` with `entity_type = 'member'` and `metadata.ip_hash`, `metadata.user_agent`. Supabase Auth logs retained per plan; exported to the audit doc if ever needed.

## Threats considered

| Threat | Mitigation |
|---|---|
| Credential stuffing | Leaked-password check, Supabase rate limits, no public signup |
| Session theft | HTTP-only secure cookies, short access tokens, refresh rotation, global sign-out |
| Invitation token leak | Hashed storage, single-use, 7-day expiry, email match |
| Open redirect | `next` validation |
| Privilege via stale JWT claims | Roles are never in JWT; looked up per request |
| Lost device | 30-day inactivity timebox; admin can remove membership (immediate effect through RLS) |
