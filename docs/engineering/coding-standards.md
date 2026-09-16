# Coding Standards

Priority order when standards conflict: **Correctness → Simplicity → Maintainability → Scalability → Performance → Elegance.**

## TypeScript

- `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `verbatimModuleSyntax`.
- No `any`. `unknown` at boundaries, narrowed with Zod or type guards.
- Prefer `type` aliases for data shapes, `interface` only when extension by declaration merging is intended (rare).
- Derive types from the source of truth: database types from `types/database.ts`, form types from Zod (`z.infer`). Never hand-write a type that mirrors a schema or table.
- Discriminated unions for results and states (`ActionResult`, `{ status: 'idle' | 'loading' | 'error' }`), not boolean flag soups.
- `readonly` for props and arrays that are not mutated. Immutability by default.
- Named exports only (except Next.js route files that require default exports).
- `import type` for type-only imports.
- Enum-like values come from the generated database enums; do not redefine string unions by hand.

## React / Next.js

- Server Components by default. `'use client'` only with a reason (event handlers, state, browser API, client-only library).
- Components ≤ ~150 lines; split by responsibility, not by line count alone. A component does one of: fetch and compose (server), present (pure), or interact (client island).
- Props are explicit; avoid passing whole database rows to presentational components — pass the fields they render.
- No `useEffect` for data fetching. No `useEffect` for derived state (compute during render or `useMemo`). Effects are for synchronising with external systems only (Realtime subscriptions, `beforeunload`).
- Keys are stable ids, never indices, for reorderable lists.
- Forms: React Hook Form + Zod resolver; Server Action re-validates. Field-level errors from the server are mapped back.
- Accessibility lint (`jsx-a11y`) errors block CI.
- Images via `next/image`; fonts via `next/font`; links via `next/link`.
- Metadata via `generateMetadata`; OS routes `robots: { index: false }`.

## Styling

- Tailwind utility classes with the token names (`bg-surface`, `text-fg-muted`, `border-border`). No raw colour values in components.
- `cn()` for conditional classes. Variant components via `class-variance-authority` (as shadcn does).
- No inline `style` except for computed geometry (timeline bar widths).
- No custom CSS files per component; global `tokens.css`, `globals.css`, `print.css` only.

## Server Actions and data

- Every action: validate → authenticate → authorise → mutate → emit → revalidate → return `ActionResult`. Never skip a step; the `withAction` wrapper shape makes skipping visible.
- Actions never use the service-role client (ESLint restricted import).
- Queries select explicit columns. Use `.returns<T>()`/generated types; no `as` casts of query results.
- One round-trip per logical read where possible (joins/embeds or SQL functions), `Promise.all` for independent reads.
- Never trust `FormData` shapes; convert to an object then parse with Zod.

## SQL

- Lowercase keywords, snake_case identifiers, one statement per line block, commented header per migration (purpose, reversal notes).
- Every table: `enable row level security` in the same migration that creates it, with at least a select policy, before any data exists.
- Functions: `language sql` or `plpgsql`, `stable`/`immutable` where true, `security definer` only for authorisation helpers and `emit_event`, always `set search_path = public`.
- Triggers raise `MALHOT:<code>:<detail>`.
- No business logic in SQL beyond invariants, transitions, aggregates and fan-out rules documented in `docs/database`.

## Errors and logging

- Expected failures return values; unexpected failures throw and are caught at boundaries (`withAction`, `error.tsx`, route handler try/catch).
- Log with structured fields (`logger.warn('webhook.failed', { deliveryId, error })`), never string-concatenated PII.
- No `console.log` in committed code; `logger` wraps console in dev and Sentry breadcrumbs in prod.

## Comments and docs

- Comments explain *why* or a non-obvious constraint; never restate the code.
- Public functions in `lib/` and `features/*/lib` have a one-line JSDoc summary when the name is not self-explanatory.
- Update `docs/` in the same PR as the behaviour change.

## Testing (see `testing-strategy.md`)

- Pure logic has unit tests next to it (`*.test.ts`).
- Every bug fix ships with a test that would have caught it.
- Tests describe behaviour ("viewer cannot move task to done"), not implementation.

## Dependencies

- Add a dependency only when it replaces meaningful code and is maintained. Record notable additions in `planning/technical-decisions.md`.
- Pin exact versions in `package.json` (no `^`) for framework and infrastructure libraries; Renovate/Dependabot weekly grouped updates.
- `npm audit` high/critical blocks CI.

## Git and review

`git-workflow.md`. Review checklist:

1. Does it do what the issue asks, fully (all states, permissions, tests, docs)?
2. Could it be simpler?
3. Is authorisation enforced in the action **and** the database?
4. Are loading/empty/error states present?
5. Does it match the design tokens and UX principles?
6. Are names clear to someone who did not write it?
7. Is anything logged or stored that should not be?

## Tooling

- ESLint (flat config): `next/core-web-vitals`, `@typescript-eslint` strict-type-checked, `jsx-a11y`, `import` (no-restricted-paths for module boundaries), custom rule banning `lib/supabase/admin` outside allowed paths.
- Prettier with Tailwind plugin (class sorting).
- `tsc --noEmit`, `eslint`, `prettier --check`, `vitest`, `supabase db lint` in CI.
- Husky + lint-staged pre-commit: prettier + eslint on staged files (fast; full checks in CI).
