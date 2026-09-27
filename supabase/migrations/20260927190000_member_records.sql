-- People records: employment details and personal paperwork (contracts, offer
-- letters, ID copies…) for each member, shown on their page under /os/team.
--
-- Who can see it: organisation admins, and the person themselves. Nobody else —
-- not a project manager, not a colleague. A contract carries pay, and an ID copy
-- is personal data; the work side of a person's page (projects, tasks) is
-- separate and follows the usual project visibility.
--
-- Records are keyed to the person (profiles), not to their membership, so they
-- outlive someone leaving the organisation: an ex-employee's contract is exactly
-- the paperwork a company must keep.
--
-- Files live in the private `member-files` bucket as
-- `<organization_id>/<user_id>/<uuid>-<file name>`; the storage policies read
-- both from the path, and a CHECK keeps each row's path inside its own folder.
--
-- Every statement is guarded, so running this twice is harmless.
--
-- Reversal: drop the storage policies, delete the bucket's objects and the
-- bucket, drop member_documents, member_records and the two path helpers.

-- ---------------------------------------------------------------------------
-- Employment details, one row per person per organisation
-- ---------------------------------------------------------------------------
create table if not exists public.member_records (
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  position          text check (char_length(position) <= 120),
  department        text check (char_length(department) <= 80),
  employment_type   text check (employment_type in ('full_time', 'part_time', 'contract', 'intern', 'freelance')),
  start_date        date,
  end_date          date,
  reports_to        uuid references public.profiles(id) on delete set null,
  work_phone        text check (char_length(work_phone) <= 40),
  work_location     text check (char_length(work_location) <= 120),
  emergency_contact text check (char_length(emergency_contact) <= 200),
  notes             text check (char_length(notes) <= 4000),
  updated_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (organization_id, user_id),
  constraint member_records_dates check (end_date is null or start_date is null or end_date >= start_date),
  constraint member_records_not_own_manager check (reports_to is null or reports_to <> user_id)
);

drop trigger if exists set_updated_at on public.member_records;
create trigger set_updated_at before update on public.member_records
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Personal documents: uploads and generated letterhead documents
-- ---------------------------------------------------------------------------
create table if not exists public.member_documents (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  title           text not null check (char_length(title) between 1 and 200),
  kind            text not null default 'other'
                  check (kind in ('contract', 'offer', 'identity', 'certificate', 'payslip', 'other')),
  source          text not null check (source in ('upload', 'generated')),
  storage_path    text unique check (char_length(storage_path) <= 400),
  file_name       text check (char_length(file_name) <= 255),
  mime_type       text check (char_length(mime_type) <= 200),
  size_bytes      bigint check (size_bytes between 1 and 26214400),
  template_key    text check (char_length(template_key) <= 60),
  fields          jsonb,
  created_by      uuid not null references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint member_documents_source_shape check (
    (source = 'upload'
      and storage_path is not null and file_name is not null and mime_type is not null and size_bytes is not null
      and template_key is null and fields is null)
    or (source = 'generated'
      and template_key is not null and fields is not null
      and storage_path is null and file_name is null and mime_type is null and size_bytes is null)
  ),
  constraint member_documents_path_in_folder check (
    storage_path is null
    or (split_part(storage_path, '/', 1) = organization_id::text and split_part(storage_path, '/', 2) = user_id::text)
  )
);
create index if not exists member_documents_person_idx on public.member_documents (organization_id, user_id, created_at desc);

drop trigger if exists set_updated_at on public.member_documents;
create trigger set_updated_at before update on public.member_documents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: admins read and write; the person reads their own
-- ---------------------------------------------------------------------------
alter table public.member_records   enable row level security;
alter table public.member_documents enable row level security;
revoke all on table public.member_records   from anon;
revoke all on table public.member_documents from anon;

drop policy if exists member_records_select on public.member_records;
create policy member_records_select on public.member_records
  for select to authenticated
  using (public.is_org_admin(organization_id) or user_id = (select auth.uid()));
drop policy if exists member_records_write on public.member_records;
create policy member_records_write on public.member_records
  for all to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

drop policy if exists member_documents_select on public.member_documents;
create policy member_documents_select on public.member_documents
  for select to authenticated
  using (public.is_org_admin(organization_id) or user_id = (select auth.uid()));
drop policy if exists member_documents_insert on public.member_documents;
create policy member_documents_insert on public.member_documents
  for insert to authenticated
  with check (public.is_org_admin(organization_id) and created_by = (select auth.uid()));
drop policy if exists member_documents_update on public.member_documents;
create policy member_documents_update on public.member_documents
  for update to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
drop policy if exists member_documents_delete on public.member_documents;
create policy member_documents_delete on public.member_documents
  for delete to authenticated
  using (public.is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Storage: the private member-files bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'member-files',
  'member-files',
  false,
  26214400,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
on conflict (id) do nothing;

/** The uuid in path segment `n` of an object name, or null when it is not one. */
create or replace function public.member_file_segment(object_name text, n integer)
returns uuid
language plpgsql
immutable
set search_path = public
as $$
declare
  segment text := split_part(object_name, '/', n);
begin
  if segment !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;
  return segment::uuid;
end;
$$;
revoke execute on function public.member_file_segment(text, integer) from public, anon;
grant execute on function public.member_file_segment(text, integer) to authenticated;

drop policy if exists member_files_select on storage.objects;
create policy member_files_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'member-files'
    and (
      public.is_org_admin(public.member_file_segment(name, 1))
      or public.member_file_segment(name, 2) = (select auth.uid())
    )
  );

drop policy if exists member_files_insert on storage.objects;
create policy member_files_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'member-files' and public.is_org_admin(public.member_file_segment(name, 1)));

drop policy if exists member_files_delete on storage.objects;
create policy member_files_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'member-files' and public.is_org_admin(public.member_file_segment(name, 1)));
