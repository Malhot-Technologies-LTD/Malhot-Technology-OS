-- Instagram (and later other platforms) connected to Social → Accounts, and the
-- figures synced from them. Depends on 20260927150000_social_media.sql.
--
-- Tokens: `social_connections.token_ciphertext` holds the platform access token
-- encrypted with AES-256-GCM by the app (lib/crypto/secret-box.ts); the key
-- lives only in the environment. On top of that, no browser-facing role can
-- read the column at all: authenticated users get SELECT on the other columns
-- only, and every write goes through the service role on the server after a
-- permission check. So a social media manager can see that an account is
-- connected and when it last synced, never the token.
--
-- Figures are written only by the sync (service role) and read by admins and
-- social media managers.
--
-- Every statement is guarded, so running this twice is harmless.
--
-- Reversal: drop social_media_stats, social_account_snapshots, social_connections.

-- ---------------------------------------------------------------------------
-- Connections
-- ---------------------------------------------------------------------------
create table if not exists public.social_connections (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null,
  account_id       uuid not null unique,
  provider         text not null check (provider in ('instagram')),
  -- The platform's id for the account, and its handle when connected.
  external_user_id text not null check (char_length(external_user_id) <= 64),
  username         text check (char_length(username) <= 80),
  token_ciphertext text not null check (char_length(token_ciphertext) <= 4000),
  token_expires_at timestamptz,
  token_issued_at  timestamptz not null default now(),
  scopes           text[] not null default '{}',
  connected_by     uuid references public.profiles(id) on delete set null,
  connected_at     timestamptz not null default now(),
  last_synced_at   timestamptz,
  -- Plain words for the page, e.g. "Instagram asks to reconnect". Null when healthy.
  last_sync_error  text check (char_length(last_sync_error) <= 500),
  updated_at       timestamptz not null default now(),
  foreign key (account_id, organization_id)
    references public.social_accounts (id, organization_id) on delete cascade
);

drop trigger if exists set_updated_at on public.social_connections;
create trigger set_updated_at before update on public.social_connections
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Daily account figures
-- ---------------------------------------------------------------------------
create table if not exists public.social_account_snapshots (
  account_id       uuid not null,
  organization_id  uuid not null,
  -- The day the figures describe, in UTC.
  day              date not null,
  followers        integer check (followers >= 0),
  follows          integer check (follows >= 0),
  media_count      integer check (media_count >= 0),
  reach            integer check (reach >= 0),
  views            integer check (views >= 0),
  accounts_engaged integer check (accounts_engaged >= 0),
  interactions     integer check (interactions >= 0),
  captured_at      timestamptz not null default now(),
  primary key (account_id, day),
  foreign key (account_id, organization_id)
    references public.social_accounts (id, organization_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Per-post figures, one row per post on the platform
-- ---------------------------------------------------------------------------
create table if not exists public.social_media_stats (
  account_id      uuid not null,
  organization_id uuid not null,
  external_id     text not null check (char_length(external_id) <= 64),
  permalink       text check (char_length(permalink) <= 500),
  caption         text check (char_length(caption) <= 2200),
  media_type      text check (char_length(media_type) <= 40),
  product_type    text check (char_length(product_type) <= 40),
  posted_at       timestamptz,
  likes           integer check (likes >= 0),
  comments        integer check (comments >= 0),
  saves           integer check (saves >= 0),
  shares          integer check (shares >= 0),
  reach           integer check (reach >= 0),
  views           integer check (views >= 0),
  interactions    integer check (interactions >= 0),
  synced_at       timestamptz not null default now(),
  primary key (account_id, external_id),
  foreign key (account_id, organization_id)
    references public.social_accounts (id, organization_id) on delete cascade
);
create index if not exists social_media_stats_org_posted_idx on public.social_media_stats (organization_id, posted_at desc);
create index if not exists social_media_stats_permalink_idx on public.social_media_stats (permalink);

-- ---------------------------------------------------------------------------
-- Access: read for admins and social media managers; writes by the server only
-- ---------------------------------------------------------------------------
alter table public.social_connections       enable row level security;
alter table public.social_account_snapshots enable row level security;
alter table public.social_media_stats       enable row level security;

revoke all on table public.social_connections       from anon, authenticated;
revoke all on table public.social_account_snapshots from anon, authenticated;
revoke all on table public.social_media_stats       from anon, authenticated;

-- Every column except the token.
grant select (id, organization_id, account_id, provider, external_user_id, username, token_expires_at,
              token_issued_at, scopes, connected_by, connected_at, last_synced_at, last_sync_error, updated_at)
  on table public.social_connections to authenticated;
grant select on table public.social_account_snapshots to authenticated;
grant select on table public.social_media_stats to authenticated;

drop policy if exists social_connections_select on public.social_connections;
create policy social_connections_select on public.social_connections
  for select to authenticated using (public.can_manage_social(organization_id));
drop policy if exists social_account_snapshots_select on public.social_account_snapshots;
create policy social_account_snapshots_select on public.social_account_snapshots
  for select to authenticated using (public.can_manage_social(organization_id));
drop policy if exists social_media_stats_select on public.social_media_stats;
create policy social_media_stats_select on public.social_media_stats
  for select to authenticated using (public.can_manage_social(organization_id));
