# Backend Architecture

There is no separate backend service. "Backend" means the server side of the Next.js application plus Postgres. This document defines how that server side is organised so it stays disciplined.

## Three server entry points

| Entry point | Used for | Auth | Supabase client |
|---|---|---|---|
| **Server Actions** | All user-initiated mutations from the UI | Session cookie (user) | User-scoped (RLS enforced) |
| **Route Handlers** | Webhooks, cron, GitHub App callback, document export, health | Signature / bearer secret / session | Admin (service role) for webhooks & cron; user-scoped for export |
| **RSC data loading** | Reads for pages | Session cookie | User-scoped |

Rule: **a Server Action never uses the service-role client.** If a user flow needs elevation (e.g. accepting an invitation before membership exists), it is a narrowly-scoped function under `lib/supabase/elevated/` (the only code besides `app/api/` and `scripts/` allowed to import `lib/supabase/admin.ts`) with its own input validation, called from the action, and documented here:

| Elevated operation | Why elevation is needed |
|---|---|
| `acceptInvitation(tokenHash, userId)` | User has no membership yet, so RLS would hide the invitation and block the insert |
| `createInquiry(input)` | Anonymous website visitor; no session |
| `processWebhookEvent(delivery)` | GitHub, not a user |
| `runDailyJobs()` | Cron, not a user |
| `bootstrapOrganisation(ownerUserId)` | First-run only, guarded by "no organisation exists" |
| `listAccessRequests(requesterUserId, orgId)` | People who signed up have no membership, so the `profiles` policy hides them and their email lives in `auth.users`; re-checks the requester is an org admin |
| `rejectAccessRequest(requesterUserId, orgId, targetUserId)` | Deleting an auth user needs the Admin API; re-checks org admin and refuses anyone who is already a member |

## Server Action contract

Every action in `features/<feature>/actions.ts`:

```ts
'use server'
export async function updateTaskStatus(input: unknown): Promise<ActionResult<Task>> {
  const parsed = updateTaskStatusSchema.safeParse(input)          // 1. validate
  if (!parsed.success) return fail('validation', parsed.error)
  const viewer = await requireViewer()                            // 2. authenticate (throws → redirect to /login)
  const ctx = await getProjectContext(parsed.data.projectId)      // 3. load minimal context (role)
  if (!can(viewer, 'task.change_status', ctx)) return fail('forbidden')   // 4. authorise
  const result = await taskRepo.updateStatus(...)                 // 5. mutate (user-scoped client; RLS is the backstop)
  if (result.error) return fail(mapDbError(result.error))
  await recordActivity({...}); await notify({...})                // 6. side effects (same request)
  revalidatePath(`/os/projects/${ctx.key}/tasks`)                 // 7. revalidate
  return ok(result.data)
}
```

- `ActionResult<T> = { ok: true; data: T } | { ok: false; error: { code: ActionErrorCode; message: string; fieldErrors?: Record<string,string[]> } }`.
- Actions never throw for expected failures; they return `fail(...)`. Unexpected errors are caught by a wrapper `withAction()` that logs to Sentry and returns `fail('unexpected')`.
- Actions accept plain objects (or `FormData` converted at the boundary), never class instances.
- Actions are small; business logic that is reused (e.g. cycle detection for dependencies, health computation) lives in `features/<x>/lib/*.ts` as pure functions with unit tests.

## Data access layer

`features/<feature>/queries.ts` (reads) and `features/<feature>/repo.ts` (writes) wrap supabase-js calls, typed by generated types. They:

- Select explicit columns (never `select('*')` in production paths).
- Apply `.is('deleted_at', null)` for soft-deleted tables via a shared helper.
- Return `{ data, error }` untouched from supabase-js so callers map errors consistently.

Complex reads (dashboard counts, reports, health) are Postgres functions (`rpc`) or views, not many round-trips from Node.

## Activity and notification pipeline

Single helper module `lib/events/`:

```ts
await emit({
  type: 'task.assigned',
  actorId, organizationId, projectId,
  entity: { type: 'task', id: task.id },
  metadata: { assigneeId, previousAssigneeId, taskKey: 'MAL-42' },
})
```

`emit()` validates the event shape (Zod, per event type) and calls one Postgres function, `emit_event(event jsonb)`, with the **user-scoped client**. The function is `security definer` and:

1. Verifies the caller is a member of the event's project/organisation (rejects otherwise).
2. Inserts the `activities` row (always).
3. Resolves recipients with `notification_recipients(event)` — assignee, reviewer, project QA members, project manager, org admins, mentioned users — per a static rule table keyed by event type.
4. Applies anti-spam: never notify the actor about their own action; skip if an identical (user, type, entity) unread notification exists from the last 10 minutes; collapse bulk assignment (> 3 in 2 min by the same actor → one summary notification).
5. Inserts `notifications` rows.

All of this is one transaction. It runs in the same request as the mutation, immediately after it; a failure in `emit_event` is logged and surfaced as a warning but does not roll back the user's mutation (supabase-js has no multi-statement transaction from Node). If that guarantee is ever needed, the mutation itself moves into the same SQL function.

Why SQL for fan-out rather than TypeScript? Recipients depend on DB data (who is QA on this project), notifications must be inserted for *other* users (which a user-scoped RLS policy would reject), and putting it in a definer function keeps the service role out of Server Actions. The TypeScript side owns the event vocabulary (`lib/events/types.ts`), metadata shaping, and the human-readable rendering of activity in the UI.

Why not DB triggers for activity? Triggers cannot know the *reason* (comment text on a status move, "changes requested") or the actor's UI context, and they generate noise for every column touch. Explicit emission from actions keeps the feed meaningful. Triggers are reserved for invariants.

## Route Handlers

### `POST /api/webhooks/github`
1. Read raw body; verify `X-Hub-Signature-256` (HMAC SHA-256, constant-time compare). Reject 401 otherwise.
2. Insert `webhook_events` (`delivery_id` unique; conflict → 200 "duplicate").
3. `processWebhookEvent()` switch on `X-GitHub-Event`: `installation`, `installation_repositories`, `issues`, `pull_request`, `push`, `deployment_status`. Each handler upserts cache rows, links tasks by `KEY-n` regex, emits activity.
4. Mark processed or store error. Always return 200 after step 2 so GitHub does not retry storms; failures are retried by cron.

### `GET /api/github/setup`
GitHub redirects here after installation with `installation_id`, `setup_action`, `state`. Validate `state` (signed, contains org id + admin user id, 10-minute expiry), verify the installation via App JWT, store `github_installations`, redirect to Settings → Integrations.

### `GET /api/cron/daily`
Requires `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron sends it). Runs `runDailyJobs()` (see `product/workflows.md#w9`). Idempotent; safe to run twice.

### `GET /api/export/documents/[id]`
Session required; permission checked; renders document JSON → HTML with print stylesheet. `?format=html` (default). PDF via server renderer is roadmap.

### `GET /api/health`
Returns `{ ok: true, db: true }` after `select 1`. No auth. Used by uptime monitor.

## Validation

- Zod at every boundary: Server Action inputs, Route Handler bodies/query, webhook payload shapes (narrow: only the fields we use), environment variables (`lib/env.ts`, fails fast at boot).
- Database constraints mirror the essential rules (NOT NULL, CHECK on text length and enums, FKs, unique). Application validation gives good messages; the database guarantees integrity.

## Rate limiting

- Contact form: 5 submissions / hour / IP hash (in Postgres via `inquiry_rate_limits` upsert — no Redis dependency).
- Auth: Supabase Auth built-in limits.
- Server Actions: not rate-limited beyond auth in v1 (internal users).

## Security boundaries checklist (server)

- Service-role key only in `lib/supabase/admin.ts`, which imports `server-only`. ESLint rule forbids importing it outside `lib/`, `app/api/`, and the elevated functions listed above.
- GitHub private key loaded from env (base64) and used only in `lib/github/app.ts`.
- All Route Handlers set `export const runtime = 'nodejs'` (crypto, Octokit); `dynamic = 'force-dynamic'`.
- Webhook handler reads the raw body before JSON parsing (signature is over raw bytes).
- Never log request bodies containing tokens or personal data; Sentry `beforeSend` scrubs emails and auth headers.
