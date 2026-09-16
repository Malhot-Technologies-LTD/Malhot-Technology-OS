-- 0004 fix: protect_last_owner blocked cascaded deletes from organizations,
-- making an organisation undeletable. The invariant only matters while the
-- organisation still exists; during a cascade the parent row is already gone.

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
    if exists (select 1 from public.organizations o where o.id = old.organization_id) then
      select count(*) into remaining
      from public.organization_members
      where organization_id = old.organization_id and role = 'owner' and id <> old.id;
      if remaining = 0 then
        perform public.raise_malhot('invariant', 'An organisation must keep at least one owner');
      end if;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
