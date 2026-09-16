# Malhot Platform — Documentation

This directory is the **source of truth** for the Malhot Technologies platform: the public company website and the authenticated internal operating system (Malhot OS), delivered as one product.

Rules of the documentation:

1. Decisions live here first. If an implementation decision conflicts with a document, update the document deliberately (and record why in `planning/technical-decisions.md`) — never silently diverge.
2. Docs describe *why* and *how to use*, not a restatement of code. Code that is self-describing does not get a mirror here.
3. Stale docs are deleted with the same discipline as dead code.
4. Every feature document follows the same shape: purpose → data → permissions → workflows → UI → states → out of scope.

## Reading order (new engineer)

1. `product/product-overview.md` — what this is and why
2. `architecture/system-architecture.md` — how the pieces fit
3. `product/user-roles.md` + `architecture/authorization.md` — who may do what
4. `database/schema.md` — the data model (DDL blueprint)
5. `engineering/folder-structure.md` + `engineering/coding-standards.md` — how code is organised
6. `planning/implementation-phases.md` — what to build next

## Index

### Product
| Doc | Purpose |
|---|---|
| [product-overview.md](product/product-overview.md) | Company, platform, principles, problems solved / not solved |
| [public-website.md](product/public-website.md) | Marketing site information architecture and content model |
| [malhot-os.md](product/malhot-os.md) | OS scope, navigation, screens |
| [user-roles.md](product/user-roles.md) | Role model and permission matrix |
| [project-lifecycle.md](product/project-lifecycle.md) | Idea → archived, stage-by-stage |
| [workflows.md](product/workflows.md) | Cross-feature operational workflows |

### Architecture
| Doc | Purpose |
|---|---|
| [system-architecture.md](architecture/system-architecture.md) | End-to-end system view, responsibilities per layer |
| [frontend-architecture.md](architecture/frontend-architecture.md) | Next.js App Router strategy, RSC/client boundaries, data flow |
| [backend-architecture.md](architecture/backend-architecture.md) | Server Actions, Route Handlers, background jobs, activity/notification pipeline |
| [database-architecture.md](architecture/database-architecture.md) | Postgres conventions, migrations, types, soft delete, indexes |
| [authentication-architecture.md](architecture/authentication-architecture.md) | Supabase Auth, sessions, invites, route protection |
| [authorization.md](architecture/authorization.md) | Two-layer role model, permission module, RLS, defense in depth |
| [integrations.md](architecture/integrations.md) | GitHub App, email, cron, storage, future integrations |

### Database
| Doc | Purpose |
|---|---|
| [schema.md](database/schema.md) | Full DDL blueprint (enums, tables, indexes, triggers, functions) |
| [entities.md](database/entities.md) | Business meaning and rules per entity |
| [relationships.md](database/relationships.md) | ERD and cardinalities |
| [rls-policies.md](database/rls-policies.md) | Row Level Security design and per-table policies |

### Design
| Doc | Purpose |
|---|---|
| [design-system.md](design/design-system.md) | Tokens, typography, colour, components, motion |
| [ux-principles.md](design/ux-principles.md) | Interaction principles, states, accessibility |
| [responsive-strategy.md](design/responsive-strategy.md) | Breakpoints and per-surface responsive behaviour |

### Engineering
| Doc | Purpose |
|---|---|
| [coding-standards.md](engineering/coding-standards.md) | TypeScript, React, SQL, naming, review checklist |
| [folder-structure.md](engineering/folder-structure.md) | Repository layout and feature-module contract |
| [state-management.md](engineering/state-management.md) | Server state, client state, optimistic updates, realtime |
| [error-handling.md](engineering/error-handling.md) | Error taxonomy, boundaries, action results, logging |
| [testing-strategy.md](engineering/testing-strategy.md) | Unit / integration / RLS / e2e, CI gates |
| [deployment.md](engineering/deployment.md) | Environments, Vercel, Supabase, release and rollback |
| [environment-variables.md](engineering/environment-variables.md) | Every variable, its scope, and where it lives |
| [git-workflow.md](engineering/git-workflow.md) | Branches, PRs, commits, review requirements |

### Features
| Doc | Purpose |
|---|---|
| [dashboard.md](features/dashboard.md) | OS home |
| [projects.md](features/projects.md) | Project list, creation wizard, overview, health |
| [goals-and-mvp.md](features/goals-and-mvp.md) | Goals, MVP items, traceability to tasks |
| [tasks.md](features/tasks.md) | Board, task detail, My Tasks, subtasks, dependencies, comments |
| [timelines.md](features/timelines.md) | Milestones and timeline views |
| [testing.md](features/testing.md) | Test cases, runs, results, bugs |
| [documents.md](features/documents.md) | Editor, templates, versions, approval |
| [github.md](features/github.md) | Repository connection, issues, PRs, task linking, webhooks |
| [notifications.md](features/notifications.md) | Activity feed and notifications |
| [reports.md](features/reports.md) | Operational reports |
| [team.md](features/team.md) | Team page and settings |

### Planning
| Doc | Purpose |
|---|---|
| [mvp-scope.md](planning/mvp-scope.md) | Exactly what ships in v1 and what does not |
| [implementation-phases.md](planning/implementation-phases.md) | Ordered build phases with completion criteria |
| [roadmap.md](planning/roadmap.md) | Post-MVP direction |
| [technical-decisions.md](planning/technical-decisions.md) | Architecture Decision Records |
| [risks.md](planning/risks.md) | Known risks and mitigations |
| [open-decisions.md](planning/open-decisions.md) | Decisions that need human approval before implementation |
