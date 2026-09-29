-- ---------------------------------------------------------------------------
-- Profile photos
--
-- `profiles.avatar_url` has existed since the identity migration, but only
-- something outside the OS could ever fill it: the sign-up trigger copies
-- `avatar_url` or `picture` out of an OAuth provider's metadata, and anyone who
-- signed up with an email and a password simply had no way to put a face to
-- their name. UserAvatar has been falling back to initials for everyone.
--
-- A bucket of its own rather than a folder in site-media, because the
-- authorisation is different in kind: site-media is administered by an
-- organisation's admins, and a photo of your own face is yours. The write
-- policies here authorise on the object's first path segment being the caller.
--
-- Public, like site-media. An avatar is shown beside its owner's name on nearly
-- every screen in the OS, and signing a URL per face per render would be a
-- round trip for something that is, by intent, how you look to your colleagues.
-- The random file name keeps the URL unguessable; the folder is the user id, so
-- a URL discloses nothing an authenticated colleague could not already see.
--
-- Reversal: drop the policies and the helper, delete the bucket's objects and
-- the bucket, and null out profiles.avatar_url where it points at this bucket.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

/**
 * True when the object name starts with the caller's own user id.
 *
 * Deliberately not "is an org admin too". An admin can already change someone's
 * role and remove them from the company; being able to silently replace the
 * photograph of their face is a different kind of power and nothing in the
 * product needs it.
 */
create or replace function public.owns_avatar(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  owner_segment text := split_part(object_name, '/', 1);
begin
  -- Checked before the cast, so a malformed name is refused rather than raising.
  if owner_segment !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return owner_segment::uuid = public.auth_uid();
end;
$$;
revoke execute on function public.owns_avatar(text) from public, anon;
grant execute on function public.owns_avatar(text) to authenticated;

/*
 * Readers need no policy — the bucket is public and every avatar is served
 * through its public URL. This SELECT exists because Storage reads the row back
 * when deleting one, and because it keeps the listing API closed: without it
 * any signed-in person could enumerate the bucket.
 */
drop policy if exists avatars_select on storage.objects;
create policy avatars_select on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and public.owns_avatar(name));

drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and public.owns_avatar(name));

drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and public.owns_avatar(name))
  with check (bucket_id = 'avatars' and public.owns_avatar(name));

drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and public.owns_avatar(name));
