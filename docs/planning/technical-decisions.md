# Technical Decisions (ADRs)

Format per decision: context → options → decision → consequences. Each covers the dimensions the brief requires (advantages, disadvantages, cost, security, scalability, developer experience, fit for Malhot, alternatives). Decisions are revisited only with a new ADR that supersedes the old one.

Status legend: **Accepted** · **Proposed (needs approval)** · Superseded.

---

## ADR-001 — Next.js (App Router) over plain React/Vite — Accepted

**Context.** One codebase must serve a static, SEO-critical marketing site and a dynamic authenticated application.

**Options.** (a) Next.js App Router; (b) Vite + React SPA with a separate static site generator for marketing; (c) Remix/React Router framework mode.

**Assessment.**
- Next.js: server rendering and static generation in one router; RSC reduces client bundle for the OS; Server Actions give typed mutations without an API layer; first-class Vercel deployment; largest ecosystem (shadcn/ui, Supabase SSR helpers, Sentry). Costs: framework complexity (RSC/client boundary discipline), lock-in to Vercel conventions (mitigated: Next runs on Node anywhere), version churn.
- Vite SPA: simpler mental model, but marketing SEO needs a second tool, auth cookies need a custom server or edge functions, and every OS page ships client JS for data fetching. Two deployables for a five-person team.
- Remix/RR7: comparable capabilities, smaller ecosystem for our chosen libraries; less alignment with Supabase docs and shadcn tooling.

**Decision.** Next.js App Router, latest stable at scaffold time, pinned.

**Consequences.** Discipline on server/client boundaries (documented in frontend architecture); Node runtime for API routes needing crypto/Octokit; one deployable.

## ADR-002 — Supabase over a custom backend — Accepted

**Context.** Need Postgres, auth, file storage, realtime, with minimal operations.

**Options.** (a) Supabase; (b) Custom Node/Nest API + managed Postgres (RDS/Neon) + Auth0/Clerk + S3; (c) Firebase; (d) Neon Postgres + Neon Auth + Neon Data API/Storage (Neon tooling is present in this development environment).

**Assessment.**
- Supabase: Postgres with RLS as the authorisation backbone; Auth with SSR helpers; Storage with policy-based access; Realtime; local dev via Docker; migrations CLI; generated types. Costs: Pro plan for backups/no pausing; RLS discipline required; some lock-in on Auth/Storage APIs (data is plain Postgres — portable).
- Custom backend: maximal control, but a second service to build, secure, deploy and monitor; auth vendor cost; weeks of undifferentiated work for a small team.
- Firebase: document model fights the relational nature of this domain (traceability joins, reports); weaker SQL reporting.
- Neon stack: excellent Postgres (branching is attractive for previews), but auth/storage/realtime are newer and less integrated; Supabase's RLS-first auth model and SSR helpers fit the security design more directly today. Neon remains a credible alternative for the database if Supabase ever becomes a constraint — the schema is plain Postgres.

**Decision.** Supabase (Postgres, Auth, Storage, Realtime). **Flagged for confirmation** because Neon tooling exists in the environment — see `open-decisions.md` OD-1.

**Consequences.** Authorisation implemented as RLS + triggers; service role confined; Pro plan for production.

## ADR-003 — PostgreSQL schema design principles — Accepted

Normalised relational model; enums for closed vocabularies; soft delete on referenced entities; polymorphic `entity_type/entity_id` only for comments/attachments/activity/notifications with `project_id` denormalised for RLS; per-project human keys; SQL functions for aggregates. Detailed in `architecture/database-architecture.md`. Alternative considered: JSONB-heavy "flexible" schema — rejected because reports and traceability need joins and constraints.

## ADR-004 — Supabase Auth over custom authentication — Accepted

Never roll our own auth. Alternatives: Clerk/Auth0 (extra vendor, cost, and a second identity to map to RLS — Supabase Auth's `auth.uid()` integrates directly), NextAuth/Auth.js (self-managed sessions and adapters; more code for the same result). Supabase Auth chosen: cookie sessions via `@supabase/ssr`, invite flow, leaked-password protection, magic links, future OAuth providers. Roles are **not** placed in JWT claims (staleness); they are looked up per request.

## ADR-005 — Vercel over alternatives — Accepted

**Options.** Vercel; Netlify; Cloudflare Pages/Workers; self-hosted Node (Fly.io/Railway/VPS).

Vercel: zero-config Next.js, previews per PR, cron, analytics, edge network; cost is a Pro team plan. Netlify: comparable but Next.js support lags. Cloudflare: cheap and fast, but Next.js on Workers has runtime constraints (Node APIs for Octokit/crypto need care). Self-hosted: cheaper at scale, but adds ops (TLS, scaling, deploy pipeline, previews) — the wrong trade for five people. **Decision: Vercel.** Revisit only if cost becomes material or a client requires a specific region/host.

## ADR-006 — Server Components by default, client islands — Accepted

RSC for data loading and composition; `'use client'` only for interactivity. Reduces bundle size, removes client data-fetching code, keeps secrets server-side. Cost: boundary discipline; some libraries (dnd-kit, Tiptap) are client-only and lazy-loaded on their routes. Alternative (all-client with a data library) rejected per ADR-001 reasoning.

## ADR-007 — Server Actions for mutations; Route Handlers only for non-browser callers — Accepted

Server Actions: typed, colocated, progressive enhancement, no API surface to version for our own UI. Route Handlers: webhooks (GitHub), cron, OAuth-style callbacks, file export, health — anything with a non-browser or unauthenticated caller. Alternative (REST API for everything) rejected: it would duplicate validation/authorisation plumbing and create an API we do not need yet. If a public API is ever required, it is added deliberately with its own auth (API keys) — Server Actions are not that API.

## ADR-008 — No client state library; RSC + URL state + `useOptimistic` — Accepted

Zustand/Redux/TanStack Query evaluated. Client-side state needs are: shell UI (context), view state (URL), forms (RHF), optimistic projections (`useOptimistic`), two realtime channels (refresh). No present-day need for a global store or a client cache; adding one would create a second source of truth. Revisit trigger: a screen requiring client-side fetching with cache coherence (likely infinite activity feed — solvable with a small hook first).

## ADR-009 — Realtime limited to two channels — Accepted

Postgres Changes on `tasks` (per project) and `notifications` (per user). Everything else uses request-time reads and revalidation. Reason: realtime subscriptions cost connections and complexity; the OS is a team tool where a refresh-on-change on the board and a live badge give 90% of the perceived liveness. Presence, live cursors, and document collaboration are out of scope.

## ADR-010 — Storage via Supabase Storage with row-first uploads — Accepted

Attachment rows are created by a Server Action (authorised) before a signed upload URL is issued; storage policies verify the path against the row. Alternatives: S3 direct (another vendor and IAM surface); storing files in Postgres (no). Public `avatars`, private `attachments`, private `org-assets`.

## ADR-011 — Document editor: Tiptap with JSON storage; code-defined templates; print-CSS export — Accepted

**Options.** Tiptap/ProseMirror; Lexical; Markdown textarea; Slate; BlockNote.
Tiptap: mature, headless (styles with our tokens), extensible custom nodes (`dataBlock`), JSON output that is portable and searchable after extraction, React bindings. Lexical: capable but younger ecosystem for tables/collab. Markdown-only: too limited for professional client documents (tables, data blocks). Templates as TypeScript functions (unit-testable, versioned in git) rather than DB templates (would need an editor for templates — no present need). Export via HTML + print CSS (zero dependencies) now; server PDF later. Collaboration (Y.js) deferred.

## ADR-012 — GitHub App for integration — Accepted

See `architecture/integrations.md`. Rejected PATs (long-lived, personal, broad) and user OAuth tokens (stored secrets acting as users). GitHub App gives least-privilege, short-lived tokens, organisation-level installation, webhooks. Cost: a human must register the app (open decision OD-4).

## ADR-013 — Activity/notification fan-out in a `security definer` SQL function — Accepted

`emit_event()` inserts activity and notifications atomically, resolving recipients from DB data, without the service role in Server Actions and without triggers guessing intent. Alternatives: app-level inserts (RLS blocks inserting notifications for others; would need service role), triggers (noisy, no intent). Event vocabulary and rendering stay in TypeScript.

## ADR-014 — Analytics: Vercel Web Analytics on marketing only — Accepted

Cookie-less, aggregate, no consent banner, no third-party script weight. Nothing on `/os` (internal usage is visible through activity; no tracking of staff). Alternative Plausible is equivalent; Vercel chosen for zero setup. Google Analytics rejected (consent burden, privacy).

## ADR-015 — Health derived, `At Risk` not a status — Proposed (needs approval)

Deviation from the brief. Rationale in `product/project-lifecycle.md`. Approval item OD-2.

## ADR-016 — Invite-only, no public sign-up; email/password + magic link in v1 — Proposed (needs approval)

An internal operating system should not have a sign-up page. GitHub OAuth deferred to avoid account-linking edge cases in v1. Approval item OD-3.

## ADR-017 — Single Next.js app, OS under `/os` path (not a subdomain) — Proposed (needs approval)

One deployment, shared cookies and components, simple auth redirects. A subdomain (`app.malhot.tech`) would need cookie domain configuration and either two Vercel projects or rewrites. Path prefix is simpler; can be revisited. Approval item OD-5.

## ADR-018 — Package manager: npm — Accepted

npm 11 is installed and Vercel-native. pnpm is faster and stricter but not installed; the difference is marginal at this repo size. Switchable at any time (lockfile swap).

## ADR-019 — Testing stack: Vitest, Testing Library, pgTAP, Playwright — Accepted

Vitest for speed and TS-native config; pgTAP for triggers/functions where the behaviour lives in SQL; Playwright for e2e with multi-viewport projects and axe integration. Jest/Cypress rejected as slower/heavier for equal value.

## ADR-020 — Forms: React Hook Form + Zod, shared schemas — Accepted

One schema validates in the browser and in the Server Action; RHF handles field state and accessibility wiring efficiently. Alternatives (Formik, native `useActionState` only) offer less for complex forms (wizard, task panel). Server-side validation is mandatory regardless.

## ADR-021 — Marketing content as typed files in the repo — Accepted

MDX case studies + TS content modules; PR-reviewed; static; no CMS cost. Revisit when non-engineers need to publish frequently (see roadmap).

## ADR-022 — Scheduled work via Vercel Cron; webhooks processed inline with persisted retry — Accepted

No queue infrastructure for v1. `webhook_events` gives idempotency and replay; cron retries failures. Trigger to introduce a queue (pgmq/Supabase Queues): webhook processing regularly exceeding 2 s or failing under bursts.

## ADR-023 — Error tracking with Sentry — Accepted

Server + client error capture with PII scrubbing, release tracking via source maps. Alternatives (Vercel logs only) lack grouping/alerting. Free/developer tier is sufficient initially.

## ADR-024 — Typography: Geist Sans + Geist Mono; accent colour provisional — Proposed (needs approval)

One family across website and OS for cohesion; open-source and self-hosted. Accent (cobalt) chosen in the absence of brand guidelines. Approval item OD-6.
