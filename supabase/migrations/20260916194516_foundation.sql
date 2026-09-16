-- 0001 foundation: extensions, enums, shared trigger functions.
-- Blueprint: docs/database/schema.md. Reversal: drop types in reverse order (no data depends on them yet).

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums (closed vocabularies). Add values with `alter type ... add value if not exists`.
-- ---------------------------------------------------------------------------
create type public.org_role           as enum ('owner','admin','member');
create type public.project_role       as enum ('manager','developer','designer','qa','marketer','viewer');
create type public.project_status     as enum ('planning','active','on_hold','completed','archived');
create type public.project_health     as enum ('on_track','at_risk','off_track');
create type public.priority           as enum ('low','medium','high','urgent');
create type public.task_status        as enum ('backlog','todo','in_progress','review','testing','done');
create type public.goal_status        as enum ('not_started','in_progress','achieved','dropped');
create type public.mvp_item_status    as enum ('planned','in_progress','done','dropped');
create type public.bug_status         as enum ('open','in_progress','fixed','retest','closed');
create type public.bug_severity       as enum ('low','medium','high','critical');
create type public.test_result_status as enum ('pass','fail','blocked');
create type public.document_type      as enum ('project_brief','requirements','mvp_specification','project_plan',
                                               'meeting_notes','testing_report','deployment_report','final_report','other');
create type public.document_status    as enum ('draft','in_review','approved','archived');
create type public.notification_type  as enum ('task_assigned','mentioned','review_requested','testing_requested',
                                               'task_overdue','project_updated','bug_assigned',
                                               'document_review_requested','document_approved','inquiry_received');
create type public.entity_type        as enum ('organization','member','project','goal','mvp_item','milestone','task',
                                               'comment','attachment','test_case','test_run','test_result','bug',
                                               'document','github_repository','github_pull_request','github_issue',
                                               'deployment','inquiry');
create type public.deployment_env     as enum ('preview','staging','production');
create type public.deployment_status  as enum ('pending','in_progress','success','failure');
create type public.invitation_status  as enum ('pending','accepted','revoked','expired');
create type public.github_link_kind   as enum ('issue','pull_request');
create type public.link_source        as enum ('auto','manual');
create type public.pr_state           as enum ('open','closed','merged');
create type public.issue_state        as enum ('open','closed');

-- ---------------------------------------------------------------------------
-- Shared trigger: maintain updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Error helper: triggers raise MALHOT:<code>:<detail> so the app can map them.
-- codes: forbidden | invalid_transition | invariant
-- ---------------------------------------------------------------------------
create or replace function public.raise_malhot(code text, detail text)
returns void
language plpgsql
as $$
begin
  raise exception using errcode = 'P0001', message = format('MALHOT:%s:%s', code, detail);
end;
$$;
