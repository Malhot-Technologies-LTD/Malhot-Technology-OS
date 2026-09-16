# Git Workflow

Process proportional to a five-person team: enough to keep `main` always deployable, no more.

## Branches

```text
main            always releasable; deploys to production on merge
feature/<key>-<slug>   e.g. feature/MAL-12-task-board
fix/<key>-<slug>       e.g. fix/MAL-40-overdue-double-notify
chore/<slug>           tooling, deps, docs-only
```

No long-lived `develop` branch: with preview deployments per PR and a staging database, an integration branch adds merge overhead without adding safety. If release batching ever becomes necessary (e.g. coordinated client launches), introduce `release/*` branches then.

Task keys in branch names come from the OS itself once it is running (the platform is dogfooded: the Malhot OS build is a project in Malhot OS). Until then, use short descriptive slugs.

## Commits

- Small, atomic, message explains *why*. Imperative mood, ≤ 72 chars subject, body when non-obvious.
- Conventional prefixes for grep-ability: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `db:` (migrations).
- Never commit secrets, generated `.next`, `node_modules`, `.env.local`. `types/database.ts` **is** committed (generated, reviewed).
- Commits made with AI assistance carry the attribution trailer configured for the session.

## Pull requests

- One logical change per PR. Prefer several small PRs over one large one.
- Template: What / Why / How to test / Screenshots (UI) / Checklist (states, permissions, tests, docs, migration compatibility).
- Preview deployment link is auto-posted by Vercel.
- CI must be green (`engineering/testing-strategy.md`).
- **Review:** at least one approval from another team member. Migrations, RLS and permission changes require review by whoever owns backend (Kenny) or the tech lead. UI changes to the design system require the frontend owner (Levi).
- Squash-merge; PR title becomes the commit subject.
- Delete branch on merge.

## Migrations in PRs

- One migration per PR where possible; named for the change.
- PR description states backward compatibility and the reversal approach.
- `types/database.ts` regenerated in the same PR (CI diff check).
- Docs in `docs/database` updated in the same PR.

## Hotfixes

`fix/*` from `main`, same PR process, expedited review. No direct pushes to `main` (branch protection).

## Branch protection (`main`)

Require PR, require CI status checks, require 1 approval, dismiss stale approvals on push, no force push, linear history.

## Tags and releases

Not needed while deployment is continuous. If client-facing changelogs become useful, adopt `v<major>.<minor>` tags generated from merged PR titles.
