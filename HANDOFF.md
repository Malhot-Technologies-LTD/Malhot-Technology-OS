# HANDOFF

## Current Task
Phase 1 — Foundation, auth, shell (`docs/planning/implementation-phases.md`). Goal: a newly invited user can sign in, land on an empty dashboard and edit their profile; RLS tests pass for identity tables; e2e journeys 1–2 pass; deploy to preview works.

## Status
In progress — auth, shell and the test harness are built; the owner has bootstrapped the organisation and signed in. Remaining: first CI run of the database job, `lib/permissions.ts`, Vercel/Sentry (owner), Supabase dashboard settings (owner).

## Progress
- [x] Supabase MCP connected (`.mcp.json`, project scope); migrations 0001–0004 applied to the hosted project; `types/database.ts` generated from it; security advisor clean apart from intentional/Supabase-owned items
- [x] `lib/auth` (`safeNext`, cached `getAuthState`/`requireViewer`), `lib/actions/validation.ts`, `lib/forms/action-errors.ts`
- [x] `features/auth`: password, magic link, sign-out (global), forgot/reset password, profile update; error mapping with unit tests. OAuth (GitHub/Google) removed from v1 by the owner — ADR-025 stays Proposed for the roadmap
- [x] Routes: `/login`, `/forgot-password`, `/reset-password`, `/auth/callback` (PKCE `code` **and** `token_hash` links), `/invite/[token]`; `/` placeholder; error/not-found boundaries
- [x] OS shell: `(os)` layout with anonymous / no-access / member states, sidebar (collapsible, cookie-persisted), topbar, command palette (nav only), user menu, settings → profile + appearance, placeholder pages for later sections
- [x] Invitation acceptance (`lib/supabase/elevated/invitations.ts` + `features/organization`); `scripts/bootstrap-org.ts`, `scripts/invite-member.ts`
- [x] Supabase email templates (`supabase/templates/`) wired in `config.toml`
- [x] Tooling: Vitest (16 unit tests), Playwright (journey 1 incl. profile edit — 6 e2e tests), Prettier, `ci.yml`
- [x] Journeys 1 and 2 verified in a browser against the hosted project using the real bootstrap/invite scripts with temporary accounts (deleted afterwards; DB is empty)
- [ ] **Owner:** run `npx tsx scripts/bootstrap-org.ts --email … --name … --org "Malhot Technologies" --slug malhot` (secret key is in `.env.local`; consider rotating it, it was shared in chat)
- [ ] **Owner, Supabase dashboard:** Auth → disable sign-ups, min password 12 + leaked-password check, Site URL + redirect allow-list (`http://localhost:3000/**`, Vercel URLs), paste the three email templates (`docs/architecture/authentication-architecture.md`)
- [x] RLS integration harness (`tests/fixtures/supabase.ts`, `tests/integration/identity-rls.test.ts`) and pgTAP (`supabase/tests/identity.test.sql`) written; CI `database` job runs them on a fresh local stack. **Not yet run anywhere** — Docker is unavailable on the owner's machine, so the first real run is the next CI push; expect to fix small assertion mismatches there.
- [x] Husky + lint-staged pre-commit; dev-only tokens showcase at `/os/dev/tokens`; sidebar density loosened after owner feedback
- [ ] `lib/permissions.ts` (`can()`) — spec'd for Phase 3 but the shell will need it as soon as pages carry actions
- [ ] Vercel project env vars (`docs/engineering/environment-variables.md#vercel-configuration`), Sentry — need owner accounts
- [ ] Watch the first CI run (database + e2e jobs); set repo secrets `E2E_EMAIL`/`E2E_PASSWORD` (a dedicated test member, not the owner) and repo variables `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` if e2e should hit the hosted project

## Working Notes
- Migration file names carry the versions the MCP recorded (`20260916194516_foundation`, `…194550_identity`, `…194636_hardening`, `…201208_fix_last_owner_cascade`) so `supabase db push` treats them as applied. Apply future migrations the same way (MCP `apply_migration`, then save the file with the recorded version) or link the CLI and `db push` — do not mix without checking `supabase_migrations.schema_migrations`.
- 0004 fixes a real bug found while cleaning up: `protect_last_owner` fired during cascade from `organizations`, making organisations undeletable.
- `.env.local` holds URL, publishable key and secret key (never committed).
- Server-initiated auth emails must link to `/auth/callback?token_hash=…&type=…&next={{ .RedirectTo }}` (see `supabase/templates/README.md`); the default Supabase templates will not work with this app.
- Project grants on invitations are stored but not applied until `project_members` exists (Phase 3); acceptance then moves into one SQL function for atomicity.
- Theme: next-themes only (per device). The docs' "persist in profile" is deferred until something reads it.
- Prettier is configured to ignore `*.md` — running it on docs reflows every table.
- Local checks: `npm run format:check && npm run lint && npm run typecheck && npm test`; e2e: `E2E_BASE_URL=http://localhost:3000 E2E_EMAIL=… E2E_PASSWORD=… npm run test:e2e` against `npm run build && npm start`.
- Do not use Docker on the owner's machine (owner instruction, 2026-09-16); local Supabase is CI-only for now. Integration tests refuse non-local URLs by design.
- Owner bootstrapped the real organisation (`malhot`, owner `malhottech@gmail.com`) and signed in successfully.
- Next step on resume: check CI results for the database job and fix; then `lib/permissions.ts` (`can()` + matrix tests) as the bridge into Phase 3; Vercel project when the owner is ready.

## Recently Completed
- Test harness (pgTAP + RLS integration), Husky, tokens page, sidebar spacing (2026-09-16).
- Journey 2 (invite → accept) verified end to end; OAuth deferred from v1; work committed and pushed (2026-09-16).
- Phase 1 auth + shell slice, migrations applied to hosted Supabase, e2e journey 1 green (2026-09-16).
- Open decisions OD-1/2/3/4/5/12 resolved; docs updated for OAuth sign-in and new key format (2026-09-16).
- Phase 0 documentation package (2026-09-16).
