-- ---------------------------------------------------------------------------
-- Accepting a task
--
-- Assigning work is one person's decision; accepting it is the other person's
-- acknowledgement that they have seen it and will do it. Without that second
-- half, a manager hands out a task and has no way to tell the difference
-- between "they are on it" and "they have not opened the app since Friday" —
-- which is exactly the difference that matters the day before a deadline.
--
-- `accepted_at` is the whole feature. Null means nobody has picked it up yet.
--
-- Reversal: drop the column and the reassign trigger.
-- ---------------------------------------------------------------------------

alter table public.tasks
  add column if not exists accepted_at timestamptz;

comment on column public.tasks.accepted_at is
  'When the assignee acknowledged the task. Null means assigned but not yet picked up.';

-- The manager's real question is "what has been handed out and not picked up",
-- so that is the shape the index serves.
create index if not exists tasks_awaiting_acceptance_idx
  on public.tasks (project_id)
  where accepted_at is null and assignee_id is not null and completed_at is null;

create index if not exists tasks_recently_accepted_idx
  on public.tasks (accepted_at desc)
  where accepted_at is not null;

/**
 * Acceptance belongs to the person who accepted, so it cannot survive being
 * handed to somebody else. Without this, reassigning a task would leave it
 * marked accepted by someone who no longer holds it — and the new assignee
 * would never appear in the manager's "waiting to be picked up" list, which is
 * the one list that would have caught it.
 *
 * Unassigning clears it for the same reason.
 */
create or replace function public.clear_acceptance_on_reassign()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.assignee_id is distinct from old.assignee_id then
    new.accepted_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists clear_acceptance_on_reassign on public.tasks;
create trigger clear_acceptance_on_reassign
  before update on public.tasks
  for each row execute function public.clear_acceptance_on_reassign();

revoke execute on function public.clear_acceptance_on_reassign() from public, anon, authenticated;
