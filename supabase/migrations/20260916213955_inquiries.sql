-- 0005 inquiries: website contact form storage and rate limiting.
-- Blueprint: docs/database/schema.md#website · Policies: docs/database/rls-policies.md
-- Reversal: drop function submit_inquiry, drop tables inquiry_rate_limits, inquiries.

create table public.inquiries (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 120),
  email           extensions.citext not null,
  company         text check (char_length(company) <= 120),
  message         text not null check (char_length(message) between 1 and 5000),
  budget_range    text check (char_length(budget_range) <= 40),
  source_path     text check (char_length(source_path) <= 200),
  ip_hash         text,
  handled_at      timestamptz,
  handled_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now()
);
create index inquiries_org_created_idx on public.inquiries (organization_id, created_at desc);
create index inquiries_org_unhandled_idx on public.inquiries (organization_id) where handled_at is null;

-- Sliding hourly buckets per hashed IP; rows older than a day are pruned by the daily cron (W9).
create table public.inquiry_rate_limits (
  ip_hash      text not null,
  window_start timestamptz not null,
  count        int not null default 0,
  primary key (ip_hash, window_start)
);

alter table public.inquiries           enable row level security;
alter table public.inquiry_rate_limits enable row level security;

-- Admins read and mark enquiries handled; inserts happen only through submit_inquiry (service role).
create policy inquiries_select on public.inquiries
  for select to authenticated using (public.is_org_admin(organization_id));
create policy inquiries_update on public.inquiries
  for update to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
-- inquiry_rate_limits: no policies — service role only.

-- ---------------------------------------------------------------------------
-- submit_inquiry: rate-limit check + insert in one transaction.
-- Called by the contact Server Action through the admin client (the visitor is
-- anonymous). Raises MALHOT:rate_limited beyond p_limit submissions per hour.
-- ---------------------------------------------------------------------------
create or replace function public.submit_inquiry(
  p_name         text,
  p_email        text,
  p_company      text,
  p_message      text,
  p_budget_range text,
  p_source_path  text,
  p_ip_hash      text,
  p_limit        int default 5
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_org   uuid;
  v_id    uuid;
begin
  if p_ip_hash is not null then
    insert into public.inquiry_rate_limits (ip_hash, window_start, count)
    values (p_ip_hash, date_trunc('hour', now()), 1)
    on conflict (ip_hash, window_start) do update set count = public.inquiry_rate_limits.count + 1
    returning count into v_count;
    if v_count > p_limit then
      perform public.raise_malhot('rate_limited', 'Too many enquiries from this network in the last hour');
    end if;
  end if;

  -- Single organisation in v1 (docs/database/entities.md#organization).
  select id into v_org from public.organizations order by created_at limit 1;
  if v_org is null then
    perform public.raise_malhot('invariant', 'No organisation exists to receive enquiries');
  end if;

  insert into public.inquiries (organization_id, name, email, company, message, budget_range, source_path, ip_hash)
  values (v_org, p_name, p_email::extensions.citext, p_company, p_message, p_budget_range, p_source_path, p_ip_hash)
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.submit_inquiry(text, text, text, text, text, text, text, int) from public, anon, authenticated;
grant  execute on function public.submit_inquiry(text, text, text, text, text, text, text, int) to service_role;
