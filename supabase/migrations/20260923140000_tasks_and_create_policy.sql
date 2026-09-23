-- ---------------------------------------------------------------------------
-- Tasks, and who may start a project
--
-- Two changes that both concern "who is allowed to do what", kept in one
-- migration so the deployment applies them together.
--
-- 1. Starting a project becomes an admin act. It was open to any organisation
--    member, which put "New project" in a developer's sidebar next to the work
--    they were actually assigned. A project is a commitment the company makes,
--    not a note someone jots down.
--
-- 2. Tasks: the unit of assigned work, with an owner and a deadline. The
--    countdown the interface shows is derived from `due_at`, which is a
--    timestamptz rather than a date precisely so "you have until 5pm" can mean
--    5pm rather than some time today.
--
-- Reversal: drop the tasks table and its policies, then restore the old
-- projects_insert policy with is_org_member.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Only organisation admins start projects
-- ---------------------------------------------------------------------------
drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
  for insert to authenticated
  with check (public.is_org_admin(organization_id) and created_by = public.auth_uid());

-- ---------------------------------------------------------------------------
-- 2. Tasks
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  -- Per-project number behind the MAL-42 reference, from next_project_sequence().
  seq          int not null,
  title        text not null check (char_length(title) between 1 and 200),
  description  text check (char_length(description) <= 5000),
  assignee_id  uuid references public.profiles(id) on delete set null,
  status       public.task_status not null default 'todo',
  priority     public.priority not null default 'medium',
  /**
   * The deadline the countdown runs against. An instant, not a date: "finish by
   * the end of today" and "finish by 2pm" are different promises, and a date
   * column can only express the first.
   */
  due_at       timestamptz,
  started_at   timestamptz,
  completed_at timestamptz,
  created_by   uuid not null references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (project_id, seq)
);

create index if not exists tasks_project_status_idx on public.tasks (project_id, status);
create index if not exists tasks_assignee_idx on public.tasks (assignee_id) where completed_at is null;
create index if not exists tasks_due_idx on public.tasks (due_at) where completed_at is null;

drop trigger if exists set_updated_at on public.tasks;
create trigger set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

/**
 * An assignee must be on the project. Assigning work to someone who cannot open
 * the task is a silent dead end: RLS would hide it from them and nobody would
 * find out until the deadline passed.
 */
create or replace function public.task_assignee_must_be_member()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.assignee_id is not null and not exists (
    select 1 from public.project_members m
    where m.project_id = new.project_id and m.user_id = new.assignee_id
  ) then
    perform public.raise_malhot('invariant', 'That person is not on this project');
  end if;
  return new;
end;
$$;

drop trigger if exists task_assignee_must_be_member on public.tasks;
create trigger task_assignee_must_be_member
  before insert or update on public.tasks
  for each row execute function public.task_assignee_must_be_member();

/** Completion timestamps follow the status rather than being set by hand. */
create or replace function public.stamp_task_progress()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'done' and coalesce(old.status, 'todo') <> 'done' then
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;

  if new.status = 'in_progress' and new.started_at is null then
    new.started_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists stamp_task_progress on public.tasks;
create trigger stamp_task_progress
  before insert or update on public.tasks
  for each row execute function public.stamp_task_progress();

revoke execute on function public.task_assignee_must_be_member() from public, anon, authenticated;
revoke execute on function public.stamp_task_progress()          from public, anon, authenticated;

alter table public.tasks enable row level security;

-- Everyone on the project sees its tasks; contributors and QA work them;
-- only a manager deletes. Mirrors docs/product/user-roles.md#tasks.
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select to authenticated using (public.is_project_member(project_id));

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (public.can_contribute(project_id) and public.project_is_writable(project_id));

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
  for update to authenticated
  using (public.can_contribute(project_id))
  with check (public.can_contribute(project_id) and public.project_is_writable(project_id));

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks
  for delete to authenticated using (public.can_manage_project(project_id));

comment on table public.tasks is
  'Assigned work inside a project. due_at is an instant so the countdown can mean a time of day.';
