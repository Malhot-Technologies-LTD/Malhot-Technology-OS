# Schema Blueprint

Authoritative DDL blueprint for `supabase/migrations`. Conventions: `architecture/database-architecture.md`. Business meaning: `database/entities.md`. Policies: `database/rls-policies.md`.

Column shorthand used below: `id` = `uuid pk default gen_random_uuid()`; `ts` = `timestamptz not null default now()`; `→ x` = `references x(id)`; `!` = not null.

## Extensions

`pgcrypto` (gen_random_uuid — built in on PG13+, kept for `digest`), `pg_trgm` (optional, fuzzy search in command palette).

## Enums

```sql
create type org_role           as enum ('owner','admin','member');
create type project_role       as enum ('manager','developer','designer','qa','marketer','viewer');
create type project_status     as enum ('planning','active','on_hold','completed','archived');
create type project_health     as enum ('on_track','at_risk','off_track');
create type priority           as enum ('low','medium','high','urgent');
create type task_status        as enum ('backlog','todo','in_progress','review','testing','done');
create type goal_status        as enum ('not_started','in_progress','achieved','dropped');
create type mvp_item_status    as enum ('planned','in_progress','done','dropped');
create type bug_status         as enum ('open','in_progress','fixed','retest','closed');
create type bug_severity       as enum ('low','medium','high','critical');
create type test_result_status as enum ('pass','fail','blocked');
create type document_type      as enum ('project_brief','requirements','mvp_specification','project_plan',
                                        'meeting_notes','testing_report','deployment_report','final_report','other');
create type document_status    as enum ('draft','in_review','approved','archived');
create type notification_type  as enum ('task_assigned','mentioned','review_requested','testing_requested',
                                        'task_overdue','project_updated','bug_assigned',
                                        'document_review_requested','document_approved','inquiry_received');
create type entity_type        as enum ('organization','member','project','goal','mvp_item','milestone','task',
                                        'comment','attachment','test_case','test_run','test_result','bug',
                                        'document','github_repository','github_pull_request','github_issue',
                                        'deployment','inquiry');
create type deployment_env     as enum ('preview','staging','production');
create type deployment_status  as enum ('pending','in_progress','success','failure');
create type invitation_status  as enum ('pending','accepted','revoked','expired');
create type github_link_kind   as enum ('issue','pull_request');
create type link_source        as enum ('auto','manual');
create type pr_state           as enum ('open','closed','merged');
create type issue_state        as enum ('open','closed');
```

## Tables

### Identity and tenancy

**organizations**
| column | type | notes |
|---|---|---|
| id | id | |
| name | text ! | ≤ 120 |
| slug | text ! unique | `^[a-z0-9-]{2,40}$` |
| logo_url | text | |
| settings | jsonb ! default '{}' | timezone, default_qa_required, notification defaults |
| created_at, updated_at | ts | |

**profiles** (1:1 with `auth.users`)
| column | type | notes |
|---|---|---|
| id | uuid pk → auth.users on delete cascade | |
| full_name | text ! default '' | ≤ 120 |
| avatar_url | text | |
| title | text | discipline label, e.g. "Frontend Developer" ≤ 80 |
| timezone | text ! default 'Africa/Kigali' | IANA |
| preferences | jsonb ! default '{}' | theme, notification prefs |
| created_at, updated_at | ts | |

**organization_members**
| column | type | notes |
|---|---|---|
| id | id | |
| organization_id | uuid ! → organizations on delete cascade | |
| user_id | uuid ! → profiles on delete cascade | |
| role | org_role ! default 'member' | |
| joined_at | ts | |
| created_at, updated_at | ts | |
| unique (organization_id, user_id) | | |
Constraint (trigger): an organisation must always retain ≥ 1 `owner`.

**invitations**
| column | type | notes |
|---|---|---|
| id | id | |
| organization_id | uuid ! → organizations | |
| email | citext ! | |
| org_role | org_role ! default 'member' | |
| project_grants | jsonb ! default '[]' | `[{project_id, role}]` validated by app |
| token_hash | text ! unique | sha256 hex |
| status | invitation_status ! default 'pending' | |
| invited_by | uuid ! → profiles | |
| expires_at | timestamptz ! | |
| accepted_at, revoked_at | timestamptz | |
| created_at, updated_at | ts | |
Index: `(organization_id, status)`; partial unique `(organization_id, email) where status = 'pending'`.

**clients**
| column | type | notes |
|---|---|---|
| id | id | |
| organization_id | uuid ! → organizations | |
| name | text ! | ≤ 120 |
| contact_name, contact_email, website | text | |
| notes | text | |
| created_by | uuid → profiles | |
| created_at, updated_at | ts | |
| unique (organization_id, name) | | |

### Projects and planning

**projects**
| column | type | notes |
|---|---|---|
| id | id | |
| organization_id | uuid ! → organizations | |
| client_id | uuid → clients on delete set null | |
| key | text ! | `^[A-Z]{2,6}$`; unique (organization_id, key) |
| name | text ! | ≤ 120 |
| description | text | ≤ 5000 |
| status | project_status ! default 'planning' | |
| priority | priority ! default 'medium' | |
| health_override | project_health | |
| health_override_at | timestamptz | cleared by cron after 14 d |
| manager_id | uuid → profiles | |
| start_date, target_end_date, actual_end_date | date | check target ≥ start |
| qa_required | boolean ! default true | |
| created_by | uuid ! → profiles | |
| archived_at, deleted_at | timestamptz | |
| created_at, updated_at | ts | |
Indexes: `(organization_id, status) where deleted_at is null`, `(manager_id)`, `(client_id)`.

**project_sequences** — `(project_id uuid pk → projects on delete cascade, task_seq int ! default 0, bug_seq int ! default 0)`; row created with the project; incremented under `for update`.

**project_members**
| column | type | notes |
|---|---|---|
| id | id | |
| project_id | uuid ! → projects on delete cascade | |
| user_id | uuid ! → profiles on delete cascade | |
| role | project_role ! default 'developer' | |
| added_by | uuid → profiles | |
| created_at, updated_at | ts | |
| unique (project_id, user_id) | | |
Trigger: user must be a member of the project's organisation.

**goals**
| column | type | notes |
|---|---|---|
| id | id | |
| project_id | uuid ! → projects on delete cascade | |
| title | text ! | ≤ 200 |
| description | text | ≤ 5000 |
| success_criteria | text | ≤ 5000 |
| owner_id | uuid → profiles | |
| status | goal_status ! default 'not_started' | |
| position | double precision ! | |
| created_by | uuid ! → profiles | |
| created_at, updated_at | ts | |
Index `(project_id, position)`.

**mvp_items**
| column | type | notes |
|---|---|---|
| id | id | |
| project_id | uuid ! → projects on delete cascade | |
| goal_id | uuid → goals on delete set null | trigger: same project |
| title | text ! | ≤ 200 |
| description | text | ≤ 5000 |
| priority | priority ! default 'medium' | |
| status | mvp_item_status ! default 'planned' | |
| position | double precision ! | |
| created_by | uuid ! → profiles | |
| created_at, updated_at | ts | |
Index `(project_id, position)`, `(goal_id)`.

**milestones**
| column | type | notes |
|---|---|---|
| id | id | |
| project_id | uuid ! → projects on delete cascade | |
| title | text ! | ≤ 200 |
| description | text | |
| due_date | date ! | |
| completed_at | timestamptz | |
| overdue_notified_at | timestamptz | |
| position | double precision ! | |
| created_by | uuid ! → profiles | |
| created_at, updated_at | ts | |
Index `(project_id, due_date)`.

### Tasks

**tasks**
| column | type | notes |
|---|---|---|
| id | id | |
| project_id | uuid ! → projects on delete cascade | |
| number | int ! | trigger-assigned; unique (project_id, number) |
| parent_task_id | uuid → tasks on delete cascade | one level only (trigger: parent must have null parent) |
| milestone_id | uuid → milestones on delete set null | |
| goal_id | uuid → goals on delete set null | |
| mvp_item_id | uuid → mvp_items on delete set null | |
| title | text ! | ≤ 200 |
| description | text | ≤ 20000, Markdown |
| status | task_status ! default 'backlog' | |
| priority | priority ! default 'medium' | |
| assignee_id | uuid → profiles on delete set null | |
| reviewer_id | uuid → profiles on delete set null | |
| created_by | uuid ! → profiles | |
| start_date, due_date | date | check due ≥ start |
| estimate_hours, actual_hours | numeric(6,2) | ≥ 0 |
| position | double precision ! | per (project, status) column |
| completed_at | timestamptz | trigger-maintained |
| overdue_notified_at | timestamptz | |
| search | tsvector generated | title + description |
| deleted_at | timestamptz | |
| created_at, updated_at | ts | |
Indexes: `(project_id, status, position) where deleted_at is null`, `(assignee_id, status) where deleted_at is null`, `(due_date) where status <> 'done' and deleted_at is null`, `(parent_task_id)`, `(milestone_id)`, `(mvp_item_id)`, `(goal_id)`, gin `(search)`.
Triggers: sequence, `enforce_task_status_rules`, cross-project FK consistency (milestone/goal/mvp item/parent belong to the same project).

**task_dependencies**
| column | type | notes |
|---|---|---|
| id | id | |
| blocking_task_id | uuid ! → tasks on delete cascade | |
| blocked_task_id | uuid ! → tasks on delete cascade | |
| created_by | uuid ! → profiles | |
| created_at | ts | |
| unique (blocking_task_id, blocked_task_id); check (blocking_task_id <> blocked_task_id) | | |
Trigger: same project; no cycle (recursive CTE).

**comments**
| column | type | notes |
|---|---|---|
| id | id | |
| project_id | uuid ! → projects on delete cascade | denormalised for RLS |
| entity_type | entity_type ! | check in ('task','bug','document','goal','mvp_item') |
| entity_id | uuid ! | polymorphic; app validates existence and same project |
| author_id | uuid ! → profiles | |
| body | text ! | ≤ 10000, Markdown |
| mentions | uuid[] ! default '{}' | extracted server-side |
| edited_at, deleted_at | timestamptz | |
| created_at, updated_at | ts | |
Index `(entity_type, entity_id, created_at)`.

**attachments**
| column | type | notes |
|---|---|---|
| id | id | |
| project_id | uuid ! → projects on delete cascade | |
| entity_type | entity_type ! | task, bug, document, comment, project |
| entity_id | uuid ! | |
| bucket | text ! default 'attachments' | |
| storage_path | text ! unique | `{project_id}/{attachment_id}/{file}` |
| file_name | text ! | ≤ 255 |
| mime_type | text ! | |
| size_bytes | bigint ! | ≤ 50 MB checked in app + bucket limit |
| uploaded_by | uuid ! → profiles | |
| created_at | ts | |
Index `(entity_type, entity_id)`.

### Testing

**test_cases**
| column | type | notes |
|---|---|---|
| id | id | |
| project_id | uuid ! → projects on delete cascade | |
| task_id | uuid → tasks on delete set null | |
| title | text ! | ≤ 200 |
| preconditions | text | |
| steps | text ! | Markdown, numbered |
| expected_result | text ! | |
| priority | priority ! default 'medium' | |
| created_by | uuid ! → profiles | |
| deleted_at | timestamptz | |
| created_at, updated_at | ts | |
Index `(project_id) where deleted_at is null`, `(task_id)`.

**test_runs**
| column | type | notes |
|---|---|---|
| id | id | |
| project_id | uuid ! → projects on delete cascade | |
| name | text ! | ≤ 200 |
| description | text | |
| environment | text | free text: staging URL, build id |
| milestone_id | uuid → milestones on delete set null | |
| executed_by | uuid ! → profiles | run owner |
| started_at | timestamptz ! default now() | |
| completed_at | timestamptz | |
| created_at, updated_at | ts | |
Index `(project_id, started_at desc)`.

**test_results**
| column | type | notes |
|---|---|---|
| id | id | |
| test_run_id | uuid ! → test_runs on delete cascade | |
| test_case_id | uuid ! → test_cases on delete cascade | |
| status | test_result_status ! | |
| actual_result | text | |
| notes | text | |
| bug_id | uuid → bugs on delete set null | |
| executed_by | uuid ! → profiles | |
| executed_at | timestamptz ! default now() | |
| unique (test_run_id, test_case_id) | | |
Cases selected for a run but not yet executed are represented by **absence** of a result row; the run's "pending" list = selected cases minus results. Selection stored in `test_run_cases (test_run_id, test_case_id, pk both)`.

**bugs**
| column | type | notes |
|---|---|---|
| id | id | |
| project_id | uuid ! → projects on delete cascade | |
| number | int ! | unique (project_id, number) |
| title | text ! | ≤ 200 |
| description | text | |
| steps_to_reproduce | text | |
| severity | bug_severity ! default 'medium' | |
| status | bug_status ! default 'open' | |
| reporter_id | uuid ! → profiles | |
| assignee_id | uuid → profiles on delete set null | |
| task_id | uuid → tasks on delete set null | task where found / to fix |
| test_result_id | uuid → test_results on delete set null | |
| reopen_count | int ! default 0 | |
| fixed_at, closed_at | timestamptz | |
| deleted_at | timestamptz | |
| created_at, updated_at | ts | |
Indexes: `(project_id, status) where deleted_at is null`, `(assignee_id, status)`, `(task_id)`.

### Documents

**documents**
| column | type | notes |
|---|---|---|
| id | id | |
| organization_id | uuid ! → organizations | |
| project_id | uuid → projects on delete cascade | null = organisation-level |
| type | document_type ! default 'other' | |
| title | text ! | ≤ 200 |
| content | jsonb ! default '{"type":"doc","content":[]}' | Tiptap JSON |
| plain_text | text | trigger-extracted for search/preview |
| search | tsvector generated | |
| status | document_status ! default 'draft' | |
| version | int ! default 1 | incremented on approve |
| author_id | uuid ! → profiles | |
| approved_by | uuid → profiles | |
| approved_at, archived_at, deleted_at | timestamptz | |
| template_key | text | which template generated it, if any |
| created_at, updated_at | ts | |
Indexes: `(project_id, status)`, `(organization_id, updated_at desc)`, gin `(search)`.

**document_versions**
| column | type | notes |
|---|---|---|
| id | id | |
| document_id | uuid ! → documents on delete cascade | |
| version | int ! | unique (document_id, version) |
| title | text ! | |
| content | jsonb ! | |
| created_by | uuid ! → profiles | |
| note | text | |
| created_at | ts | |

### Activity and notifications

**activities** (append-only)
| column | type | notes |
|---|---|---|
| id | id | |
| organization_id | uuid ! → organizations | |
| project_id | uuid → projects on delete cascade | |
| actor_id | uuid → profiles | null = system |
| entity_type | entity_type ! | |
| entity_id | uuid | |
| action | text ! | dotted, e.g. `task.status_changed` |
| metadata | jsonb ! default '{}' | |
| created_at | ts | |
Indexes: `(project_id, created_at desc)`, `(organization_id, created_at desc)`, `(entity_type, entity_id, created_at desc)`.

**notifications**
| column | type | notes |
|---|---|---|
| id | id | |
| user_id | uuid ! → profiles on delete cascade | |
| organization_id | uuid ! → organizations | |
| type | notification_type ! | |
| title | text ! | ≤ 200 |
| body | text | ≤ 1000 |
| project_id | uuid → projects on delete cascade | |
| entity_type | entity_type | |
| entity_id | uuid | |
| actor_id | uuid → profiles | |
| href | text | resolved deep link |
| read_at | timestamptz | |
| created_at | ts | |
Indexes: `(user_id, created_at desc)`, `(user_id) where read_at is null`.

### GitHub

**github_installations**
| column | type | notes |
|---|---|---|
| id | id | |
| organization_id | uuid ! → organizations | |
| installation_id | bigint ! unique | |
| account_login | text ! | |
| account_type | text ! | User / Organization |
| installed_by | uuid → profiles | |
| suspended_at, deleted_at | timestamptz | |
| created_at, updated_at | ts | |

**github_repositories**
| column | type | notes |
|---|---|---|
| id | id | |
| project_id | uuid ! → projects on delete cascade | |
| installation_id | uuid ! → github_installations | |
| repo_id | bigint ! | GitHub numeric id |
| full_name | text ! | owner/name |
| default_branch | text ! | |
| html_url | text ! | |
| is_private | boolean ! | |
| last_synced_at | timestamptz | |
| created_by | uuid → profiles | |
| created_at, updated_at | ts | |
| unique (project_id, repo_id); unique (repo_id) | | one project per repo in v1 |

**github_issues**
| column | type | notes |
|---|---|---|
| id | id | |
| repository_id | uuid ! → github_repositories on delete cascade | |
| github_id | bigint ! | |
| number | int ! | unique (repository_id, number) |
| title | text ! | |
| state | issue_state ! | |
| html_url | text ! | |
| author_login | text | |
| labels | jsonb ! default '[]' | |
| opened_at, closed_at, github_updated_at | timestamptz | |
| synced_at | ts | |

**github_pull_requests**
| column | type | notes |
|---|---|---|
| id | id | |
| repository_id | uuid ! → github_repositories on delete cascade | |
| github_id | bigint ! | |
| number | int ! | unique (repository_id, number) |
| title | text ! | |
| state | pr_state ! | |
| is_draft | boolean ! default false | |
| html_url | text ! | |
| author_login | text | |
| head_branch, base_branch | text ! | |
| opened_at, merged_at, closed_at, github_updated_at | timestamptz | |
| synced_at | ts | |

**task_github_links**
| column | type | notes |
|---|---|---|
| id | id | |
| task_id | uuid ! → tasks on delete cascade | |
| repository_id | uuid ! → github_repositories on delete cascade | |
| kind | github_link_kind ! | |
| number | int ! | issue/PR number |
| source | link_source ! | |
| created_by | uuid → profiles | |
| created_at | ts | |
| unique (task_id, repository_id, kind, number) | | |

**deployments**
| column | type | notes |
|---|---|---|
| id | id | |
| project_id | uuid ! → projects on delete cascade | |
| repository_id | uuid → github_repositories on delete set null | |
| environment | deployment_env ! | |
| status | deployment_status ! | |
| url | text | |
| provider | text ! default 'manual' | manual / github / vercel |
| external_id | text | provider id; unique (provider, external_id) where not null |
| commit_sha | text | |
| description | text | |
| recorded_by | uuid → profiles | |
| deployed_at | timestamptz ! default now() | |
| created_at, updated_at | ts | |
Index `(project_id, deployed_at desc)`.

**webhook_events**
| column | type | notes |
|---|---|---|
| id | id | |
| provider | text ! | 'github' |
| delivery_id | text ! unique | |
| event_type | text ! | |
| action | text | |
| payload | jsonb ! | |
| received_at | ts | |
| processed_at | timestamptz | |
| attempts | int ! default 0 | |
| last_error | text | |
Index `(processed_at) where processed_at is null`.

### Website

**inquiries**
| column | type | notes |
|---|---|---|
| id | id | |
| organization_id | uuid ! → organizations | the single org in v1; resolved server-side |
| name | text ! | ≤ 120 |
| email | citext ! | |
| company | text | |
| message | text ! | ≤ 5000 |
| budget_range | text | |
| source_path | text | page submitted from |
| ip_hash | text | sha256(ip + daily salt) |
| handled_at | timestamptz | |
| handled_by | uuid → profiles | |
| created_at | ts | |

**inquiry_rate_limits** — `(ip_hash text, window_start timestamptz, count int, pk (ip_hash, window_start))`; rows older than 1 day pruned by cron.

## Functions (public schema)

Authorisation helpers (`architecture/authorization.md`), `next_project_sequence()`, `project_health()`, `project_progress()`, `dashboard_counts()`, `report_*()` (see `features/reports.md`), `search_entities(org uuid, q text, limit int)` for the command palette.

## Storage buckets

| Bucket | Public | Size limit | Allowed MIME | Path |
|---|---|---|---|---|
| `avatars` | read | 2 MB | image/* | `{user_id}/{filename}` |
| `attachments` | no | 50 MB | images, pdf, office docs, text, zip | `{project_id}/{attachment_id}/{filename}` |
| `org-assets` | no | 5 MB | image/* | `{organization_id}/{filename}` |

## Migration order

1. extensions, enums
2. organizations, profiles (+ auth trigger), organization_members, invitations, clients
3. projects, project_sequences, project_members, goals, mvp_items, milestones
4. tasks, task_dependencies, comments, attachments
5. test_cases, test_runs, test_run_cases, test_results, bugs (bugs ↔ test_results circular FK: add `test_results.bug_id` FK after bugs)
6. documents, document_versions
7. activities, notifications
8. github_*, task_github_links, deployments, webhook_events
9. inquiries, inquiry_rate_limits
10. authorisation helper functions
11. RLS enable + policies (all tables)
12. triggers
13. report/aggregate functions, search
14. storage buckets + policies
15. realtime publication
