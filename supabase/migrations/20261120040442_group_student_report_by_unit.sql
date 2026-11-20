begin;
create function public.get_student_report_groups(p_unit uuid default null,p_search text default '') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if not private.student_dossier_access() then raise exception 'Consulta não autorizada.' using errcode='42501'; end if;
 if length(coalesce(p_search,''))>120 then raise exception 'Filtro inválido.'; end if;
 with allowed_units as materialized (
   select u.id,u.name from public.avalia_educational_units u
   where (p_unit is null or u.id=p_unit) and private.student_dossier_unit_allowed(u.id)
 ), grouped as (
   select u.id,u.name,count(s.id)::integer student_count
   from allowed_units u left join public.avalia_school_classes c on c.unit_id=u.id
   left join public.avalia_students s on s.class_id=c.id and
     (coalesce(btrim(p_search),'')='' or strpos(lower(s.name),lower(btrim(p_search)))>0 or strpos(lower(s.registration),lower(btrim(p_search)))>0)
   group by u.id,u.name
 ) select coalesce(jsonb_agg(to_jsonb(g) order by g.name),'[]') into result from grouped g
 where coalesce(btrim(p_search),'')='' or g.student_count>0;
 insert into public.semed_student_dossier_audit(action) values('SEARCH');
 return result;
end $$;
revoke all on function public.get_student_report_groups(uuid,text) from public,anon;
grant execute on function public.get_student_report_groups(uuid,text) to authenticated;
commit;
