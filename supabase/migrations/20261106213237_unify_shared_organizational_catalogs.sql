begin;

create or replace function private.sync_semed_organizational_alias()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  counterpart_catalog text;
begin
  if pg_trigger_depth() > 1 or new.catalog not in ('AREA','DIRECTORATE') then
    return new;
  end if;

  counterpart_catalog := case when new.catalog='AREA' then 'DIRECTORATE' else 'AREA' end;

  if tg_op='UPDATE' and old.code is distinct from new.code then
    update public.semed_reference_catalogs
       set code=new.code,
           label=new.label,
           active=new.active,
           sort_order=new.sort_order,
           updated_at=now()
     where catalog=counterpart_catalog
       and code=old.code;
    if found then
      return new;
    end if;
  end if;

  insert into public.semed_reference_catalogs(
    catalog,code,label,parent_code,metadata,active,sort_order,updated_at
  )
  values(
    counterpart_catalog,new.code,new.label,null,
    jsonb_build_object('organizational_alias',true),
    new.active,new.sort_order,now()
  )
  on conflict(catalog,code) do update
  set label=excluded.label,
      active=excluded.active,
      sort_order=excluded.sort_order,
      updated_at=now();

  return new;
end
$$;

revoke all on function private.sync_semed_organizational_alias() from public,anon,authenticated,service_role;

drop trigger if exists semed_reference_organizational_alias_sync on public.semed_reference_catalogs;
create trigger semed_reference_organizational_alias_sync
after insert or update of code,label,active,sort_order
on public.semed_reference_catalogs
for each row
when (new.catalog in ('AREA','DIRECTORATE'))
execute function private.sync_semed_organizational_alias();

commit;
