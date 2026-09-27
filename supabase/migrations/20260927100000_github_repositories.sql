-- ---------------------------------------------------------------------------
-- Connecting a GitHub repository to a project
--
-- A project's code lives somewhere, and until now the OS had no way to say
-- where. Someone looking at MAL had to already know which repository it meant,
-- which is fine for the two people who set it up and useless for everybody
-- else.
--
-- This is the connection only, not the integration. `docs/architecture/
-- integrations.md` designs a GitHub App that caches issues, pull requests and
-- pushes; none of that is built. So a repository is recorded by name here and
-- the columns the App would fill are left null, which is why they are nullable
-- and `full_name` is not: the name is the thing a person knows, everything else
-- is something a sync would have to tell us.
--
-- No update policy, deliberately. A connection is made or removed, never
-- edited — correcting a typo means disconnecting and reconnecting, and that is
-- one fewer path for RLS to have to be right about. The App sync will add its
-- own when it has something to write.
--
-- Reversal: drop table public.github_repositories.
-- ---------------------------------------------------------------------------

create table if not exists public.github_repositories (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  /**
   * `owner/name`, as GitHub spells it. The check is deliberately looser than
   * GitHub's own rules — it rejects the two mistakes people actually make,
   * pasting a whole URL and forgetting the owner, and leaves the rest to
   * GitHub. A pattern that tried to encode every naming rule would reject
   * legitimate repositories the day GitHub relaxed one.
   */
  full_name      text not null check (full_name ~ '^[A-Za-z0-9._-]{1,100}/[A-Za-z0-9._-]{1,100}$'),
  html_url       text not null check (html_url ~ '^https://'),
  /*
   * Everything below is the App sync's to fill; null means "nobody has asked
   * GitHub yet", which is the honest state until the integration exists. The
   * interface reads null as unknown and says so rather than guessing "main".
   */
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

/**
 * One project per repository (integrations.md#linking-rules). Two projects
 * claiming the same repository would make `KEY-n` auto-linking ambiguous the
 * moment it ships, and the fix then would mean deciding which project loses.
 *
 * On `lower(full_name)` because GitHub treats owner and name case-insensitively
 * — `Malhot/OS` and `malhot/os` are one repository, and a plain unique
 * constraint would happily connect both.
 */
create unique index if not exists github_repositories_full_name_key
  on public.github_repositories (lower(full_name));

-- The numeric id is the identity that survives a rename, so it carries the same
-- rule once a sync fills it. Partial, because null means "not yet asked".
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

/**
 * Disconnecting is a manager's call. `project_is_writable` is deliberately
 * absent here and present on insert: `can()` already refuses every write on an
 * archived project unless the viewer is an org admin, so the policy would only
 * be restating that in a second place — and this is the one write an admin
 * might legitimately need on an archived project, to unpin a wrong repository.
 */
drop policy if exists github_repositories_delete on public.github_repositories;
create policy github_repositories_delete on public.github_repositories
  for delete to authenticated
  using (public.can_manage_project(project_id));
