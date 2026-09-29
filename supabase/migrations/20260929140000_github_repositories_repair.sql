-- ---------------------------------------------------------------------------
-- Re-issue github_repositories, which never reached the database
--
-- `20260927100000_github_repositories.sql` was written on a branch while other
-- work was being pushed from another. By the time it merged, the remote history
-- had already recorded `20260927120000_project_documents`, and `supabase db
-- push` only applies migrations newer than the latest recorded version — so an
-- older file arriving late is not applied, and never will be. It is skipped in
-- silence: the push succeeds, the release goes green, and the table simply is
-- not there.
--
-- The symptom was a project's Settings tab reporting "The database is behind the
-- app" where the Code panel should be, because listProjectRepositories was
-- querying a table that did not exist.
--
-- This file is the same DDL under a timestamp later than everything applied so
-- far. Every statement below is guarded, so it is safe whether the original ran
-- nowhere, somewhere, or partially — see the original for why the table is
-- shaped this way.
--
-- Worth knowing for next time: a migration is applied by *when it is recorded*,
-- not by when it was written. Anything authored on a branch that merges after a
-- newer migration has already been pushed needs re-dating before it will run.
--
-- Reversal: drop table public.github_repositories.
-- ---------------------------------------------------------------------------

create table if not exists public.github_repositories (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  full_name      text not null check (full_name ~ '^[A-Za-z0-9._-]{1,100}/[A-Za-z0-9._-]{1,100}$'),
  html_url       text not null check (html_url ~ '^https://'),
  -- Null until the GitHub App exists to fill them; the interface says so
  -- rather than guessing "main".
  repo_id        bigint,
  default_branch text,
  is_private     boolean,
  last_synced_at timestamptz,
  created_by     uuid not null references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.github_repositories is
  'A GitHub repository connected to a project. Recorded by name; sync columns are null until the GitHub App exists.';

create index if not exists github_repositories_project_idx
  on public.github_repositories (project_id);

-- One project per repository, case-insensitively: github.com treats owner and
-- name that way, and KEY-n auto-linking must not have to pick a winner.
create unique index if not exists github_repositories_full_name_key
  on public.github_repositories (lower(full_name));

create unique index if not exists github_repositories_repo_id_key
  on public.github_repositories (repo_id)
  where repo_id is not null;

drop trigger if exists set_updated_at on public.github_repositories;
create trigger set_updated_at before update on public.github_repositories
  for each row execute function public.set_updated_at();

alter table public.github_repositories enable row level security;

-- Anyone on the project needs to know where the code is.
drop policy if exists github_repositories_select on public.github_repositories;
create policy github_repositories_select on public.github_repositories
  for select to authenticated
  using (public.is_project_member(project_id));

drop policy if exists github_repositories_insert on public.github_repositories;
create policy github_repositories_insert on public.github_repositories
  for insert to authenticated
  with check (
    public.can_manage_project(project_id)
    and public.project_is_writable(project_id)
    and created_by = public.auth_uid()
  );

-- No project_is_writable here: `can()` already refuses every write on an
-- archived project unless the viewer is an org admin, and unpinning a wrong
-- repository is the one such write an admin might legitimately need.
drop policy if exists github_repositories_delete on public.github_repositories;
create policy github_repositories_delete on public.github_repositories
  for delete to authenticated
  using (public.can_manage_project(project_id));
