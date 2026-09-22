# HANDOFF

## Current Task
Phase 3 — Organisation, projects, goals, MVP (`docs/features/projects.md`, `docs/planning/implementation-phases.md`). A thin vertical slice is live; the rest of Phase 3 is listed under Progress.

## Status
Migration 0006 applied to the hosted project (2026-09-21) and the first slice of Phase 3 is working end to end: create a project, see it listed, open its overview, add goals and MVP items, activate it. Verified against the live database as the signed-in owner, so the RLS policies — not just the service role — are known good.

## Progress
### Phase 3 (in progress)
- [x] Migration 0006: `projects`, `project_sequences`, `project_members`, `goals`, `mvp_items`, `milestones`; helpers `project_org/_role_of/_group_of`, `is_project_member`, `can_manage_project`, `can_contribute`, `project_is_writable`, `next_project_sequence`; triggers `setup_new_project`, `member_must_be_in_org`, `mvp_item_goal_same_project`, `enforce_goal_achieve`, `enforce_project_status_transition`; RLS on all six tables
- [x] `lib/permissions.ts` — the full matrix from `docs/product/user-roles.md` (all 50 actions, not just Phase 3), 245 table-driven tests
- [x] Project list `/os/projects`, basics-only create `/os/projects/new`, overview `/os/projects/[key]` with readiness checklist, goals/MVP quick-add and status transitions
- [x] `projects` removed from `PLANNED_SECTIONS`; `db:types` no longer hardcodes a project ref (`scripts/gen-types.mjs`)
- [ ] `types/database.ts` for 0006 was **hand-written** (the CLI could not be authenticated). Regenerate with `npm run db:types` once a token or `SUPABASE_DB_PASSWORD` exists; CI's drift check will confirm it
- [ ] Full 8-step wizard, project settings, members/invitations UI, org settings, permissions page, team page
- [ ] Goals & MVP page (reordering, linking, traceability); milestones UI (Phase 5)
- [ ] `project_progress()` / `project_health()` — deferred to migration 0007, they count tasks and bugs
- [ ] RLS matrix integration tests for the new tables; e2e journeys 3 to 4

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
- **OS visual register decided 2026-09-22: the Vercel dashboard direction**, chosen by the owner from a
  side-by-side of Linear / Vercel / Notion. Airy and high contrast: near-black text (`--fg` oklch 0.145),
  page recedes to light grey so white cards read as raised, borders separate rather than shadows, 32px page
  padding, 20px card padding, content capped at `max-w-7xl`, radius 6/8/12. Primary buttons are **neutral
  ink, not brand** (`--ink`), which keeps the cobalt accent meaningful where it does appear: active nav,
  links, focus rings, progress fill. Projects render as a **card grid, not a table** — the owner picked
  "cards not rows" explicitly.
- **`/preview` is a dev-only component gallery** (`app/(dev)/preview`). It renders the real components,
  fonts and tokens with fixture data and needs no session, which is the only practical way to review OS
  design without signing in. It calls `notFound()` when `NODE_ENV === "production"`.
- The website register is insulated from all of the above: `[data-surface="site"]` overrides radius (3/5/8)
  and colour, so OS changes never touch the approved marketing pages.
- `--accent` is the shadcn alias for `--brand-subtle` (a pale tint), **not** the cobalt. Use `bg-brand` for
  anything that should read as the accent; `bg-accent` renders nearly invisible.
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
