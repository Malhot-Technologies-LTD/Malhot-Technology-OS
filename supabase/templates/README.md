# Auth email templates

Supabase sends server-initiated links (invite, recovery, magic link) through the
`/auth/v1/verify` endpoint, which lands on the app with an implicit-flow hash the
server cannot read. These templates instead link straight to `/auth/callback`
with `token_hash` + `type`, which the route verifies with `verifyOtp`
(`app/(auth)/auth/callback/route.ts`).

- Local: wired in `supabase/config.toml` under `[auth.email.template.*]`.
- Hosted: paste each file into Supabase → Authentication → Email Templates
  (Invite user, Magic Link, Reset Password) and set the matching subject.
  Dashboard templates are not managed by migrations, so re-check them after edits.

`{{ .RedirectTo }}` carries the `redirectTo` passed by the app (invite link,
`/reset-password`, or the page the user asked for) and is validated by `safeNext`.
