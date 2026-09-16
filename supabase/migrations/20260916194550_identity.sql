-- 0002 identity: organizations, profiles, organization_members, invitations, clients.
-- Blueprint: docs/database/schema.md · Policies: docs/database/rls-policies.md
-- Reversal: drop tables in reverse order; drop functions.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 120),
  slug        text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  logo_url    text,
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 120),
  avatar_url  text,
  title       text check (char_length(title) <= 80),
  timezone    text not null default 'Africa/Kigali',
  preferences jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  role            public.org_role not null default 'member',
  joined_at       timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index organization_members_user_idx on public.organization_members (user_id);

create table public.invitations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email           extensions.citext not null,
  org_role        public.org_role not null default 'member',
  project_grants  jsonb not null default '[]'::jsonb,
  token_hash      text not null unique,
  status          public.invitation_status not null default 'pending',
  invited_by      uuid not null references public.profiles(id),
  expires_at      timestamptz not null,
  accepted_at     timestamptz,
  revoked_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index invitations_org_status_idx on public.invitations (organization_id, status);
create unique index invitations_pending_email_idx
  on public.invitations (organization_id, email) where status = 'pending';

create table public.clients (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 120),
  contact_name    text,
  contact_email   text,
  website         text,
  notes           text,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, name)
);

-- updated_at triggers
create trigger set_updated_at before update on public.organizations        for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.profiles             for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.organization_members for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.invitations          for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.clients              for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- auth.users → profiles
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- Authorisation helpers (security definer so policies can consult membership
-- tables without recursing into their own policies). Read-only, no dynamic SQL.
-- ---------------------------------------------------------------------------
create or replace function public.auth_uid()
returns uuid
language sql
stable
set search_path = public
as $$ select auth.uid() $$;

create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = auth.uid()
  )
$$;

create or replace function public.is_org_admin(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = auth.uid() and m.role in ('owner','admin')
  )
$$;

create or replace function public.is_org_owner(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = auth.uid() and m.role = 'owner'
  )
$$;

/** Does the caller share at least one organisation with the given user? */
create or replace function public.shares_org_with(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members mine
    join public.organization_members theirs on theirs.organization_id = mine.organization_id
    where mine.user_id = auth.uid() and theirs.user_id = other
  )
$$;

revoke execute on function public.auth_uid() from public;
revoke execute on function public.is_org_member(uuid) from public;
revoke execute on function public.is_org_admin(uuid) from public;
revoke execute on function public.is_org_owner(uuid) from public;
revoke execute on function public.shares_org_with(uuid) from public;
grant execute on function public.auth_uid() to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;
grant execute on function public.is_org_owner(uuid) to authenticated;
grant execute on function public.shares_org_with(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Invariant: an organisation always keeps at least one owner.
-- ---------------------------------------------------------------------------
create or replace function public.protect_last_owner()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  remaining int;
begin
  if (tg_op = 'DELETE' and old.role = 'owner')
     or (tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner') then
    select count(*) into remaining
    from public.organization_members
    where organization_id = old.organization_id and role = 'owner' and id <> old.id;
    if remaining = 0 then
      perform public.raise_malhot('invariant', 'An organisation must keep at least one owner');
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger protect_last_owner
  before update or delete on public.organization_members
  for each row execute function public.protect_last_owner();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.organizations        enable row level security;
alter table public.profiles             enable row level security;
alter table public.organization_members enable row level security;
alter table public.invitations          enable row level security;
alter table public.clients              enable row level security;

-- organizations
create policy organizations_select on public.organizations
  for select to authenticated using (public.is_org_member(id));
create policy organizations_update on public.organizations
  for update to authenticated using (public.is_org_admin(id)) with check (public.is_org_admin(id));

-- profiles: visible to people sharing an organisation; editable by self
create policy profiles_select on public.profiles
  for select to authenticated using (id = auth.uid() or public.shares_org_with(id));
create policy profiles_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- organization_members
create policy organization_members_select on public.organization_members
  for select to authenticated using (public.is_org_member(organization_id));
create policy organization_members_insert on public.organization_members
  for insert to authenticated with check (public.is_org_admin(organization_id));
create policy organization_members_update on public.organization_members
  for update to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy organization_members_delete on public.organization_members
  for delete to authenticated using (public.is_org_admin(organization_id) and user_id <> auth.uid());

-- invitations: admins only (acceptance happens through the service role)
create policy invitations_select on public.invitations
  for select to authenticated using (public.is_org_admin(organization_id));
create policy invitations_insert on public.invitations
  for insert to authenticated with check (public.is_org_admin(organization_id) and invited_by = auth.uid());
create policy invitations_update on public.invitations
  for update to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

-- clients
create policy clients_select on public.clients
  for select to authenticated using (public.is_org_member(organization_id));
create policy clients_insert on public.clients
  for insert to authenticated with check (public.is_org_member(organization_id) and created_by = auth.uid());
create policy clients_update on public.clients
  for update to authenticated using (public.is_org_admin(organization_id) or created_by = auth.uid())
  with check (public.is_org_admin(organization_id) or created_by = auth.uid());
create policy clients_delete on public.clients
  for delete to authenticated using (public.is_org_admin(organization_id));
