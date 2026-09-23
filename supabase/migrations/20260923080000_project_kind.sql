-- ---------------------------------------------------------------------------
-- Projects vs jobs
--
-- Two kinds of work sit in the same table because everything downstream —
-- goals, MVP, tasks, tests, documents — is identical for both. What differs is
-- who the work is for:
--
--   project : internal, built for ourselves, no client
--   job     : commissioned, belongs to a client
--
-- `client_id` was already nullable and already meant "internal when null", so
-- the column below makes an existing convention explicit rather than inventing
-- a new one. Anything that already carries a client is a job by definition, so
-- backfill first and only then add the constraint — otherwise the constraint
-- would reject rows this migration is supposed to describe.
--
-- Every step is guarded. This migration shipped ahead of being applied, which
-- left a deployment running against a database without the column, and the
-- recovery for that is someone pasting this into the SQL editor — possibly
-- twice, possibly after a partial run. Guards make "run it again" harmless
-- instead of a second incident.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'project_kind') then
    create type public.project_kind as enum ('project', 'job');
  end if;
end
$$;

alter table public.projects
  add column if not exists kind public.project_kind not null default 'project';

-- Existing rows with a client are jobs; the rest stay internal projects. Safe to
-- repeat: it only ever moves a row that still disagrees with its own client_id.
update public.projects
   set kind = 'job'
 where client_id is not null
   and kind <> 'job';

/**
 * A client belongs to a job and only to a job. Stated as a constraint rather
 * than left to the form, because the form is one caller and this is the rule:
 * an internal project with a client attached is a contradiction, not a variant.
 *
 * Note the asymmetry — a job may exist before its client is recorded, so a null
 * client on a job is allowed. Only the reverse is refused.
 */
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'projects_client_only_on_jobs'
  ) then
    alter table public.projects
      add constraint projects_client_only_on_jobs
      check (kind = 'job' or client_id is null);
  end if;
end
$$;

comment on column public.projects.kind is
  'project = internal work; job = commissioned work for a client (see projects_client_only_on_jobs).';

create index if not exists projects_org_kind_idx
  on public.projects (organization_id, kind)
  where deleted_at is null;
