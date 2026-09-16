# State Management

## Principle

The server (Postgres, through RSC) is the source of truth for application data. The client holds only what the server cannot: in-progress input, transient UI state, and optimistic projections that are reconciled on the next server response.

## State categories and where they live

| Category | Examples | Location | Mechanism |
|---|---|---|---|
| **Persistent domain data** | projects, tasks, documents | Postgres | RSC queries per request; Server Actions mutate; `revalidatePath` refreshes |
| **Viewer context** | session, org, role | Server per request | `React.cache()` helpers in `lib/auth/context.ts`; passed as props |
| **View state (shareable)** | filters, sort, search, open task panel, board/list toggle, timeline zoom | URL search params | `useUrlState()` hook (nuqs-style, typed with Zod). Deep-linkable and survives refresh |
| **Ephemeral UI state** | dialog open, dropdown, hover, wizard current step | Component `useState` | Local only |
| **Cross-component client UI** | sidebar collapsed, command palette open, theme | React context (`UiProvider`) + cookie for SSR-relevant bits (theme, sidebar) | Small context; no store library |
| **Form state** | field values, validation, dirty | React Hook Form | Per form; wizard persists step data to `sessionStorage` keyed by wizard id |
| **Optimistic projections** | task moved on board, comment posted, notification read | `useOptimistic` next to the action call | Reconciled by server response + revalidation |
| **Live updates** | board changes by others, new notifications | Supabase Realtime → `router.refresh()` (board) / local prepend (notifications) | Two hooks only |
| **Editor content** | document body while editing | Tiptap editor state | Autosave action every 3 s idle; server is truth once saved |

## Why no client data cache library in v1

TanStack Query / SWR shine when many client components fetch overlapping data and need cache coherence. Here, pages are RSC, reads happen on the server, and mutations revalidate paths. Adding a client cache would create a second copy of truth to keep coherent with RSC payloads. Revisit if a screen emerges that genuinely needs client-side fetching (infinite scroll of activity is the likely first candidate; a small `useInfiniteList` over a Server Action can cover it).

## Why no Zustand/Redux

Cross-component client state is limited to shell UI. A context with two or three values is sufficient and obvious. A store would be a dependency and a pattern without a present-day need. If `UiProvider` grows beyond ~5 unrelated fields, split by concern before reaching for a library.

## Optimistic update pattern

```tsx
const [optimisticTasks, applyOptimistic] = useOptimistic(tasks, reduceTaskEvent)
function onMove(taskId, toStatus, toPosition) {
  startTransition(async () => {
    applyOptimistic({ type: 'move', taskId, toStatus, toPosition })
    const res = await updateTaskStatus({ projectId, taskId, toStatus, toPosition })
    if (!res.ok) toast.error(res.error.message, { action: retry })   // RSC re-render reverts automatically
  })
}
```

Rules: optimistic only for idempotent, low-risk, quickly-confirmable actions; the reducer is pure and unit-tested; errors surface with retry; never optimistic for deletes, approvals, or project/bug transitions.

## Realtime reconciliation

Board: on any change event for the project, debounce 500 ms then `router.refresh()`. The RSC re-render brings the authoritative state; `useOptimistic` discards pending projections that were confirmed. Simple and correct; the cost is one refresh per burst, acceptable at team scale. Notifications: insert events prepend to the popover list and increment the badge; the full list page still loads from the server.

## Server-side caching

None for user-scoped OS data (RLS-dependent). Marketing content is static. Expensive aggregates (dashboard counts, reports) are SQL functions returning in one round-trip; if any exceeds ~300 ms at real data volumes, add a materialised view refreshed by cron before adding application caching.

## URL state conventions

- Filters: `?status=in_progress,review&assignee=me&priority=high` (comma lists).
- Panels: `?task=MAL-42`, `?bug=MAL-B7`.
- Pagination: `?page=2`; sort: `?sort=due_date:asc`.
- Defaults are omitted from the URL. Parsing is tolerant: invalid values fall back to defaults, never error.
