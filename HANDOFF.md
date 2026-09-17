# HANDOFF

## Current Task
Phase 2 — Public website (`docs/product/public-website.md`, `docs/planning/implementation-phases.md`). Goal: all pages, contact form → enquiries in the OS, SEO artefacts, analytics, Lighthouse and axe budgets; launch gated on real content (OD-7).

## Status
Built and verified. **UI redesigned again on 2026-09-17** after owner feedback that the site did not look professional. Register is now a conventional business site: white reading surface, light-grey alternating sections, navy for the closing CTA and footer, one blue accent. Earlier attempts (photography/card style, then a dark-hero style with animated brand geometry) were both rejected — the owner asked for "simple but good". Launch is blocked on content (`content/README.md`), not engineering.

## Progress
- [x] Migration 0005 `inquiries` + `inquiry_rate_limits` + `submit_inquiry()` (service-role only, atomic per-IP hourly limit); types regenerated; advisor clean
- [x] Typed content (`content/*.ts`) with `placeholder: true` flags and a visible marker; `content/README.md` lists the content gaps
- [x] Pages: `/`, `/about`, `/services`, `/work`, `/work/[slug]`, `/process`, `/contact`, `/privacy`; website register in `[data-surface="site"]` tokens, composed from the `components/marketing/section.tsx` primitives; header/footer carry the mark as SVG; login styled to match
- [x] No photography: the site ships with no imagery at all rather than stock or invented screenshots. Adding real photos is an OD-7 content task
- [x] Contact form (RHF + Zod, honeypot, error summary focus) → `submitInquiry` → `createInquiry` (elevated) → Settings → Enquiries (admin-only page, mark handled)
- [x] SEO: per-page metadata + canonicals, `sitemap.ts`, `robots.ts` (OS/auth disallowed), default + case-study OG images; Vercel Analytics mounted only on the marketing layout
- [x] Theming: next-themes mounts only in the OS layout; website/auth set `data-theme="light" data-surface="site"` on a wrapper. Contrast tokens darkened after axe failures
- [x] Tests: `tests/e2e/website.spec.ts` (headings, nav, case study, login reachability, contact validation, sitemap/robots, axe WCAG 2.2 AA on every page, desktop + Pixel 7 project) — 24 pass locally; journey 12 (submit → admin sees → mark handled) verified in a browser with a temporary admin, then deleted
- [x] Lighthouse CI job (`lighthouserc.json`: perf ≥ 0.9, a11y ≥ 0.95, SEO ≥ 0.9, CLS ≤ 0.05, desktop preset)
- [ ] First CI run: check the `lighthouse` job; loosen to `warn` only if runner noise, not to hide a regression
- [ ] Owner: real content per `content/README.md`; Supabase dashboard tasks from Phase 1 still open (sign-ups off, password rules, email templates)
- [ ] Deferred to Phase 4: `inquiry_received` notification to admins (needs `notifications` + `emit_event`); daily prune of `inquiry_rate_limits` (W9 cron)

## Working Notes
- **Design register (current, 2026-09-17).** Primitives live in `components/marketing/section.tsx` (Container, Section with tone light/subtle/ink, Eyebrow, Display, Title, Accent, SectionHead, ChevronList) — the type scale and section rhythm are decided there, not per page. Do not re-decide them inline.
  - White header (`site-header.tsx`), hero is **type only and centred** (no graphic, no logo — the owner removed it explicitly), promise strip under it, then alternating white / `bg-subtle` sections, navy `CtaBand`, navy footer.
  - Rejected and not to be reintroduced without asking: dark hero band, animated/drifting geometry, texture overlays, gradient glows, hover lifts, oversized display type, mono/tabular index numerals everywhere. The decorative CSS layer that carried these was deleted from `app/globals.css`.
- **`components/marketing/mark.tsx`** is the logo traced as vector geometry (102x82 viewBox, measured off `public/logo.png` by sampling its pixels), exposing `Mark` and the `Chevron` list marker. The PNG has a white background, so never place it on a dark surface — use `Mark`, which recolours.
- **`font-variant-numeric`.** `html` sets `tabular-nums` for the OS's data tables. `[data-surface="site"]` resets it to `normal` in `app/globals.css` — in Schibsted Grotesk the `tnum` feature also widens the comma and full stop to a digit's advance, which renders as a visible gap before every piece of punctuation. Opt back in per element with the `tabular-nums` class.
- `--fg-subtle` is `#616981`: 5.0:1 on `--bg-subtle`, which is the worst case on this surface. The previous value failed WCAG 1.4.3 at 4.40:1 and broke the axe check on `/`.
- Owner rules for the site still stand: never show or name Malhot OS; no invented clients, metrics, quotes or people; no placeholder testimonials. The testimonials section is intentionally absent until real quotes exist.
- Magic MCP (the UI component source named in the global CLAUDE.md) has never connected; components are hand-written.
- `/work` is the only dynamic marketing route (search-param filter); everything else is static or SSG.
- `INQUIRY_IP_SALT` is set in `.env.local`; Vercel needs its own value.
- Do not use Docker on the owner's machine; local Supabase is CI-only.
- **Verifying the site locally:** port 3000 is occupied by an unrelated app on this machine, so use another port — `npm run build && npx next start -p 3100`, then `E2E_BASE_URL=http://localhost:3100 npx playwright test tests/e2e/website.spec.ts`. Never pipe `npm run build` into `head`: SIGPIPE kills the build midway and leaves a `.next` that serves unstyled pages.
- Local checks: `npm run format:check && npm run lint && npm run typecheck && npm test`.
- Next step on resume: confirm CI (Lighthouse), then Phase 3 (organisation, projects, goals, MVP) starting with migration 3 and `lib/permissions.ts`.

## Recently Completed
- Website UI rebuilt as a plain business site (white/grey/navy, centred type-only hero, no motion); all 8 marketing routes restored and verified; axe AA green (2026-09-17).
- Phase 2 public website: pages, contact → enquiries, SEO, analytics, axe/Lighthouse budgets (2026-09-17).
- Test harness (pgTAP + RLS integration), Husky, tokens page, sidebar spacing (2026-09-16).
- Journey 2 (invite → accept) verified end to end; OAuth deferred from v1; work committed and pushed (2026-09-16).
- Phase 1 auth + shell slice, migrations applied to hosted Supabase, e2e journey 1 green (2026-09-16).
- Open decisions OD-1/2/3/4/5/12 resolved; docs updated for OAuth sign-in and new key format (2026-09-16).
- Phase 0 documentation package (2026-09-16).
