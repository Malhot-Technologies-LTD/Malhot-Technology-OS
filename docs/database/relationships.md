# Relationships and ERD

## Core graph

```mermaid
erDiagram
  organizations ||--o{ organization_members : has
  organizations ||--o{ invitations : issues
  organizations ||--o{ clients : has
  organizations ||--o{ projects : owns
  organizations ||--o{ documents : owns
  organizations ||--o{ activities : logs
  organizations ||--o{ notifications : scopes
  organizations ||--o{ github_installations : installs
  organizations ||--o{ inquiries : receives

  profiles ||--o{ organization_members : is
  profiles ||--o{ project_members : is
  profiles ||--o{ notifications : receives

  clients ||--o{ projects : commissions

  projects ||--|| project_sequences : numbers
  projects ||--o{ project_members : staffed_by
  projects ||--o{ goals : pursues
  projects ||--o{ mvp_items : scopes
  projects ||--o{ milestones : schedules
  projects ||--o{ tasks : contains
  projects ||--o{ comments : scopes
  projects ||--o{ attachments : scopes
  projects ||--o{ test_cases : verifies_with
  projects ||--o{ test_runs : executes
  projects ||--o{ bugs : tracks
  projects ||--o{ documents : documents
  projects ||--o{ activities : logs
  projects ||--o{ github_repositories : connects
  projects ||--o{ deployments : ships

  goals ||--o{ mvp_items : realised_by
  goals ||--o{ tasks : delivered_by
  mvp_items ||--o{ tasks : delivered_by
  milestones ||--o{ tasks : groups
  milestones ||--o{ test_runs : verifies

  tasks ||--o{ tasks : subtasks
  tasks ||--o{ task_dependencies : blocks
  tasks ||--o{ task_dependencies : blocked_by
  tasks ||--o{ test_cases : verified_by
  tasks ||--o{ bugs : found_in
  tasks ||--o{ task_github_links : linked_to

  test_runs ||--o{ test_run_cases : selects
  test_cases ||--o{ test_run_cases : selected_in
  test_runs ||--o{ test_results : records
  test_cases ||--o{ test_results : executed_as
  test_results |o--o| bugs : raised

  documents ||--o{ document_versions : snapshots

  github_installations ||--o{ github_repositories : grants
  github_repositories ||--o{ github_issues : caches
  github_repositories ||--o{ github_pull_requests : caches
  github_repositories ||--o{ task_github_links : referenced_by
  github_repositories ||--o{ deployments : deploys
```

Polymorphic references (`comments`, `attachments`, `activities`, `notifications` via `entity_type` + `entity_id`) are not drawn as FKs because Postgres cannot enforce them across tables. They always carry `project_id` (or `organization_id`) so RLS is enforceable without resolving the target. The application validates target existence and same-project membership on write.

## Cardinalities that matter

| Relationship | Cardinality | Note |
|---|---|---|
| organization → project | 1 : n | |
| project → manager (profile) | n : 1 | nullable until activation |
| project → client | n : 0..1 | |
| project ↔ repository | 1 : 0..1 in v1 | `unique(repo_id)`; relax later |
| goal → mvp_item | 1 : n | mvp item may have no goal (warned) |
| mvp_item → task | 1 : n | task may have no mvp item |
| task → subtask | 1 : n, depth 1 | |
| task ↔ task (dependency) | n : n, acyclic | |
| task → reviewer | n : 0..1 | |
| test_case → test_result | 1 : n across runs | |
| test_run → test_case | n : n via test_run_cases | |
| test_result → bug | 0..1 : 0..1 | a result raises at most one bug; a bug comes from at most one result |
| bug → task | n : 0..1 | |
| document → versions | 1 : n | |
| task ↔ issue/PR | n : n via task_github_links | |

## Deletion semantics

| Parent deleted | Effect |
|---|---|
| organization | cascade everything (only via owner-only action; never in v1 UI) |
| profile (auth user) | memberships cascade; authored rows keep `created_by` (FK without cascade → set null where nullable, else prevented). Users are **removed from the organisation** rather than deleted. |
| project (hard) | not exposed; soft delete + 30-day restore, then cascade |
| goal / mvp_item / milestone | tasks keep existing with the link set null; activity records the deletion |
| task | soft; subtasks soft-deleted by action; dependencies and links cascade on eventual hard delete |
| test_case | soft; historical results keep pointing to it |
| test_run | cascade results (a run is a unit) |
| document | soft; versions cascade on eventual hard delete |
| github_repository | cascade cached issues/PRs and links; deployments keep row with null repository |

## Traceability query (the product promise)

"Which goal does this PR serve?" is one join path:

```text
github_pull_requests → task_github_links → tasks → mvp_items → goals
```

"Is MVP item X verified?":

```text
mvp_items → tasks → test_cases → test_results (latest per case) ∧ bugs (open, by task)
```

Both are implemented as SQL views (`v_task_traceability`, `v_mvp_verification`) used by the project overview and reports.
