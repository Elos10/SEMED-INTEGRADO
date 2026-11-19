begin;
create or replace function private.student_dossier_unit_allowed(p_unit uuid) returns boolean
language plpgsql stable security invoker set search_path='' as $$
declare c jsonb; m jsonb; scope jsonb; unit_label text; ref text; mode text;
begin
 if not private.student_dossier_access() then return false; end if;
 c:=public.get_my_access_context();
 if coalesce((c->>'portal_admin')::boolean,false) or exists(select 1 from jsonb_array_elements(c->'profiles') p where p->>'code'='ADMIN_GERAL') then return true; end if;
 select x into m from jsonb_array_elements(c->'modules') x where x->>'code'='prontuario';
 if not exists(select 1 from jsonb_array_elements(c->'modules') x where x->>'code'='avaliacoes' and coalesce((x->'permissions'->>'view')::boolean,false)) then return false; end if;
 scope:=coalesce(m->'scope','{}'); mode:=coalesce(scope->>'mode','UNIT');
 if mode='ALL' then return true; end if;
 select name into unit_label from public.avalia_educational_units where id=p_unit;
 if unit_label is null then return false; end if;
 ref:=coalesce(nullif(scope->>'value',''),scope->>'unit_id',scope->>'unidade',nullif(c->'user'->>'unit_name',''));
 if mode in ('UNIT','READ_ONLY') then return ref is not null and (ref=p_unit::text or lower(btrim(ref))=lower(btrim(unit_label))); end if;
 if mode in ('AREA','DIRECTORATE') then
   ref:=coalesce(nullif(scope->>'value',''),scope->>'area',nullif(c->'user'->>'directorate',''),c->'user'->>'area');
   return exists(with recursive hierarchy as (
      select o.id,o.parent_option_id,o.label,o.code,array[o.id] path from public.semed_shared_options o join public.semed_shared_tables t on t.id=o.table_id
      where t.code='EDUCATIONAL_UNIT' and o.active and (o.legacy_reference_id=p_unit or lower(btrim(o.label))=lower(btrim(unit_label)))
      union all select o.id,o.parent_option_id,o.label,o.code,h.path||o.id from public.semed_shared_options o join hierarchy h on o.id=h.parent_option_id where o.active and not o.id=any(h.path)
   ) select 1 from hierarchy where lower(btrim(label))=lower(btrim(ref)) or code=ref);
 end if;
 return false; -- Unsupported/team/own scopes never become institutional access.
end $$;

commit;
