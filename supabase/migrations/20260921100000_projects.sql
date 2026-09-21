-- 0006 projects and planning: projects, project_sequences, project_members,
-- goals, mvp_items, milestones — plus the project-scoped authorisation helpers
-- every later phase builds on.
--
-- Blueprint: docs/database/schema.md#projects-and-planning
-- Policies:  docs/database/rls-policies.md
-- Roles:     docs/product/user-roles.md#permission-matrix
-- Lifecycle: docs/product/project-lifecycle.md#status-state-machine
--
-- Reversal: drop the tables in reverse order, then the functions.
--
-- Deliberately NOT here: project_progress() and project_health() count tasks and
-- bugs, which arrive in migration 0007 (Phase 4). Adding them now would mean
-- writing them twice. The overview computes progress from MVP items and
-- milestones until then.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.projects (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  client_id          uuid references public.clients(id) on delete set null,
  key                text not null check (key ~ '^[A-Z]{2,6}$'),
  name               text not null check (char_length(name) between 1 and 120),
  description        text check (char_length(description) <= 5000),
  status             public.project_status not null default 'planning',
  priority           public.priority not null default 'medium',
  health_override    public.project_health,
  health_override_at timestamptz,
  manager_id         uuid references public.profiles(id),
  start_date         date,
  target_end_date    date,
  actual_end_date    date,
  qa_required        boolean not null default true,
  created_by         uuid not null references public.profiles(id),
  archived_at        timestamptz,
  deleted_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (organization_id, key),
  constraint projects_dates_ordered check (target_end_date is null or start_date is null or target_end_date >= start_date)
);
create index projects_org_status_idx on public.projects (organization_id, status) where deleted_at is null;
create index projects_manager_idx on public.projects (manager_id);
create index projects_client_idx on public.projects (client_id);

-- Per-project counters for task/bug keys (MAL-42). Incremented under `for update`.
create table public.project_sequences (
  project_id uuid primary key references public.projects(id) on delete cascade,
  task_seq   int not null default 0,
  bug_seq    int not null default 0
);

create table public.project_members (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       public.project_role not null default 'developer',
  added_by   uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, user_id)
);
create index project_members_user_idx on public.project_members (user_id);

create table public.goals (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references public.projects(id) on delete cascade,
  title            text not null check (char_length(title) between 1 and 200),
  description      text check (char_length(description) <= 5000),
  success_criteria text check (char_length(success_criteria) <= 5000),
  owner_id         uuid references public.profiles(id),
  status           public.goal_status not null default 'not_started',
  position         double precision not null,
  created_by       uuid not null references public.profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index goals_project_position_idx on public.goals (project_id, position);

create table public.mvp_items (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  goal_id     uuid references public.goals(id) on delete set null,
  title       text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 5000),
  priority    public.priority not null default 'medium',
  status      public.mvp_item_status not null default 'planned',
  position    double precision not null,
  created_by  uuid not null references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index mvp_items_project_position_idx on public.mvp_items (project_id, position);
create index mvp_items_goal_idx on public.mvp_items (goal_id);

create table public.milestones (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.projects(id) on delete cascade,
  title               text not null check (char_length(title) between 1 and 200),
  description         text check (char_length(description) <= 5000),
  due_date            date not null,
  completed_at        timestamptz,
  overdue_notified_at timestamptz,
  position            double precision not null,
  created_by          uuid not null references public.profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index milestones_project_due_idx on public.milestones (project_id, due_date);

create trigger set_updated_at before update on public.projects        for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.project_members for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.goals           for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.mvp_items       for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.milestones      for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Authorisation helpers (docs/architecture/authorization.md#helper-functions).
-- security definer so policies on project_members can be evaluated without
-- recursing into project_members' own policies. Read-only, no dynamic SQL.
-- ---------------------------------------------------------------------------
create or replace function public.project_org(project uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$ select p.organization_id from public.projects p where p.id = project $$;

/** Project role from the membership row; null when there is none. */
create or replace function public.project_role_of(project uuid)
returns public.project_role
language sql
stable
security definer
set search_path = public
as $$
  select m.role from public.project_members m
  where m.project_id = project and m.user_id = auth.uid()
$$;

/**
 * Effective permission group. Org owner/admin outrank any project role and need
 * no membership row; otherwise the project role maps to its group
 * (docs/product/user-roles.md#project-roles).
 */
create or replace function public.project_group_of(project uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_org_admin(public.project_org(project)) then 'admin'
    when public.project_role_of(project) = 'manager' then 'manager'
    when public.project_role_of(project) in ('developer','designer','marketer') then 'contributor'
    when public.project_role_of(project) = 'qa' then 'qa'
    when public.project_role_of(project) = 'viewer' then 'viewer'
    else 'none'
  end
$$;

create or replace function public.is_project_member(project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.project_group_of(project) <> 'none' $$;

create or replace function public.can_manage_project(project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.project_group_of(project) in ('admin','manager') $$;

create or replace function public.can_contribute(project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.project_group_of(project) in ('admin','manager','contributor','qa') $$;

/** Archived projects are read-only at the database level; org admins may still fix them. */
create or replace function public.project_is_writable(project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.projects p
    where p.id = project
      and p.deleted_at is null
      and (p.status <> 'archived' or public.is_org_admin(p.organization_id))
  )
$$;

/** Next task/bug number for a project key (MAL-42). Locks the counter row. */
create or replace function public.next_project_sequence(project uuid, kind text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  next_value int;
begin
  if not public.can_contribute(project) then
    perform public.raise_malhot('forbidden', 'You cannot create items in this project');
  end if;
  if kind = 'task' then
    update public.project_sequences set task_seq = task_seq + 1
    where project_id = project returning task_seq into next_value;
  elsif kind = 'bug' then
    update public.project_sequences set bug_seq = bug_seq + 1
    where project_id = project returning bug_seq into next_value;
  else
    perform public.raise_malhot('invariant', 'Unknown sequence kind');
  end if;
  if next_value is null then
    perform public.raise_malhot('not_found', 'That project does not exist');
  end if;
  return next_value;
end;
$$;

revoke execute on function public.project_org(uuid)           from public, anon;
revoke execute on function public.project_role_of(uuid)       from public, anon;
revoke execute on function public.project_group_of(uuid)      from public, anon;
revoke execute on function public.is_project_member(uuid)     from public, anon;
revoke execute on function public.can_manage_project(uuid)    from public, anon;
revoke execute on function public.can_contribute(uuid)        from public, anon;
revoke execute on function public.project_is_writable(uuid)   from public, anon;
revoke execute on function public.next_project_sequence(uuid, text) from public, anon;
grant execute on function public.project_org(uuid)            to authenticated;
grant execute on function public.project_role_of(uuid)        to authenticated;
grant execute on function public.project_group_of(uuid)       to authenticated;
grant execute on function public.is_project_member(uuid)      to authenticated;
grant execute on function public.can_manage_project(uuid)     to authenticated;
grant execute on function public.can_contribute(uuid)         to authenticated;
grant execute on function public.project_is_writable(uuid)    to authenticated;
grant execute on function public.next_project_sequence(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

/**
 * A new project always gets its counter row and its creator as manager. Without
 * the membership the creator could not manage the project they just made: every
 * write policy consults project_members, and RLS would refuse the first insert.
 */
create or replace function public.setup_new_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_sequences (project_id) values (new.id);
  insert into public.project_members (project_id, user_id, role, added_by)
  values (new.id, new.created_by, 'manager', new.created_by)
  on conflict (project_id, user_id) do nothing;
  if new.manager_id is not null and new.manager_id <> new.created_by then
    insert into public.project_members (project_id, user_id, role, added_by)
    values (new.id, new.manager_id, 'manager', new.created_by)
    on conflict (project_id, user_id) do update set role = 'manager';
  end if;
  return new;
end;
$$;

create trigger setup_new_project
  after insert on public.projects
  for each row execute function public.setup_new_project();

/** Project members must belong to the project's organisation. */
create or replace function public.member_must_be_in_org()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.organization_members m
    where m.user_id = new.user_id and m.organization_id = public.project_org(new.project_id)
  ) then
    perform public.raise_malhot('invariant', 'That person is not a member of this organisation');
  end if;
  return new;
end;
$$;

create trigger member_must_be_in_org
  before insert or update on public.project_members
  for each row execute function public.member_must_be_in_org();

/** An MVP item may only point at a goal in its own project. */
create or replace function public.mvp_item_goal_same_project()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.goal_id is not null and not exists (
    select 1 from public.goals g where g.id = new.goal_id and g.project_id = new.project_id
  ) then
    perform public.raise_malhot('invariant', 'That goal belongs to a different project');
  end if;
  return new;
end;
$$;

create trigger mvp_item_goal_same_project
  before insert or update on public.mvp_items
  for each row execute function public.mvp_item_goal_same_project();

/** Only managers and org admins may mark a goal achieved (docs/product/user-roles.md). */
create or replace function public.enforce_goal_achieve()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'achieved' and old.status <> 'achieved' and not public.can_manage_project(new.project_id) then
    perform public.raise_malhot('forbidden', 'Only the project manager can mark a goal achieved');
  end if;
  return new;
end;
$$;

create trigger enforce_goal_achieve
  before update on public.goals
  for each row execute function public.enforce_goal_achieve();

/**
 * Project status machine (docs/product/project-lifecycle.md#status-state-machine).
 * The Server Action adds the readiness checks and friendlier messages; this is
 * the backstop that also holds for direct database access.
 */
create or replace function public.enforce_project_status_transition()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  pair text := old.status || '->' || new.status;
  is_admin boolean := public.is_org_admin(old.organization_id);
begin
  -- The key is part of every task reference; it may only change while planning.
  if new.key <> old.key and old.status <> 'planning' then
    perform public.raise_malhot('invariant', 'The project key cannot change once the project has started');
  end if;

  -- Soft delete and restore are org-admin only.
  if new.deleted_at is distinct from old.deleted_at and not is_admin then
    perform public.raise_malhot('forbidden', 'Only an organisation admin can delete or restore a project');
  end if;

  if new.status = old.status then
    return new;
  end if;

  if pair not in (
    'planning->active', 'planning->archived',
    'active->on_hold', 'on_hold->active',
    'active->completed', 'on_hold->completed',
    'active->archived',
    'completed->archived', 'completed->active',
    'archived->completed'
  ) then
    perform public.raise_malhot('invalid_transition', format('A project cannot go from %s to %s', old.status, new.status));
  end if;

  -- Reopening and unarchiving are audited admin moves; everything else is manager+.
  if pair in ('completed->active', 'archived->completed') then
    if not is_admin then
      perform public.raise_malhot('forbidden', 'Only an organisation admin can reopen or unarchive a project');
    end if;
  elsif not public.can_manage_project(old.id) then
    perform public.raise_malhot('forbidden', 'Only the project manager can change the project status');
  end if;

  if new.status = 'completed' then
    new.actual_end_date := coalesce(new.actual_end_date, current_date);
    new.archived_at := null;
  elsif new.status = 'archived' then
    new.archived_at := coalesce(new.archived_at, now());
  elsif new.status = 'active' then
    new.actual_end_date := null;
    new.archived_at := null;
  end if;

  return new;
end;
$$;

create trigger enforce_project_status_transition
  before update on public.projects
  for each row execute function public.enforce_project_status_transition();

revoke execute on function public.setup_new_project()                from public, anon, authenticated;
revoke execute on function public.member_must_be_in_org()            from public, anon, authenticated;
revoke execute on function public.mvp_item_goal_same_project()       from public, anon, authenticated;
revoke execute on function public.enforce_goal_achieve()             from public, anon, authenticated;
revoke execute on function public.enforce_project_status_transition() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security (docs/database/rls-policies.md#policy-matrix)
-- ---------------------------------------------------------------------------
alter table public.projects          enable row level security;
alter table public.project_sequences enable row level security;
alter table public.project_members   enable row level security;
alter table public.goals             enable row level security;
alter table public.mvp_items         enable row level security;
alter table public.milestones        enable row level security;

-- projects: members see live projects; org admins also see soft-deleted ones to restore.
create policy projects_select on public.projects
  for select to authenticated
  using ((deleted_at is null and public.is_project_member(id)) or public.is_org_admin(organization_id));
create policy projects_insert on public.projects
  for insert to authenticated
  with check (public.is_org_member(organization_id) and created_by = public.auth_uid());
create policy projects_update on public.projects
  for update to authenticated
  using (public.can_manage_project(id) or public.is_org_admin(organization_id))
  with check (public.can_manage_project(id) or public.is_org_admin(organization_id));

-- project_sequences: readable by members; written only through next_project_sequence().
create policy project_sequences_select on public.project_sequences
  for select to authenticated using (public.is_project_member(project_id));

create policy project_members_select on public.project_members
  for select to authenticated using (public.is_project_member(project_id));
create policy project_members_insert on public.project_members
  for insert to authenticated
  with check (public.can_manage_project(project_id) and public.project_is_writable(project_id));
create policy project_members_update on public.project_members
  for update to authenticated
  using (public.can_manage_project(project_id))
  with check (public.can_manage_project(project_id) and public.project_is_writable(project_id));
create policy project_members_delete on public.project_members
  for delete to authenticated using (public.can_manage_project(project_id));

create policy goals_select on public.goals
  for select to authenticated using (public.is_project_member(project_id));
create policy goals_insert on public.goals
  for insert to authenticated
  with check (public.can_contribute(project_id) and public.project_is_writable(project_id));
create policy goals_update on public.goals
  for update to authenticated
  using (public.can_contribute(project_id))
  with check (public.can_contribute(project_id) and public.project_is_writable(project_id));
create policy goals_delete on public.goals
  for delete to authenticated using (public.can_manage_project(project_id));

create policy mvp_items_select on public.mvp_items
  for select to authenticated using (public.is_project_member(project_id));
create policy mvp_items_insert on public.mvp_items
  for insert to authenticated
  with check (public.can_contribute(project_id) and public.project_is_writable(project_id));
create policy mvp_items_update on public.mvp_items
  for update to authenticated
  using (public.can_contribute(project_id))
  with check (public.can_contribute(project_id) and public.project_is_writable(project_id));
create policy mvp_items_delete on public.mvp_items
  for delete to authenticated using (public.can_manage_project(project_id));

create policy milestones_select on public.milestones
  for select to authenticated using (public.is_project_member(project_id));
create policy milestones_insert on public.milestones
  for insert to authenticated
  with check (public.can_manage_project(project_id) and public.project_is_writable(project_id));
create policy milestones_update on public.milestones
  for update to authenticated
  using (public.can_manage_project(project_id))
  with check (public.can_manage_project(project_id) and public.project_is_writable(project_id));
create policy milestones_delete on public.milestones
  for delete to authenticated using (public.can_manage_project(project_id));
