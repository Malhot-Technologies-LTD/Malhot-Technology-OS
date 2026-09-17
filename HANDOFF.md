# HANDOFF

## Current Task
Phase 2 — Public website (`docs/product/public-website.md`, `docs/planning/implementation-phases.md`). Goal: all pages, contact form → enquiries in the OS, SEO artefacts, analytics, Lighthouse and axe budgets; launch gated on real content (OD-7).

## Status
Built and verified. Redesigned after owner feedback (2026-09-17): light, agency-style register modelled section by section on the owner's reference (Lawnx template), brand blue from the logo, photography instead of product mocks, **no mention or depiction of Malhot OS anywhere on the site**. Launch is blocked on content (`content/README.md`), not engineering.

## Progress
- [x] Migration 0005 `inquiries` + `inquiry_rate_limits` + `submit_inquiry()` (service-role only, atomic per-IP hourly limit); types regenerated; advisor clean
- [x] Typed content (`content/*.ts`) with `placeholder: true` flags and a visible marker; `content/README.md` lists the content gaps
- [x] Pages: `/`, `/about`, `/services`, `/work`, `/work/[slug]`, `/process`, `/contact`, `/privacy`; light website register (`[data-surface="site"]` tokens, pill `SiteButton`, `Eyebrow` rules, `Picture`/`PhotoCollage`); top bar + header with logo (`public/logo.png`); login styled to match
- [x] Photography: Unsplash placeholders in `content/images.ts` (remotePatterns in `next.config.ts`) — replace with own photos before launch
- [x] Contact form (RHF + Zod, honeypot, error summary focus) → `submitInquiry` → `createInquiry` (elevated) → Settings → Enquiries (admin-only page, mark handled)
- [x] SEO: per-page metadata + canonicals, `sitemap.ts`, `robots.ts` (OS/auth disallowed), default + case-study OG images; Vercel Analytics mounted only on the marketing layout
- [x] Theming: next-themes mounts only in the OS layout; website/auth set `data-theme="light" data-surface="site"` on a wrapper. Contrast tokens darkened after axe failures
- [x] Tests: `tests/e2e/website.spec.ts` (headings, nav, case study, login reachability, contact validation, sitemap/robots, axe WCAG 2.2 AA on every page, desktop + Pixel 7 project) — 24 pass locally; journey 12 (submit → admin sees → mark handled) verified in a browser with a temporary admin, then deleted
- [x] Lighthouse CI job (`lighthouserc.json`: perf ≥ 0.9, a11y ≥ 0.95, SEO ≥ 0.9, CLS ≤ 0.05, desktop preset)
- [ ] First CI run: check the `lighthouse` job; loosen to `warn` only if runner noise, not to hide a regression
- [ ] Owner: real content per `content/README.md`; Supabase dashboard tasks from Phase 1 still open (sign-ups off, password rules, email templates)
- [ ] Deferred to Phase 4: `inquiry_received` notification to admins (needs `notifications` + `emit_event`); daily prune of `inquiry_rate_limits` (W9 cron)

## Working Notes
- Migration files carry the versions the MCP recorded (…0005 = `20260916213955_inquiries`). Same rule as before: apply via MCP, then save the file with the recorded version.
- `INQUIRY_IP_SALT` is set in `.env.local` (generated); Vercel needs its own value.
- `/work` is the only dynamic marketing route (search-param filter); everything else is static or SSG.
- Owner rules for the site: never show/name Malhot OS (private); no invented clients, metrics, quotes or people; avoid the "AI template" look (no gradient text, no dot-pill labels, no identical icon-card grids, no placeholder testimonials). Testimonials section is intentionally absent until real quotes exist.
- Magic MCP (UI component source per the global CLAUDE.md) is still unauthenticated; components were hand-written instead.
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
