# Error Handling

## Taxonomy

| Class | Examples | Treatment |
|---|---|---|
| **Validation** | bad input, missing field, invalid transition requested | Return to the user with field-level or form-level messages. Not logged as errors. |
| **Authorisation** | not a member, wrong role, archived project | Return `forbidden` with an explanatory message. Logged at `info` (possible probing). |
| **Not found** | deleted task, wrong key | `notFound()` in RSC → `not-found.tsx`; `fail('not_found')` in actions. |
| **Conflict** | unique violation (duplicate key), stale update | Return `conflict` with a specific message ("Project key MAL is already in use"). |
| **Invariant (DB trigger)** | `MALHOT:invalid_transition:...` | Mapped to `invalid_transition` / `forbidden` / `invariant` with the detail as message. |
| **External** | GitHub API down, Storage failure | Return `external` with a retry hint; log at `warn` with context; webhook path stores error for retry. |
| **Unexpected** | bug, network to DB | Caught at boundary, logged to Sentry with a reference id, user sees a generic message with the id. |

## Server Actions

```ts
type ActionErrorCode =
  | 'validation' | 'unauthenticated' | 'forbidden' | 'not_found' | 'conflict'
  | 'invalid_transition' | 'invariant' | 'rate_limited' | 'external' | 'unexpected'

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ActionErrorCode; message: string; fieldErrors?: Record<string, string[]>; ref?: string } }
```

- `withAction(name, fn)` wraps every exported action: catches thrown errors, maps known Postgres errors (`23505` unique → conflict, `23503` FK → validation, `P0001` with `MALHOT:` prefix → mapped code), logs unexpected ones with a generated `ref` (short id) and returns `fail('unexpected', ref)`.
- `unauthenticated` is not returned; `requireViewer()` redirects to `/login?next=…` (via `redirect()`, which throws and is allowed to propagate).
- Messages are written for humans per `design/ux-principles.md` (what / why / what next). Codes are for programmatic handling (e.g. `conflict` on `key` focuses the key field).

## Postgres error mapping

`lib/actions/db-errors.ts` maps `PostgrestError`:

| Postgres | ActionErrorCode | Message strategy |
|---|---|---|
| `23505` unique_violation | `conflict` | constraint name → friendly message table |
| `23503` foreign_key_violation | `validation` | "Referenced item no longer exists" |
| `23514` check_violation | `validation` | constraint name → message |
| `P0001` + `MALHOT:forbidden:*` | `forbidden` | detail |
| `P0001` + `MALHOT:invalid_transition:*` | `invalid_transition` | detail |
| `P0001` + `MALHOT:invariant:*` | `invariant` | detail |
| `42501` insufficient_privilege / RLS (0 rows affected on update) | `forbidden` | generic (do not disclose row existence) |
| other | `unexpected` | generic + ref |

Note: an RLS-blocked `update` returns success with zero rows. Repo helpers use `.select().single()` after writes and treat `PGRST116` (no rows) as `forbidden`/`not_found` (indistinguishable by design).

## React boundaries

- `app/(os)/error.tsx`: OS-level fallback with "Try again" (calls `reset()`), reference id, link home. Keeps the shell.
- Segment-level `error.tsx` for project, document editor, board so one failing widget does not take down the page.
- `global-error.tsx`: last resort, minimal markup, still branded.
- `not-found.tsx` at root, `(os)`, `[key]`, task, document, bug segments with entity-aware messages.
- Widgets on the dashboard are wrapped individually in `<ErrorBoundary fallback={<WidgetError />}>` (client boundary) so a failing report does not hide My Work.

## Route Handlers

- Always `try/catch`; respond with JSON `{ error: { code, message, ref } }` and correct status (400/401/403/404/409/429/500).
- Webhooks: after persisting the delivery, always 200 (errors stored for retry). Signature failure → 401 with no body detail.
- Cron: 200 with a summary; failures per job are collected, not thrown, so one job cannot block others; overall status 207-like semantics expressed in the body.

## Client-side

- Failed actions → toast (error) with retry where the action is idempotent; forms show field errors inline and a summary region receives focus.
- Network offline detection: `navigator.onLine` + fetch failure → specific message; state preserved.
- Realtime disconnect → silent reconnect (supabase-js handles); if disconnected > 30 s show a subtle "Live updates paused" indicator.
- Uncaught client errors → Sentry with user id (no email) and route.

## Logging

- `lib/logger.ts`: `debug/info/warn/error(event: string, fields?: Record<string, unknown>)`. In production: `warn`/`error` → Sentry breadcrumb/event; `info` → Vercel logs (sampled).
- Never log: tokens, passwords, cookies, full request bodies, email addresses (hash if needed), document content.
- Every unexpected error gets a `ref` (8-char base32) shown to the user and attached to the Sentry event as a tag for lookup.

## Guarantees the user can rely on
1. No blank screens: every route segment has an error and not-found fallback.
2. No silent failures: every failed mutation is visible.
3. No leaked internals: no stack traces, SQL, or constraint names reach the UI.
4. No lost work on failure: forms and editors retain their state.
