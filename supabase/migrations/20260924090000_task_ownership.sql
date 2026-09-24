-- ---------------------------------------------------------------------------
-- Everyone sees the work; only its owner changes it
--
-- The team's tasks are worth being visible to the whole team — knowing what
-- everyone is carrying is how people stop stepping on each other. Being able to
-- *edit* any of it is a different thing entirely, and the previous policy
-- granted it to every contributor: a developer could re-date, reassign or close
-- somebody else's task.
--
-- The rule is now: you may change a task if you manage the project, or if it is
-- yours. Otherwise you may look at it.
--
-- Creation follows the same line. A contributor may add work for themselves, or
-- leave it unassigned for a manager to hand out; handing work to somebody else
-- is a manager's act, because it commits that person's time.
--
-- Reversal: restore the can_contribute() forms below.
-- ---------------------------------------------------------------------------

/**
 * Assigning to someone else commits their time, so it needs authority over the
 * project. Assigning to yourself, or to nobody, does not.
 */
drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (
    public.can_contribute(project_id)
    and public.project_is_writable(project_id)
    and (
      public.can_manage_project(project_id)
      or assignee_id is null
      or assignee_id = public.auth_uid()
    )
  );

/**
 * `using` decides which rows you may touch at all; `with check` decides what
 * they may look like afterwards. Both carry the ownership test, because
 * without it in `with check` a contributor could take a task off someone by
 * reassigning it to themselves — the row would pass `using` on its old
 * assignee and pass the write on its new one.
 */
drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
  for update to authenticated
  using (
    public.can_contribute(project_id)
    and (public.can_manage_project(project_id) or assignee_id = public.auth_uid())
  )
  with check (
    public.project_is_writable(project_id)
    and (public.can_manage_project(project_id) or assignee_id = public.auth_uid())
  );

-- Deleting was already a manager's act; restated so the three read together.
drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks
  for delete to authenticated using (public.can_manage_project(project_id));

-- Selecting is unchanged and deliberately wide: everyone on the project sees
-- every task on it, which is the point of the team view.
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select to authenticated using (public.is_project_member(project_id));

comment on table public.tasks is
  'Assigned work inside a project. Visible to the whole project; editable by its assignee or a project manager.';
