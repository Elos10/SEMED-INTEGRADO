begin;

update public.semed_reference_catalogs
set parent_code=null,updated_at=now()
where catalog='DIRECTORATE'
  and parent_code=code;

create or replace function private.validate_semed_reference_hierarchy()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  cursor_code text;
  visited text[];
begin
  if new.catalog<>'DIRECTORATE' or new.parent_code is null then
    return new;
  end if;

  cursor_code:=new.parent_code;
  visited:=array[new.code];

  loop
    if cursor_code=any(visited) then
      raise exception 'O vínculo informado criaria um ciclo na hierarquia institucional.';
    end if;
    visited:=array_append(visited,cursor_code);

    select item.parent_code
      into cursor_code
      from public.semed_reference_catalogs item
     where item.catalog='DIRECTORATE'
       and item.code=cursor_code
       and item.active;

    if not found then
      raise exception 'O vínculo superior informado não existe ou está inativo.';
    end if;

    exit when cursor_code is null;
  end loop;

  return new;
end
$$;

revoke all on function private.validate_semed_reference_hierarchy() from public,anon,authenticated,service_role;

drop trigger if exists semed_reference_hierarchy_validation on public.semed_reference_catalogs;
create trigger semed_reference_hierarchy_validation
before insert or update of catalog,code,parent_code,active
on public.semed_reference_catalogs
for each row
execute function private.validate_semed_reference_hierarchy();

commit;
