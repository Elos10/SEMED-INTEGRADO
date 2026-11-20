begin;
create function public.get_student_report_units() returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if not private.student_dossier_access() then raise exception 'Consulta não autorizada.' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.name),'[]') into result from (
 select u.id,u.name from public.avalia_educational_units u where private.student_dossier_unit_allowed(u.id)
 ) q;
 return result;
end $$;
create function public.search_student_report(p_unit uuid default null,p_search text default '',p_offset integer default 0) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if not private.student_dossier_access() then raise exception 'Consulta não autorizada.' using errcode='42501'; end if;
 if p_offset<0 or p_offset>100000 or p_offset%25<>0 or length(coalesce(p_search,''))>120 then raise exception 'Filtro inválido.'; end if;
 if p_unit is null and length(btrim(coalesce(p_search,'')))<3 then raise exception 'Selecione uma unidade ou informe ao menos 3 caracteres.'; end if;
 -- Evaluate the unit scope once per unit rather than once per student.
 with allowed_units as materialized (
   select u.id,u.name from public.avalia_educational_units u
   where (p_unit is null or u.id=p_unit) and private.student_dossier_unit_allowed(u.id)
 ), page as (
   select s.id,s.name,s.registration,s.active,c.name class_name,c.grade,c.school_year,u.id unit_id,u.name unit_name
   from public.avalia_students s join public.avalia_school_classes c on c.id=s.class_id join allowed_units u on u.id=c.unit_id
   where coalesce(btrim(p_search),'')='' or strpos(lower(s.name),lower(btrim(p_search)))>0 or strpos(lower(s.registration),lower(btrim(p_search)))>0
   order by s.name,s.id limit 26 offset p_offset
 ) select coalesce(jsonb_agg(to_jsonb(page)),'[]') into result from page;
 insert into public.semed_student_dossier_audit(action) values('SEARCH');
 return result;
end $$;
revoke all on function public.get_student_report_units(),public.search_student_report(uuid,text,integer) from public,anon;
grant execute on function public.get_student_report_units(),public.search_student_report(uuid,text,integer) to authenticated;
commit;


