-- ---------------------------------------------------------------------------
-- Company files: folders, and the documents filed in them
--
-- Until now a document could only be saved to a project (project_documents)
-- or a person (member_documents). Much of a company's paperwork belongs to
-- neither: a company profile, a policy, an invoice for work outside a project.
-- The owner asked for a file explorer: folders inside folders, and any
-- document, uploaded or generated, saved into one of them.
--
--   file_folders   a tree per organisation (parent_id null = top level)
--   company_files  one row per document; folder_id null = top level. Same
--                  upload / generated shape as project_documents.
--
-- Who sees what: everyone in the organisation sees every folder, except those
-- an admin marked restricted ("Admins only"), which only admins see. A
-- restricted folder's subfolders are restricted too, whatever they say
-- themselves; a file is visible exactly when its folder is. Anyone may add to
-- a folder they can see; the creator or an admin may rename, move or delete.
-- A non-admin may only delete an empty folder, so nobody can take other
-- people's files down with a folder they happen to have created.
--
-- Uploads live in the private `company-files` bucket as
-- `<organization_id>/<uuid>-<file name>`. Downloads are signed on the viewer's
-- own session and the bucket's SELECT policy looks the file up through
-- company_files, so a file in a restricted folder cannot be fetched by path.
--
-- Every statement is guarded, so running this twice is harmless.
--
-- Reversal: drop the storage policies, delete the bucket's objects and the
-- bucket, drop company_files, file_folders and the helper functions.
-- ---------------------------------------------------------------------------

create table if not exists public.file_folders (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  parent_id       uuid references public.file_folders(id) on delete cascade,
  name            text not null check (char_length(btrim(name)) between 1 and 120 and name !~ '[/\\]'),
  restricted      boolean not null default false,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint file_folders_not_own_parent check (parent_id is null or parent_id <> id)
);

-- Two folders side by side may not share a name, ignoring case, as in any file explorer.
create unique index if not exists file_folders_sibling_name
  on public.file_folders (organization_id, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(btrim(name)));
create index if not exists file_folders_parent_idx on public.file_folders (organization_id, parent_id);

drop trigger if exists set_updated_at on public.file_folders;
create trigger set_updated_at before update on public.file_folders
  for each row execute function public.set_updated_at();

create table if not exists public.company_files (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  folder_id       uuid references public.file_folders(id) on delete cascade,
  title           text not null check (char_length(btrim(title)) between 1 and 200),
  type            public.document_type not null default 'other',
  description     text check (char_length(description) <= 2000),
  source          text not null check (source in ('upload', 'generated')),
  storage_path    text unique check (char_length(storage_path) <= 400),
  file_name       text check (char_length(file_name) <= 255),
  mime_type       text check (char_length(mime_type) <= 200),
  size_bytes      bigint check (size_bytes between 1 and 26214400),
  template_key    text check (char_length(template_key) <= 60),
  fields          jsonb,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint company_files_source_shape check (
    (source = 'upload'
      and storage_path is not null and file_name is not null and mime_type is not null and size_bytes is not null
      and template_key is null and fields is null)
    or (source = 'generated'
      and template_key is not null and fields is not null
      and storage_path is null and file_name is null and mime_type is null and size_bytes is null)
  ),
  constraint company_files_path_in_org check (
    storage_path is null or split_part(storage_path, '/', 1) = organization_id::text
  )
);
create index if not exists company_files_folder_idx on public.company_files (organization_id, folder_id, created_at desc);

drop trigger if exists set_updated_at on public.company_files;
create trigger set_updated_at before update on public.company_files
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Tree integrity
-- ---------------------------------------------------------------------------

/**
 * Before a folder is written: it stays in its organisation, keeps its creator,
 * its parent is in the same organisation, it never becomes its own ancestor,
 * and it is restricted if its parent is.
 */
create or replace function public.file_folder_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent public.file_folders;
  cursor_id uuid;
  depth int := 0;
begin
  if tg_op = 'UPDATE' and new.organization_id <> old.organization_id then
    perform public.raise_malhot('invariant', 'A folder cannot move to another organisation.');
  end if;
  -- The creator holds the rights to it, so it is never handed on; only a deleted profile clears it.
  if tg_op = 'UPDATE' and new.created_by is not null and new.created_by is distinct from old.created_by then
    perform public.raise_malhot('invariant', 'Who created a folder cannot be changed.');
  end if;

  if new.parent_id is not null then
    select * into parent from public.file_folders where id = new.parent_id;
    if not found or parent.organization_id <> new.organization_id then
      perform public.raise_malhot('invariant', 'That folder does not exist.');
    end if;
    if parent.restricted then
      new.restricted := true;
    end if;

    if tg_op = 'UPDATE' and new.parent_id is distinct from old.parent_id then
      cursor_id := new.parent_id;
      while cursor_id is not null loop
        if cursor_id = new.id then
          perform public.raise_malhot('invariant', 'A folder cannot move inside itself.');
        end if;
        depth := depth + 1;
        if depth > 64 then
          perform public.raise_malhot('invariant', 'Folders cannot be nested that deep.');
        end if;
        select f.parent_id into cursor_id from public.file_folders f where f.id = cursor_id;
      end loop;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists file_folder_guard on public.file_folders;
create trigger file_folder_guard before insert or update on public.file_folders
  for each row execute function public.file_folder_guard();

/**
 * After a folder becomes restricted, so does everything under it. Lifting the
 * restriction leaves subfolders as they are: a folder an admin restricted on
 * its own stays restricted.
 */
create or replace function public.file_folder_restrict_children()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.restricted and not old.restricted then
    update public.file_folders set restricted = true where parent_id = new.id and not restricted;
  end if;
  return null;
end;
$$;

drop trigger if exists file_folder_restrict_children on public.file_folders;
create trigger file_folder_restrict_children after update of restricted, parent_id on public.file_folders
  for each row execute function public.file_folder_restrict_children();

/** A file's folder must belong to the file's organisation, and its creator never changes. */
create or replace function public.company_file_folder_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.organization_id <> old.organization_id then
    perform public.raise_malhot('invariant', 'A file cannot move to another organisation.');
  end if;
  if tg_op = 'UPDATE' and new.created_by is not null and new.created_by is distinct from old.created_by then
    perform public.raise_malhot('invariant', 'Who added a file cannot be changed.');
  end if;
  if new.folder_id is not null and not exists (
    select 1 from public.file_folders f where f.id = new.folder_id and f.organization_id = new.organization_id
  ) then
    perform public.raise_malhot('invariant', 'That folder does not exist.');
  end if;
  return new;
end;
$$;

drop trigger if exists company_file_folder_guard on public.company_files;
create trigger company_file_folder_guard before insert or update on public.company_files
  for each row execute function public.company_file_folder_guard();

revoke execute on function public.file_folder_guard() from public, anon, authenticated;
revoke execute on function public.file_folder_restrict_children() from public, anon, authenticated;
revoke execute on function public.company_file_folder_guard() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Visibility helpers (security definer, so policies can ask without recursing)
-- ---------------------------------------------------------------------------

/** Whether the caller may see this folder: a member of its organisation, and an admin if it is restricted. */
create or replace function public.can_see_file_folder(folder uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.file_folders f
    where f.id = folder
      and public.is_org_member(f.organization_id)
      and (not f.restricted or public.is_org_admin(f.organization_id))
  )
$$;

/**
 * Whether a folder has nothing in it, counting what the caller cannot see.
 * False for a folder outside the caller's organisation, so it reveals nothing there.
 */
create or replace function public.file_folder_is_empty(folder uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.file_folders f where f.id = folder and public.is_org_member(f.organization_id))
     and not exists (select 1 from public.file_folders where parent_id = folder)
     and not exists (select 1 from public.company_files where folder_id = folder)
$$;

revoke execute on function public.can_see_file_folder(uuid) from public, anon;
revoke execute on function public.file_folder_is_empty(uuid) from public, anon;
grant execute on function public.can_see_file_folder(uuid) to authenticated;
grant execute on function public.file_folder_is_empty(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.file_folders  enable row level security;
alter table public.company_files enable row level security;
revoke all on table public.file_folders  from anon;
revoke all on table public.company_files from anon;

drop policy if exists file_folders_select on public.file_folders;
create policy file_folders_select on public.file_folders
  for select to authenticated
  using (public.is_org_member(organization_id) and (not restricted or public.is_org_admin(organization_id)));

-- Only admins create restricted folders; everyone else creates open ones where they can see.
drop policy if exists file_folders_insert on public.file_folders;
create policy file_folders_insert on public.file_folders
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and public.is_org_member(organization_id)
    and (not restricted or public.is_org_admin(organization_id))
    and (parent_id is null or public.can_see_file_folder(parent_id))
  );

drop policy if exists file_folders_update on public.file_folders;
create policy file_folders_update on public.file_folders
  for update to authenticated
  using (
    public.is_org_admin(organization_id)
    or (created_by = (select auth.uid()) and public.is_org_member(organization_id) and not restricted)
  )
  with check (
    public.is_org_member(organization_id)
    and (not restricted or public.is_org_admin(organization_id))
    and (parent_id is null or public.can_see_file_folder(parent_id))
  );

drop policy if exists file_folders_delete on public.file_folders;
create policy file_folders_delete on public.file_folders
  for delete to authenticated
  using (
    public.is_org_admin(organization_id)
    or (
      created_by = (select auth.uid())
      and public.is_org_member(organization_id)
      and not restricted
      and public.file_folder_is_empty(id)
    )
  );

drop policy if exists company_files_select on public.company_files;
create policy company_files_select on public.company_files
  for select to authenticated
  using (public.is_org_member(organization_id) and (folder_id is null or public.can_see_file_folder(folder_id)));

drop policy if exists company_files_insert on public.company_files;
create policy company_files_insert on public.company_files
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and public.is_org_member(organization_id)
    and (folder_id is null or public.can_see_file_folder(folder_id))
  );

drop policy if exists company_files_update on public.company_files;
create policy company_files_update on public.company_files
  for update to authenticated
  using (
    (public.is_org_admin(organization_id) or (created_by = (select auth.uid()) and public.is_org_member(organization_id)))
    and (folder_id is null or public.can_see_file_folder(folder_id))
  )
  with check (
    public.is_org_member(organization_id)
    and (folder_id is null or public.can_see_file_folder(folder_id))
  );

drop policy if exists company_files_delete on public.company_files;
create policy company_files_delete on public.company_files
  for delete to authenticated
  using (
    (public.is_org_admin(organization_id) or (created_by = (select auth.uid()) and public.is_org_member(organization_id)))
    and (folder_id is null or public.can_see_file_folder(folder_id))
  );

comment on table public.file_folders is
  'Company file explorer folders, a tree per organisation. restricted = admins only, inherited by subfolders.';
comment on table public.company_files is
  'Documents filed in company folders: uploads (company-files bucket) and generated letterhead documents.';

-- ---------------------------------------------------------------------------
-- Storage: the private company-files bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-files',
  'company-files',
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

/** The organisation an object name belongs to, or null when the name is malformed. */
create or replace function public.company_file_org(object_name text)
returns uuid
language plpgsql
immutable
set search_path = public
as $$
declare
  segment text := split_part(object_name, '/', 1);
begin
  if segment !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;
  return segment::uuid;
end;
$$;
revoke execute on function public.company_file_org(text) from public, anon;
grant execute on function public.company_file_org(text) to authenticated;

/**
 * Whether any file row points at this object, including rows the caller cannot
 * see. Security definer on purpose: asked under the caller's RLS, a file in a
 * restricted folder would look unrecorded, and its uploader could read it.
 */
create or replace function public.company_file_is_recorded(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.company_files where storage_path = object_name)
$$;
revoke execute on function public.company_file_is_recorded(text) from public, anon;
grant execute on function public.company_file_is_recorded(text) to authenticated;

-- Read through the file's row, so folder restrictions reach the bytes too.
-- The uploader and admins also see an object whose row is gone: Storage's
-- delete must pass this policy, so without it a file whose record was deleted
-- first (a folder deleted with everything in it, a failed record) could never
-- be removed except with the service role.
drop policy if exists company_files_objects_select on storage.objects;
create policy company_files_objects_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'company-files'
    and (
      exists (select 1 from public.company_files f where f.storage_path = name)
      or (
        not public.company_file_is_recorded(name)
        and (
          public.is_org_admin(public.company_file_org(name))
          or (owner_id = (select auth.uid())::text and public.is_org_member(public.company_file_org(name)))
        )
      )
    )
  );

drop policy if exists company_files_objects_insert on storage.objects;
create policy company_files_objects_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'company-files' and public.is_org_member(public.company_file_org(name)));

drop policy if exists company_files_objects_delete on storage.objects;
create policy company_files_objects_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'company-files'
    and (public.is_org_admin(public.company_file_org(name)) or owner_id = (select auth.uid())::text)
  );
