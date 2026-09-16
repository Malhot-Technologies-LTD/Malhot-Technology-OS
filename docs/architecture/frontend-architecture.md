# Frontend Architecture

## Framework decisions (summary; rationale in `planning/technical-decisions.md`)

- **Next.js App Router**, latest stable at scaffold time (16.x line as of writing; pin exact minor in `package.json`). React Server Components by default.
- **TypeScript strict**, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
- **Tailwind CSS v4** with design tokens as CSS variables (`design/design-system.md`).
- **shadcn/ui** (copied-in components on Radix primitives) + **Lucide** icons. Components are owned by the repo, not a dependency.
- **React Hook Form + Zod** for forms; the same Zod schema validates in the Server Action.
- **No client data-fetching library in v1.** RSC + Server Actions + `revalidatePath/Tag` + `useOptimistic` cover the needs; see `engineering/state-management.md`.

## Route groups

```text
app/
  layout.tsx                    html/body, fonts, theme provider, Toaster
  (marketing)/
    layout.tsx                  site header/footer
    page.tsx                    /
    about/  services/  work/  work/[slug]/  process/  contact/  privacy/
  (auth)/
    layout.tsx                  centred auth card, marketing branding
    login/  forgot-password/  reset-password/  invite/[token]/
    auth/callback/route.ts      code exchange → session cookie
  (os)/
    layout.tsx                  requires session + org membership; sidebar, topbar, notifications
    os/
      page.tsx                  dashboard
      projects/ ... /[key]/ ... (see product/malhot-os.md route map)
      my-tasks/ timeline/ documents/ testing/ team/ reports/ activity/ notifications/ settings/
  api/
    webhooks/github/route.ts
    github/setup/route.ts
    cron/daily/route.ts
    export/documents/[id]/route.ts
    health/route.ts
  sitemap.ts  robots.ts  opengraph-image.tsx
  not-found.tsx  error.tsx  global-error.tsx
```

Route groups give each surface its own layout and metadata without leaking OS chrome into marketing or vice versa. Marketing and auth share the "website" visual language; OS has its own shell.

## Server vs client components

Default: server. A component becomes `"use client"` only when it needs one of: event handlers, browser APIs, React state/effects, third-party client-only libraries (drag-and-drop, editor).

| Surface | Server | Client islands |
|---|---|---|
| Marketing | Everything | Mobile nav toggle, contact form, motion accents (respecting reduced motion) |
| Auth | Page shells | Forms |
| OS shell | Layout, sidebar links, data | Sidebar collapse, command palette, notification popover (realtime), theme toggle |
| Dashboard | All widgets | none (links only) |
| Project list | Table rows | Filter/sort controls (URL-state), row actions menu |
| Board | Column data | Board (dnd-kit), task quick-create, task side panel |
| Task detail | Read view | Inline editors (title, description, fields), comments composer, attachment uploader |
| Timeline | Data + static bars | Zoom/scroll controls, hover cards |
| Documents | Lists, viewer | Tiptap editor, status actions |
| Testing | Lists | Run execution grid (rapid pass/fail entry), bug forms |
| Settings | Everything | Forms |

Rule of thumb: the *data* arrives via server components as props; the *interaction* lives in a small client component. Avoid whole-page client components.

## Data flow

```text
RSC page ──► features/<x>/queries.ts ──► createServerClient() (user JWT) ──► Postgres (RLS)
   │                                                                             ▲
   └─► <ClientIsland data={...} />                                               │
            │ user interaction                                                   │
            └─► Server Action (features/<x>/actions.ts)                          │
                  parse (Zod) → authorise (permissions) → mutate ────────────────┘
                  → recordActivity/notify → revalidatePath/Tag
                  → return ActionResult
```

- Queries are colocated per feature and typed against generated `types/database.ts`.
- Pages never call `supabase` directly; they call query functions. This keeps the RLS-dependent SQL in one testable place.
- Shared context (viewer, org, project, role) is resolved once per request in layouts via `React.cache()`-wrapped helpers in `lib/auth/context.ts`, so pages and nested layouts can call `getViewer()` without duplicate round-trips.

## Caching strategy

- Marketing: static (`export const dynamic = 'force-static'`) with ISR where content depends on repo files only (rebuild on deploy is enough).
- OS: dynamic per request (cookies). `unstable_cache`/`"use cache"` is *not* used for user-scoped data — RLS results differ per user and cache poisoning risk outweighs benefit at this scale.
- Server Actions call `revalidatePath` for the affected routes (project page, board, dashboard). Tag-based revalidation is introduced only if path lists get unwieldy.

## Forms

- Schema in `features/<x>/schemas.ts` (Zod). Form component uses `useForm({ resolver: zodResolver(schema) })`. Server Action re-parses `FormData`/JSON with the same schema.
- Submit via `useActionState` (progressive enhancement where feasible) or `startTransition` + action call for richer UX.
- Field errors from server mapped back into RHF via `setError`.
- Every form: pending state on the submit button, inline field errors, a form-level error region with `role="alert"`, and success feedback (toast or inline).

## Optimistic updates

Used for: task status change/reorder, comment posting, notification read, MVP item toggle. Pattern: `useOptimistic` with the server result reconciling; on error, revert and toast with retry. Not used for: delete, archive, approve, status transitions of projects/bugs (pessimistic, with explicit confirmation).

## Realtime

Two hooks, both client-only and mounted only where relevant:
- `useProjectBoardRealtime(projectId)` — subscribes to `tasks` changes for the project; on event, debounced (500 ms) `router.refresh()`. Simple, correct, no client cache to reconcile.
- `useNotificationsRealtime(userId)` — subscribes to inserts on `notifications`; increments badge and prepends to the popover list.

No other subscriptions in v1.

## Accessibility baseline

- Radix primitives for dialogs, menus, popovers, tabs, tooltips (focus management, ARIA).
- Board: keyboard reordering via dnd-kit keyboard sensor + explicit "Move to…" menu on each card.
- All icon-only buttons have `aria-label`. Status colours always paired with text or icon.
- Colour contrast ≥ 4.5:1 for text, ≥ 3:1 for UI. `prefers-reduced-motion` disables non-essential motion.
- Skip-to-content link on every layout; landmarks (`header`, `nav`, `main`, `aside`).
- Automated checks: `eslint-plugin-jsx-a11y`, Playwright + `@axe-core/playwright` on key pages.

## Performance guardrails

- Route-level bundle budget for OS routes: < 250 kB gzipped first load (framework included). Editor and board libraries lazy-loaded (`next/dynamic`) only on their routes.
- `next/font` self-hosted fonts (Geist Sans, Geist Mono), `display: swap`.
- Lists paginated (server) at 50 rows; boards load all tasks of a project (bounded by product reality; add virtualisation if a project exceeds ~500 open tasks).
- No waterfalls: layouts fetch shared context once; pages issue independent queries in `Promise.all`.
- `@next/bundle-analyzer` in CI on PRs touching `app/(os)`.

## Theming

Light and dark for the OS via `data-theme` on `html` (default follows system; user override stored in profile and cookie for SSR). Marketing site is dark-dominant with defined light sections; it does not expose a toggle. Tokens: `design/design-system.md`.
