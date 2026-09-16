# HANDOFF

## Current Task
Phase 2 — Public website (`docs/product/public-website.md`, `docs/planning/implementation-phases.md`). Goal: all pages, contact form → enquiries in the OS, SEO artefacts, analytics, Lighthouse and axe budgets; launch gated on real content (OD-7).

## Status
Built and verified; awaiting the first CI run of the new Lighthouse job. Site launch is blocked on content (see `content/README.md`), not on engineering.

## Progress
- [x] Migration 0005 `inquiries` + `inquiry_rate_limits` + `submit_inquiry()` (service-role only, atomic per-IP hourly limit); types regenerated; advisor clean
- [x] Typed content (`content/*.ts`) with `placeholder: true` flags and a visible marker; `content/README.md` lists the content gaps
- [x] Pages: `/`, `/about`, `/services`, `/work`, `/work/[slug]`, `/process`, `/contact`, `/privacy`; dark register with light bands; mobile nav; login restyled in the website register
- [x] Contact form (RHF + Zod, honeypot, error summary focus) → `submitInquiry` → `createInquiry` (elevated) → Settings → Enquiries (admin-only page, mark handled)
- [x] SEO: per-page metadata + canonicals, `sitemap.ts`, `robots.ts` (OS/auth disallowed), default + case-study OG images; Vercel Analytics mounted only on the marketing layout
- [x] Theming fix: next-themes now mounts only in the OS layout; website/auth pin `data-theme` on a wrapper; `dark:` variant stops at nested light scopes. Contrast tokens darkened (`--fg-subtle`, warning/progress fg) after axe failures
- [x] Tests: `tests/e2e/website.spec.ts` (headings, nav, case study, login reachability, contact validation, sitemap/robots, axe WCAG 2.2 AA on every page, desktop + Pixel 7 project) — 24 pass locally; journey 12 (submit → admin sees → mark handled) verified in a browser with a temporary admin, then deleted
- [x] Lighthouse CI job (`lighthouserc.json`: perf ≥ 0.9, a11y ≥ 0.95, SEO ≥ 0.9, CLS ≤ 0.05, desktop preset)
- [ ] First CI run: check the `lighthouse` job; loosen to `warn` only if runner noise, not to hide a regression
- [ ] Owner: real content per `content/README.md`; Supabase dashboard tasks from Phase 1 still open (sign-ups off, password rules, email templates)
- [ ] Deferred to Phase 4: `inquiry_received` notification to admins (needs `notifications` + `emit_event`); daily prune of `inquiry_rate_limits` (W9 cron)

## Working Notes
- Migration files carry the versions the MCP recorded (…0005 = `20260916213955_inquiries`). Same rule as before: apply via MCP, then save the file with the recorded version.
- `INQUIRY_IP_SALT` is set in `.env.local` (generated); Vercel needs its own value.
- `/work` is the only dynamic marketing route (search-param filter); everything else is static or SSG.
- Magic MCP (UI component source per the global CLAUDE.md) is still unauthenticated; components were hand-written to the design system instead.
- Do not use Docker on the owner's machine; local Supabase is CI-only.
- Local checks: `npm run format:check && npm run lint && npm run typecheck && npm test`; e2e: build + start, then `E2E_BASE_URL=http://localhost:3000 npm run test:e2e` (account journeys need `E2E_EMAIL`/`E2E_PASSWORD`).
- Next step on resume: confirm CI (Lighthouse), then Phase 3 (organisation, projects, goals, MVP) starting with migration 3 and `lib/permissions.ts`.

## Recently Completed
- Phase 2 public website: pages, contact → enquiries, SEO, analytics, axe/Lighthouse budgets (2026-09-17).
- Test harness (pgTAP + RLS integration), Husky, tokens page, sidebar spacing (2026-09-16).
- Journey 2 (invite → accept) verified end to end; OAuth deferred from v1; work committed and pushed (2026-09-16).
- Phase 1 auth + shell slice, migrations applied to hosted Supabase, e2e journey 1 green (2026-09-16).
- Open decisions OD-1/2/3/4/5/12 resolved; docs updated for OAuth sign-in and new key format (2026-09-16).
- Phase 0 documentation package (2026-09-16).
