-- ---------------------------------------------------------------------------
-- Project documents: uploaded files and generated letterhead documents
--
-- The owner chose uploaded files over the in-app editor described in
-- docs/features/documents.md, and then asked for professional documents
-- (contracts, offer letters, NDAs…) generated on Malhot letterhead. Both kinds
-- live in one table so a project has one list of its paperwork:
--
--   source = 'upload'     a file in the private `project-files` bucket
--   source = 'generated'  a template key plus the values it was filled with;
--                         the document is re-rendered from them, never stored
--                         as a file, so the letterhead can improve over time
--
-- Named project_documents rather than documents so the editor design keeps its
-- name if it is ever built.
--
-- Reversal: drop the storage policies and the helper, delete the bucket's
-- objects and the bucket, then drop the table.
-- ---------------------------------------------------------------------------

create table if not exists public.project_documents (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 200),
  type         public.document_type not null default 'other',
  description  text check (char_length(description) <= 2000),
  source       text not null check (source in ('upload', 'generated')),
  storage_path text unique check (char_length(storage_path) <= 400),
  file_name    text check (char_length(file_name) <= 255),
  mime_type    text check (char_length(mime_type) <= 200),
  size_bytes   bigint check (size_bytes between 1 and 26214400),
  template_key text check (char_length(template_key) <= 60),
  fields       jsonb,
  uploaded_by  uuid not null references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint project_documents_source_shape check (
    (source = 'upload'
      and storage_path is not null and file_name is not null and mime_type is not null and size_bytes is not null
      and template_key is null and fields is null)
    or (source = 'generated'
      and template_key is not null and fields is not null
      and storage_path is null and file_name is null and mime_type is null and size_bytes is null)
  ),
  -- An upload must live under its own project's folder; the storage policies
  -- read the project from the path, so the two can never point different ways.
  constraint project_documents_path_in_project check (
    storage_path is null or split_part(storage_path, '/', 1) = project_id::text
  )
);

create index if not exists project_documents_project_idx on public.project_documents (project_id, created_at desc);

drop trigger if exists set_updated_at on public.project_documents;
create trigger set_updated_at before update on public.project_documents
  for each row execute function public.set_updated_at();

alter table public.project_documents enable row level security;

-- Everyone on the project reads its paperwork; contributors add to it; the
-- manager or whoever added a document may change or remove it.
drop policy if exists project_documents_select on public.project_documents;
create policy project_documents_select on public.project_documents
  for select to authenticated using (public.is_project_member(project_id));

drop policy if exists project_documents_insert on public.project_documents;
create policy project_documents_insert on public.project_documents
  for insert to authenticated
  with check (
    public.can_contribute(project_id)
    and public.project_is_writable(project_id)
    and uploaded_by = public.auth_uid()
  );

drop policy if exists project_documents_update on public.project_documents;
create policy project_documents_update on public.project_documents
  for update to authenticated
  using (public.can_manage_project(project_id) or uploaded_by = public.auth_uid())
  with check (
    public.project_is_writable(project_id)
    and (public.can_manage_project(project_id) or (uploaded_by = public.auth_uid() and public.can_contribute(project_id)))
  );

drop policy if exists project_documents_delete on public.project_documents;
create policy project_documents_delete on public.project_documents
  for delete to authenticated
  using (
    public.can_manage_project(project_id)
    or (uploaded_by = public.auth_uid() and public.can_contribute(project_id))
  );

comment on table public.project_documents is
  'A project''s paperwork: uploaded files (project-files bucket) and generated letterhead documents (template_key + fields).';

-- ---------------------------------------------------------------------------
-- Storage: the private project-files bucket
--
-- Object names are `<project_id>/<uuid>-<file name>`. Reads go through
-- short-lived signed URLs created on the viewer's own session, so the SELECT
-- policy is what decides who can download.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-files',
  'project-files',
  false,
  26214400,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/zip'
  ]
)
on conflict (id) do nothing;

/** The project an object name belongs to, or null when the name is malformed. */
create or replace function public.project_file_project(object_name text)
returns uuid
language plpgsql
immutable
set search_path = public
as $$
declare
  segment text := split_part(object_name, '/', 1);
begin
  -- Checked before the cast, so a malformed name is refused rather than raising.
  if segment !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;
  return segment::uuid;
end;
$$;
revoke execute on function public.project_file_project(text) from public, anon;
grant execute on function public.project_file_project(text) to authenticated;

drop policy if exists project_files_select on storage.objects;
create policy project_files_select on storage.objects
  for select to authenticated
  using (bucket_id = 'project-files' and public.is_project_member(public.project_file_project(name)));

drop policy if exists project_files_insert on storage.objects;
create policy project_files_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-files'
    and public.can_contribute(public.project_file_project(name))
    and public.project_is_writable(public.project_file_project(name))
  );

-- The uploader may remove their own object (including one whose record failed
-- to save); the manager may remove any.
drop policy if exists project_files_delete on storage.objects;
create policy project_files_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'project-files'
    and (
      public.can_manage_project(public.project_file_project(name))
      or owner_id = (select auth.uid())::text
    )
  );
