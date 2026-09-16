-- 0003 hardening: findings from the Supabase security advisor after 0001-0002.
--
-- 1. raise_malhot had a role-mutable search_path.
-- 2. Supabase default privileges grant EXECUTE on new public functions to anon,
--    authenticated and service_role, so `revoke ... from public` in 0002 did not
--    remove the explicit anon grant. Authorisation helpers are for RLS policies
--    (evaluated as the `authenticated` role) and must never be reachable
--    unauthenticated. The auth trigger function must not be callable via RPC at all.

alter function public.raise_malhot(text, text) set search_path = public;

revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;

revoke execute on function public.auth_uid()            from anon;
revoke execute on function public.is_org_member(uuid)   from anon;
revoke execute on function public.is_org_admin(uuid)    from anon;
revoke execute on function public.is_org_owner(uuid)    from anon;
revoke execute on function public.shares_org_with(uuid) from anon;
revoke execute on function public.raise_malhot(text, text) from anon;

-- Trigger functions are invoked by the table owner, never through the API.
revoke execute on function public.set_updated_at()     from public, anon, authenticated;
revoke execute on function public.protect_last_owner() from public, anon, authenticated;

-- Stop future functions from being exposed to anon by default; grants are explicit from here on.
alter default privileges in schema public revoke execute on functions from anon;
