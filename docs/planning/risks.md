# Risks

Ranked by (likelihood × impact). Each has an owner role, a mitigation already designed in, and a signal to watch.

| # | Risk | L | I | Mitigation (designed in) | Signal | Owner |
|---|---|---|---|---|---|---|
| R1 | **RLS mistake exposes data across projects/roles** | M | H | RLS on every table before data; policy matrix as integration tests per role; `security definer` helpers tiny and read-only; no service role in actions; manual escalation attempts in Phase 10 | Any RLS test failure; any `select('*')` in review | Backend |
| R2 | **Scope creep — the OS tries to be everything** | H | H | `mvp-scope.md` in/out lists with explicit triggers; feature docs have "out of scope" sections; Definition of Done makes half-features visible | Phase slipping > 50% of estimate; new tables not in schema.md | PM |
| R3 | **Two sources of truth (status vs health vs stage)** | M | M | Only `status` stored; health/stage derived with one implementation each (TS + SQL tested on shared fixtures) | Divergent numbers between dashboard and reports | Backend |
| R4 | **GitHub App registration/permissions blocked or delayed** | M | M | Integration isolated in Phase 8; fixtures allow full testing without GitHub; manual task linking still works without the app | Phase 8 waiting on human action | Admin/Owner |
| R5 | **Webhook processing failures leave stale caches** | M | L | Persist-then-process, idempotent deliveries, cron retry, nightly reconciliation, manual sync | `webhook_events` with `attempts ≥ 3` | Backend |
| R6 | **Notification spam erodes trust in the bell** | M | M | Activity vs notification separation; rules table; dedupe/collapse; preferences | Users disabling types; unread counts growing unbounded | PM |
| R7 | **Board/Editor client bundles bloat the OS** | M | M | Lazy-load dnd-kit/Tiptap per route; bundle budget in CI | Budget check failing | Frontend |
| R8 | **Real content for the website arrives late** | H | M | Website built with clearly-marked placeholders; content gap list produced in Phase 2; launch gated on real content | `TODO-CONTENT` markers remaining at Phase 10 | Marketing |
| R9 | **Brand (colour/logo/domain) undecided** | M | L | Tokens make accent a one-line change; logo slot abstracted | OD-6 unresolved past Phase 2 | Owner |
| R10 | **Supabase free-tier pausing or missing backups in production** | L | H | Pro plan mandated before go-live; restore rehearsal in Phase 10 | Project paused; no backups listed | Owner |
| R11 | **Next.js/Tailwind/shadcn version churn breaks scaffold assumptions** | M | L | Pin versions; verify `proxy.ts` vs `middleware.ts` naming and Tailwind v4 config at scaffold; upgrade deliberately | Build warnings after upgrades | Frontend |
| R12 | **Polymorphic entity references orphaned** | M | L | `project_id` on the row; app validation; cron cleanup for orphans; renderers tolerate missing targets | Renderer fallbacks appearing frequently | Backend |
| R13 | **Optimistic UI diverges from server (positioning, concurrent moves)** | M | L | Last-write-wins accepted; realtime refresh; re-spacing routine; reducer unit tests | Cards jumping after refresh | Frontend |
| R14 | **Trigger-enforced rules produce opaque errors** | M | M | Stable `MALHOT:` error codes mapped to human messages; tests for each trigger path | Generic error toasts in QA | Backend |
| R15 | **Cron runs missed or duplicated** | L | M | Idempotent jobs (`overdue_notified_at`); monitoring of last run timestamp on `/api/health` | Health shows stale cron | Backend |
| R16 | **Single-org assumption leaks into code** | M | L | `organization_id` everywhere; helpers take org id; no hardcoded org | `select ... limit 1` on organizations outside bootstrap | Backend |
| R17 | **Team adoption — the OS is not used daily** | M | H | Dogfood from Phase 3; My Work first on dashboard; keyboard speed; GitHub linking gives developers a reason to visit | Activity volume flat after launch | PM |
| R18 | **Editor autosave conflicts lose edits** | L | M | Conflict banner; versions on approval; retry queue; no simultaneous editing expected | Reports of lost text | Frontend |
| R19 | **Accessibility regressions** | M | M | jsx-a11y lint, axe in e2e, Radix primitives, keyboard specs | axe violations in CI | Frontend |
| R20 | **Cost creep (Vercel/Supabase/Sentry)** | L | L | Documented plan expectations; monthly review | Invoices above expectation | Owner |

## Assumptions (to be validated; each is a risk if false)
- Team size stays ≤ 20 users and ≤ 100 projects over the design horizon.
- Malhot uses GitHub (organisation account) for all client code.
- One legal entity/brand (single organisation).
- Team timezone Africa/Kigali; working week Monday to Friday (affects "due today" and cron timing).
- Clients do not need OS access in v1.
- The website domain will be under Malhot's control with DNS on a provider that supports Vercel.
