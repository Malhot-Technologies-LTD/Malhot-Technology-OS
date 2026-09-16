# Testing Strategy

Test behaviour and contracts, not implementation. Fast tests run on every change; slow tests run in CI on every PR; the whole suite must be trusted or fixed.

## Layers

| Layer | Tool | Scope | Runs |
|---|---|---|---|
| **Unit** | Vitest | pure logic: `permissions.ts`, status machines, health/stage computation, cycle detection, event shaping, document templates, URL state parsing, `useOptimistic` reducers, formatting | pre-commit (staged), CI |
| **Component** | Vitest + Testing Library + jsdom | interactive client components in isolation: forms (validation, error mapping), board move menu, filter bar, editor toolbar | CI |
| **SQL** | pgTAP via `supabase test db` | triggers (status rules, sequences, last-owner), helper functions, `emit_event` recipients and anti-spam, `project_health()` against fixtures | CI when `supabase/` changes |
| **Integration (RLS + actions)** | Vitest against local Supabase (Docker) | for each role fixture, S/I/U/D per policy matrix; Server Actions invoked directly with a mocked session; webhook processing with recorded payloads | CI |
| **End-to-end** | Playwright | critical user journeys through the real UI against `next start` + local Supabase | CI on PR (chromium), nightly (all browsers + viewports) |
| **Accessibility** | `@axe-core/playwright` inside e2e | key pages have zero serious/critical violations | CI |
| **Visual** | Playwright screenshots (tokens page, key components, marketing home) | detect unintended visual drift | CI, manual approval of diffs |
| **Performance** | Lighthouse CI on marketing routes; bundle analyzer on OS routes | budgets in docs | CI on PRs touching those paths |

## Critical e2e journeys (minimum, from the brief)

1. Login (password), login (magic link via Inbucket/local mail), logout, protected redirect
2. Accept invitation → lands in OS with role
3. Create project via wizard → activate (readiness enforced)
4. Add goal; create MVP item linked to goal
5. Create task; assign; move through statuses; `testing → done` blocked for developer when `qa_required`, allowed for QA
6. Complete task → parent/subtask rule; dependency cycle rejected
7. Create milestone; timeline shows it; overdue styling
8. Create test case; run; fail → bug created and linked; fix → retest → close
9. Create document from template; edit; submit; approve → version created; approved doc read-only
10. Connect GitHub (mocked App API) → repo listed; webhook fixture links PR to task
11. Permission restrictions: viewer sees no create buttons and direct action calls fail; non-member gets access-denied page
12. Website: home renders, navigation, contact form submit → enquiry appears in OS for admin
13. Notifications: assignment creates a notification; read state; no self-notification

## Fixtures

`tests/fixtures/` provides: role users (owner, admin, manager, developer, qa, marketer, viewer, outsider) created via Auth Admin against local Supabase; factories (`createProject`, `createTask`, …) that write through the admin client and return typed rows; `asUser(role)` returning a supabase-js client with that user's JWT for RLS tests; recorded GitHub webhook payloads (sanitised) in `tests/fixtures/github/*.json`.

Database reset per test file (`supabase db reset` is too slow per test; use a transaction-per-test helper for integration tests where possible, and truncate-in-order otherwise).

## Local mail
Supabase local ships Inbucket/Mailpit; e2e reads magic links and invites from its API.

## GitHub in tests
No real GitHub calls. `lib/github/octokit.ts` is injected; integration tests use a fake implementing the subset (`listInstallationRepos`, `getRepo`, `listIssues`, `listPulls`). Webhook signature tests compute HMAC with a test secret.

## Coverage stance
No global coverage gate (gates encourage padding). Instead: `lib/permissions.ts`, status-machine helpers, `emit` rules and templates must have 100% branch coverage (enforced per-file in Vitest config). Everything else is judged in review.

## CI pipeline (GitHub Actions, `ci.yml`)

```text
lint-typecheck  →  unit+component  →  db (supabase start, migrations apply, pgTAP, gen-types diff)
                                   →  integration (RLS, actions, webhooks)
                                   →  build  →  e2e (chromium, laptop viewport) → a11y → lighthouse (marketing)
```

Required to merge: everything green. Nightly: full browser/viewport matrix + visual snapshots.

## Definition of Done (testing part)
- New pure logic → unit tests.
- New table/policy/trigger → RLS integration rows + pgTAP for triggers.
- New Server Action → integration test for success + forbidden + validation.
- New critical journey → e2e spec.
- Bug fix → regression test.
