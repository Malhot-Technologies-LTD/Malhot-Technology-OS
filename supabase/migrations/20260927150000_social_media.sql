-- Social media: the company's accounts on each platform, the posts planned for
-- them, and who may run it. Managed from the OS at /os/social.
--
-- Who: organisation admins, and members an admin has given the
-- `social_media` duty on Settings → Members. A duty is a grant on top of an
-- organisation role, not a new role: the social media manager is an ordinary
-- member everywhere else (docs/product/user-roles.md#duties). Duties live in
-- their own table, not a column on organization_members, so the app degrades
-- to "no duties" rather than locking everyone out if it is deployed before this
-- migration runs.
--
-- What: planning and tracking only. Posts move idea → draft → approved →
-- scheduled → published, and the manager publishes on each platform
-- themselves, then records the live link. Nothing here holds platform
-- credentials; passwords belong in the company password manager.
--
-- Every statement is guarded, so running this twice (the SQL editor, then
-- `supabase db push`) is harmless.
--
-- Reversal: drop the four tables (channels, posts, accounts, member_duties),
-- then the functions can_manage_social, has_duty and stamp_social_post_published.

-- ---------------------------------------------------------------------------
-- Duties
-- ---------------------------------------------------------------------------
create table if not exists public.member_duties (
  organization_id uuid not null,
  user_id         uuid not null,
  duty            text not null check (duty in ('social_media')),
  granted_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  primary key (organization_id, user_id, duty),
  -- Leaving the organisation takes the duty with it.
  foreign key (organization_id, user_id)
    references public.organization_members (organization_id, user_id) on delete cascade
);
create index if not exists member_duties_user_idx on public.member_duties (user_id);

create or replace function public.has_duty(org uuid, wanted text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.member_duties d
    where d.organization_id = org and d.user_id = auth.uid() and d.duty = wanted
  )
$$;

create or replace function public.can_manage_social(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.is_org_admin(org) or public.has_duty(org, 'social_media') $$;

revoke execute on function public.has_duty(uuid, text) from public, anon;
revoke execute on function public.can_manage_social(uuid) from public, anon;
grant execute on function public.has_duty(uuid, text) to authenticated;
grant execute on function public.can_manage_social(uuid) to authenticated;

alter table public.member_duties enable row level security;
revoke all on table public.member_duties from anon;

-- Colleagues may see who holds which duty; only admins hand them out.
drop policy if exists member_duties_select on public.member_duties;
create policy member_duties_select on public.member_duties
  for select to authenticated using (public.is_org_member(organization_id));
drop policy if exists member_duties_insert on public.member_duties;
create policy member_duties_insert on public.member_duties
  for insert to authenticated with check (public.is_org_admin(organization_id));
drop policy if exists member_duties_delete on public.member_duties;
create policy member_duties_delete on public.member_duties
  for delete to authenticated using (public.is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Accounts: one row per profile the company runs on a platform
-- ---------------------------------------------------------------------------
create table if not exists public.social_accounts (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations(id) on delete cascade,
  platform             text not null
                       check (platform in ('instagram', 'facebook', 'linkedin', 'x', 'tiktok', 'youtube', 'threads', 'whatsapp', 'other')),
  handle               text not null check (char_length(handle) between 1 and 80),
  profile_url          text check (char_length(profile_url) <= 300 and profile_url ~ '^https://'),
  status               text not null default 'active' check (status in ('active', 'paused', 'planned')),
  -- Typed in by hand from the platform's own insights; there is no API link.
  followers            integer check (followers >= 0),
  followers_updated_at timestamptz,
  owner_id             uuid references public.profiles(id) on delete set null,
  notes                text check (char_length(notes) <= 2000),
  created_by           uuid not null references public.profiles(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  -- The target of the composite foreign key from social_post_channels.
  unique (id, organization_id)
);
create unique index if not exists social_accounts_handle_idx
  on public.social_accounts (organization_id, platform, lower(handle));

-- ---------------------------------------------------------------------------
-- Posts
-- ---------------------------------------------------------------------------
create table if not exists public.social_posts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title           text not null check (char_length(title) between 1 and 120),
  caption         text check (char_length(caption) <= 5000),
  format          text not null default 'post'
                  check (format in ('post', 'carousel', 'reel', 'story', 'video', 'article', 'thread')),
  status          text not null default 'idea'
                  check (status in ('idea', 'draft', 'approved', 'scheduled', 'published')),
  scheduled_at    timestamptz,
  published_at    timestamptz,
  -- The content pillar or campaign it belongs to, e.g. "Behind the scenes".
  pillar          text check (char_length(pillar) <= 60),
  -- Where the artwork lives (Canva, Drive, Figma…); files are not stored here.
  asset_url       text check (char_length(asset_url) <= 500 and asset_url ~ '^https://'),
  notes           text check (char_length(notes) <= 2000),
  owner_id        uuid references public.profiles(id) on delete set null,
  created_by      uuid not null references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (id, organization_id),
  -- A scheduled post has a time; a published one says when it went out.
  constraint social_posts_scheduled_has_time check (status <> 'scheduled' or scheduled_at is not null),
  constraint social_posts_published_has_time check (status <> 'published' or published_at is not null)
);
create index if not exists social_posts_org_scheduled_idx on public.social_posts (organization_id, scheduled_at);
create index if not exists social_posts_org_status_idx on public.social_posts (organization_id, status);

-- Marking a post published without a time stamps it now, so the constraint
-- above never rejects the ordinary "it just went out" case.
create or replace function public.stamp_social_post_published()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;
revoke execute on function public.stamp_social_post_published() from public, anon, authenticated;

drop trigger if exists stamp_social_post_published on public.social_posts;
create trigger stamp_social_post_published
  before insert or update of status on public.social_posts
  for each row execute function public.stamp_social_post_published();

-- ---------------------------------------------------------------------------
-- Channels: which accounts a post goes out on, and its live link on each
-- ---------------------------------------------------------------------------
create table if not exists public.social_post_channels (
  organization_id uuid not null,
  post_id         uuid not null,
  account_id      uuid not null,
  published_url   text check (char_length(published_url) <= 500 and published_url ~ '^https://'),
  primary key (post_id, account_id),
  -- Composite keys keep a post and its accounts in the same organisation.
  foreign key (post_id, organization_id)
    references public.social_posts (id, organization_id) on delete cascade,
  foreign key (account_id, organization_id)
    references public.social_accounts (id, organization_id) on delete cascade
);
create index if not exists social_post_channels_account_idx on public.social_post_channels (account_id);

drop trigger if exists set_updated_at on public.social_accounts;
create trigger set_updated_at before update on public.social_accounts
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.social_posts;
create trigger set_updated_at before update on public.social_posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: admins and social media managers, read and write
-- ---------------------------------------------------------------------------
alter table public.social_accounts      enable row level security;
alter table public.social_posts         enable row level security;
alter table public.social_post_channels enable row level security;

revoke all on table public.social_accounts      from anon;
revoke all on table public.social_posts         from anon;
revoke all on table public.social_post_channels from anon;

drop policy if exists social_accounts_all on public.social_accounts;
create policy social_accounts_all on public.social_accounts
  for all to authenticated
  using (public.can_manage_social(organization_id))
  with check (public.can_manage_social(organization_id));

drop policy if exists social_posts_all on public.social_posts;
create policy social_posts_all on public.social_posts
  for all to authenticated
  using (public.can_manage_social(organization_id))
  with check (public.can_manage_social(organization_id));

drop policy if exists social_post_channels_all on public.social_post_channels;
create policy social_post_channels_all on public.social_post_channels
  for all to authenticated
  using (public.can_manage_social(organization_id))
  with check (public.can_manage_social(organization_id));
