-- Website showcase: which projects appear on the public site, the copy they
-- appear with, and their photos. Managed from Settings → Website.
--
-- The public copy lives beside the project, not on it. A project's name and
-- description are written for the team; a case study is written for strangers,
-- often with a client who must approve being named. Keeping them apart means an
-- internal edit can never leak onto the website, and the only table anonymous
-- visitors can read is this one — `projects` stays private.
--
-- Photos are files in the public `site-media` bucket, one row each in
-- project_showcase_images. The bucket is public so the website can serve them
-- without signed URLs; object names carry a random UUID, and nothing lists the
-- bucket, so a photo attached to an unpublished project is unguessable rather
-- than secret. Do not put confidential material in it.
--
-- Every statement is guarded, so running this twice (the SQL editor, then
-- `supabase db push` in the release workflow) is harmless. See the note in
-- 20260923080000_project_kind.sql for why that matters here.
--
-- Reversal: drop the storage policies, delete the bucket's objects and the
-- bucket, drop the trigger on projects, then the two tables and the helper.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.project_showcases (
  project_id      uuid primary key references public.projects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug            text not null unique
                  check (char_length(slug) between 1 and 80 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  published       boolean not null default false,
  title           text not null check (char_length(title) between 1 and 120),
  category        text not null default 'Web' check (category in ('Web', 'Mobile', 'Design', 'Marketing')),
  scope           text check (char_length(scope) <= 120),
  year            smallint check (year between 2000 and 2100),
  -- Null means the client is not named on the site.
  client_label    text check (char_length(client_label) <= 120),
  summary         text not null check (char_length(summary) between 1 and 300),
  overview        text check (char_length(overview) <= 5000),
  features        text[] not null default '{}' check (cardinality(features) <= 20),
  stack           text[] not null default '{}' check (cardinality(stack) <= 20),
  live_url        text check (char_length(live_url) <= 300 and live_url ~ '^https://'),
  position        double precision not null default 0,
  created_by      uuid not null references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists project_showcases_published_idx on public.project_showcases (position) where published;
create index if not exists project_showcases_org_idx on public.project_showcases (organization_id);

create table if not exists public.project_showcase_images (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.project_showcases(project_id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) <= 300),
  alt          text not null check (char_length(alt) between 1 and 200),
  position     double precision not null,
  created_by   uuid not null references public.profiles(id),
  created_at   timestamptz not null default now()
);
create index if not exists project_showcase_images_project_idx on public.project_showcase_images (project_id, position);

drop trigger if exists set_updated_at on public.project_showcases;
create trigger set_updated_at before update on public.project_showcases
  for each row execute function public.set_updated_at();

-- A deleted project leaves the website with it. Archived projects stay: a
-- finished project is exactly what a portfolio shows.
create or replace function public.unpublish_deleted_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.project_showcases set published = false where project_id = new.id and published;
  return new;
end;
$$;
revoke execute on function public.unpublish_deleted_project() from public, anon, authenticated;

drop trigger if exists unpublish_deleted_project on public.projects;
create trigger unpublish_deleted_project
  after update of deleted_at on public.projects
  for each row when (new.deleted_at is not null and old.deleted_at is null)
  execute function public.unpublish_deleted_project();

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Visitors (anon) read published showcases and their photos, nothing else.
-- Org admins read and write everything in their organisation. The anon
-- policies deliberately call no helper: anon holds no EXECUTE on them.
-- ---------------------------------------------------------------------------
alter table public.project_showcases       enable row level security;
alter table public.project_showcase_images enable row level security;

revoke all on table public.project_showcases       from anon;
revoke all on table public.project_showcase_images from anon;
grant select on table public.project_showcases       to anon;
grant select on table public.project_showcase_images to anon;

drop policy if exists project_showcases_public_select on public.project_showcases;
create policy project_showcases_public_select on public.project_showcases
  for select to anon using (published);
drop policy if exists project_showcases_select on public.project_showcases;
create policy project_showcases_select on public.project_showcases
  for select to authenticated using (published or public.is_org_admin(organization_id));
-- The organisation is checked against the project's own, so an admin cannot
-- attach a showcase to another organisation's project by lying about it.
drop policy if exists project_showcases_insert on public.project_showcases;
create policy project_showcases_insert on public.project_showcases
  for insert to authenticated
  with check (public.is_org_admin(organization_id) and organization_id = public.project_org(project_id));
drop policy if exists project_showcases_update on public.project_showcases;
create policy project_showcases_update on public.project_showcases
  for update to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id) and organization_id = public.project_org(project_id));
drop policy if exists project_showcases_delete on public.project_showcases;
create policy project_showcases_delete on public.project_showcases
  for delete to authenticated using (public.is_org_admin(organization_id));

drop policy if exists project_showcase_images_public_select on public.project_showcase_images;
create policy project_showcase_images_public_select on public.project_showcase_images
  for select to anon using (
    exists (select 1 from public.project_showcases s where s.project_id = project_showcase_images.project_id and s.published)
  );
drop policy if exists project_showcase_images_select on public.project_showcase_images;
create policy project_showcase_images_select on public.project_showcase_images
  for select to authenticated using (
    exists (select 1 from public.project_showcases s where s.project_id = project_showcase_images.project_id)
  );
drop policy if exists project_showcase_images_write on public.project_showcase_images;
create policy project_showcase_images_write on public.project_showcase_images
  for all to authenticated
  using (public.is_org_admin(public.project_org(project_id)))
  with check (public.is_org_admin(public.project_org(project_id)));

-- ---------------------------------------------------------------------------
-- Storage: the public site-media bucket.
--
-- Object names are `<organization_id>/…`; writes are allowed to that
-- organisation's admins. Visitors need no policy: the bucket is public and is
-- served through its public URL. The SELECT policy exists only because Storage
-- reads the row back on delete; it is limited to the same admins, so nobody
-- else can list the bucket through the API.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media', 'site-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

/** True when the caller administers the organisation an object name starts with. */
create or replace function public.can_manage_site_media(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  org_segment text := split_part(object_name, '/', 1);
begin
  -- Checked before the cast, so a malformed name is refused rather than raising.
  if org_segment !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.is_org_admin(org_segment::uuid);
end;
$$;
revoke execute on function public.can_manage_site_media(text) from public, anon;
grant execute on function public.can_manage_site_media(text) to authenticated;

drop policy if exists site_media_select on storage.objects;
create policy site_media_select on storage.objects
  for select to authenticated
  using (bucket_id = 'site-media' and public.can_manage_site_media(name));
drop policy if exists site_media_insert on storage.objects;
create policy site_media_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site-media' and public.can_manage_site_media(name));
drop policy if exists site_media_update on storage.objects;
create policy site_media_update on storage.objects
  for update to authenticated
  using (bucket_id = 'site-media' and public.can_manage_site_media(name))
  with check (bucket_id = 'site-media' and public.can_manage_site_media(name));
drop policy if exists site_media_delete on storage.objects;
create policy site_media_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'site-media' and public.can_manage_site_media(name));
