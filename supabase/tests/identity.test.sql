-- pgTAP tests for migrations 0001-0004. Run with `npx supabase test db` (local stack only).
begin;
select plan(15);

-- RLS is on for every identity table
select ok(relrowsecurity, format('%s has RLS enabled', relname))
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('organizations', 'profiles', 'organization_members', 'invitations', 'clients');

-- Helpers are hidden from anon but usable by authenticated (RLS policies run as that role)
select ok(not has_function_privilege('anon', 'public.is_org_member(uuid)', 'execute'), 'anon cannot execute is_org_member');
select ok(has_function_privilege('authenticated', 'public.is_org_member(uuid)', 'execute'), 'authenticated can execute is_org_member');
select ok(not has_function_privilege('authenticated', 'public.handle_new_auth_user()', 'execute'), 'auth trigger is not callable via RPC');

-- Fixture: a user (created like Supabase Auth would) and an organisation
insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
        'pgtap@test.local', '{"provider":"email","providers":["email"]}', '{"full_name":"Tap Tester"}', now(), now());
insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
        'pgtap2@test.local', '{"provider":"email","providers":["email"]}', '{}', now(), now());

select is((select full_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'), 'Tap Tester',
          'auth trigger creates the profile with the metadata name');
select is((select full_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'), '',
          'auth trigger tolerates missing metadata');

insert into public.organizations (id, name, slug) values ('33333333-3333-3333-3333-333333333333', 'Tap Org', 'tap-org');
insert into public.organization_members (organization_id, user_id, role)
values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'owner');

-- Last-owner invariant
select throws_like(
  $$update public.organization_members set role = 'admin' where user_id = '11111111-1111-1111-1111-111111111111'$$,
  'MALHOT:invariant:%', 'the last owner cannot be demoted');
select throws_like(
  $$delete from public.organization_members where user_id = '11111111-1111-1111-1111-111111111111'$$,
  'MALHOT:invariant:%', 'the last owner cannot be removed');

insert into public.organization_members (organization_id, user_id, role)
values ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'owner');
select lives_ok(
  $$update public.organization_members set role = 'admin' where user_id = '11111111-1111-1111-1111-111111111111'$$,
  'an owner can be demoted once another owner exists');

-- 0004: deleting the organisation cascades through the owner row
select lives_ok($$delete from public.organizations where id = '33333333-3333-3333-3333-333333333333'$$,
                'an organisation with an owner can be deleted');
select is((select count(*) from public.organization_members where organization_id = '33333333-3333-3333-3333-333333333333'), 0::bigint,
          'memberships are removed with the organisation');

select * from finish();
rollback;
