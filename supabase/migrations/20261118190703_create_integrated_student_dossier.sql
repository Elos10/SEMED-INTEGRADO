begin;
insert into public.semed_modules(code,name,description,route,display_order,active)
values ('prontuario','Consulta Integrada do Aluno','Prontuário individual restrito; não amplia permissões dos sistemas de origem.','/modules/inteligencia/?view=student',90,true)
on conflict(code) do update set name=excluded.name,description=excluded.description,route=excluded.route,active=true;
insert into public.semed_profiles(code,name,description,active)
values ('PRONTUARIO_CONSULTA','Prontuário — Consulta','Consulta individual no alcance autorizado. Exige também acesso aos sistemas de origem.',true)
on conflict(code) do nothing;
insert into public.semed_profile_module_permissions(profile_id,module_id,can_view,can_export,can_assign,can_admin)
select p.id,m.id,true,p.code='ADMIN_GERAL',p.code='ADMIN_GERAL',p.code='ADMIN_GERAL'
from public.semed_profiles p cross join public.semed_modules m
where m.code='prontuario' and p.code in ('ADMIN_GERAL','PRONTUARIO_CONSULTA')
on conflict(profile_id,module_id) do nothing;
-- Access to the entry point is not a grant to any individual source record.
insert into public.semed_profile_module_permissions(profile_id,module_id,can_view)
select p.id,m.id,true from public.semed_profiles p cross join public.semed_modules m
where p.code='PRONTUARIO_CONSULTA' and m.code='inteligencia'
on conflict(profile_id,module_id) do nothing;

create or replace function private.student_dossier_access(p_action text default 'view') returns boolean
language plpgsql stable security invoker set search_path='' as $$
declare c jsonb; m jsonb;
begin
 c:=public.get_my_access_context();
 if c is null or not coalesce((c->'user'->>'active')::boolean,false) then return false; end if;
 if coalesce((c->>'portal_admin')::boolean,false) or exists(select 1 from jsonb_array_elements(c->'profiles') p where p->>'code'='ADMIN_GERAL') then return true; end if;
 select x into m from jsonb_array_elements(c->'modules') x where x->>'code'='prontuario';
 return coalesce((m->'permissions'->>'view')::boolean,false) and
   (coalesce((m->'permissions'->>p_action)::boolean,false) or coalesce((m->'permissions'->>'admin')::boolean,false));
end $$;
revoke all on function private.student_dossier_access(text) from public,anon;
grant execute on function private.student_dossier_access(text) to authenticated;

create or replace function private.student_dossier_unit_allowed(p_unit uuid) returns boolean
language plpgsql stable security invoker set search_path='' as $$
declare c jsonb; m jsonb; scope jsonb; unit_label text; ref text; mode text;
begin
 if not private.student_dossier_access() then return false; end if;
 c:=public.get_my_access_context();
 if coalesce((c->>'portal_admin')::boolean,false) or exists(select 1 from jsonb_array_elements(c->'profiles') p where p->>'code'='ADMIN_GERAL') then return true; end if;
 select x into m from jsonb_array_elements(c->'modules') x where x->>'code'='prontuario';
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
revoke all on function private.student_dossier_unit_allowed(uuid) from public,anon;
grant execute on function private.student_dossier_unit_allowed(uuid) to authenticated;

create or replace function private.student_dossier_source_allowed(p_source text) returns boolean
language plpgsql stable security invoker set search_path='' as $$
declare c jsonb;
begin
 c:=public.get_my_access_context();
 if not private.student_dossier_access() then return false; end if;
 if coalesce((c->>'portal_admin')::boolean,false) or exists(select 1 from jsonb_array_elements(c->'profiles') p where p->>'code'='ADMIN_GERAL') then return true; end if;
 if p_source='protected' then return lower(c->'user'->>'email') in ('assistenciaaoeducando@edu.uberabadigital.com.br','daeb@uberabadigital.com.br'); end if;
 if p_source='incidents' then return exists(select 1 from jsonb_array_elements(c->'modules') m where m->>'code'='incidentes' and (m->'permissions'->>'view')::boolean); end if;
 if p_source='sae' then return exists(select 1 from jsonb_array_elements(c->'profiles') p where p->>'code' in ('SAE_CONSULTA','SAE_REGISTRO','SAE_RELATORIOS')); end if;
 if p_source='active_search' then return exists(select 1 from jsonb_array_elements(c->'profiles') p where p->>'code' like 'BUSCA_ATIVA_%'); end if;
 return false;
end $$;
revoke all on function private.student_dossier_source_allowed(text) from public,anon;
grant execute on function private.student_dossier_source_allowed(text) to authenticated;

create table public.semed_student_record_links (
 id uuid primary key default gen_random_uuid(),student_id uuid not null references public.avalia_students(id),
 source_module text not null check(source_module in ('protected','incidents','active_search','sae')),
 source_record_id uuid not null,source_person_id uuid,
 confirmed_by uuid not null default auth.uid() references public.semed_people(user_id),confirmed_at timestamptz not null default now(),
 active boolean not null default true,
 unique(student_id,source_module,source_record_id)
);
create index student_record_links_student_idx on public.semed_student_record_links(student_id) where active;
alter table public.semed_student_record_links enable row level security;
revoke all on public.semed_student_record_links from public,anon,authenticated;
grant select on public.semed_student_record_links to authenticated;
grant insert(student_id,source_module,source_record_id,source_person_id) on public.semed_student_record_links to authenticated;
grant update(active) on public.semed_student_record_links to authenticated;
create policy dossier_links_read on public.semed_student_record_links for select to authenticated using (
 private.student_dossier_source_allowed(source_module) and exists(select 1 from public.avalia_students s join public.avalia_school_classes c on c.id=s.class_id where s.id=student_id and private.student_dossier_unit_allowed(c.unit_id)));
create policy dossier_links_insert on public.semed_student_record_links for insert to authenticated with check (
 confirmed_by=auth.uid() and private.student_dossier_access('assign') and private.student_dossier_source_allowed(source_module) and
 exists(select 1 from public.avalia_students s join public.avalia_school_classes c on c.id=s.class_id where s.id=student_id and private.student_dossier_unit_allowed(c.unit_id)));
create policy dossier_links_update on public.semed_student_record_links for update to authenticated using (
 private.student_dossier_access('assign') and private.student_dossier_source_allowed(source_module) and
 exists(select 1 from public.avalia_students s join public.avalia_school_classes c on c.id=s.class_id where s.id=student_id and private.student_dossier_unit_allowed(c.unit_id)))
 with check(private.student_dossier_access('assign') and private.student_dossier_source_allowed(source_module) and
 exists(select 1 from public.avalia_students s join public.avalia_school_classes c on c.id=s.class_id where s.id=student_id and private.student_dossier_unit_allowed(c.unit_id)));

create table public.semed_student_dossier_audit (
 id uuid primary key default gen_random_uuid(),actor_id uuid not null default auth.uid(),student_id uuid,
 action text not null check(action in ('SEARCH','OPEN','PRINT','LINK','UNLINK')),created_at timestamptz not null default now()
);
create index student_dossier_audit_actor_idx on public.semed_student_dossier_audit(actor_id,created_at desc);
alter table public.semed_student_dossier_audit enable row level security;
revoke all on public.semed_student_dossier_audit from public,anon,authenticated;
grant insert(student_id,action),select on public.semed_student_dossier_audit to authenticated;
create policy dossier_audit_insert on public.semed_student_dossier_audit for insert to authenticated with check(actor_id=auth.uid() and private.student_dossier_access());
create policy dossier_audit_read on public.semed_student_dossier_audit for select to authenticated using(actor_id=auth.uid());

create or replace function public.search_student_dossiers(p_search text,p_offset integer default 0) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare found jsonb;
begin
 if not private.student_dossier_access() then raise exception 'Consulta individual não autorizada.' using errcode='42501'; end if;
 if length(btrim(p_search))<3 or length(p_search)>120 then raise exception 'Informe pelo menos 3 caracteres e no máximo 120.'; end if;
 if p_offset<0 or p_offset>100000 then raise exception 'Página inválida.'; end if;
 select coalesce(jsonb_agg(to_jsonb(q)),'[]') into found from (
 select s.id,s.name,s.registration,s.active,c.name class_name,c.grade,c.school_year,u.id unit_id,u.name unit_name
 from public.avalia_students s join public.avalia_school_classes c on c.id=s.class_id join public.avalia_educational_units u on u.id=c.unit_id
 where private.student_dossier_unit_allowed(u.id) and (strpos(lower(s.name),lower(btrim(p_search)))>0 or strpos(lower(s.registration),lower(btrim(p_search)))>0)
 order by s.name,s.id limit 26 offset p_offset) q;
 insert into public.semed_student_dossier_audit(action) values('SEARCH');
 return found;
end $$;

create or replace function public.get_student_dossier(p_student uuid,p_action text default 'OPEN') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare student jsonb; evaluations jsonb; links jsonb; source_flags jsonb;
begin
 if not private.student_dossier_access() or p_action not in ('OPEN','PRINT') or (p_action='PRINT' and not private.student_dossier_access('export')) then raise exception 'Operação não autorizada.' using errcode='42501'; end if;
 select jsonb_build_object('id',s.id,'name',s.name,'registration',s.registration,'active',s.active,'class_name',c.name,'grade',c.grade,'school_year',c.school_year,'unit_id',u.id,'unit_name',u.name)
 into student from public.avalia_students s join public.avalia_school_classes c on c.id=s.class_id join public.avalia_educational_units u on u.id=c.unit_id
 where s.id=p_student and private.student_dossier_unit_allowed(u.id);
 if student is null then raise exception 'Aluno não disponível neste acesso.' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.date desc nulls last),'[]') into evaluations from (
 select a.id,a.number,a.subject,a.assessment_date date,u.name unit_name,r.percentage,r.score,r.correct,r.total,r.finalized_at
 from public.avalia_answer_sheets sh join public.avalia_assessments a on a.id=sh.assessment_id
 join public.avalia_educational_units u on u.id=a.unit_id left join public.avalia_results r on r.sheet_id=sh.id
 where sh.student_id=p_student and private.student_dossier_unit_allowed(u.id)) q;
 select coalesce(jsonb_agg(to_jsonb(l)),'[]') into links from public.semed_student_record_links l where l.student_id=p_student and l.active;
 source_flags:=jsonb_build_object('protected',private.student_dossier_source_allowed('protected'),'incidents',private.student_dossier_source_allowed('incidents'),'active_search',private.student_dossier_source_allowed('active_search'),'sae',private.student_dossier_source_allowed('sae'));
 insert into public.semed_student_dossier_audit(student_id,action) values(p_student,p_action);
 return jsonb_build_object('student',student,'evaluations',evaluations,'links',links,'sources',source_flags,'can_link',private.student_dossier_access('assign'),'can_print',private.student_dossier_access('export'),'emitted_at',now(),'issuer',public.get_my_access_context()->'user'->>'full_name');
end $$;
revoke all on function public.search_student_dossiers(text,integer),public.get_student_dossier(uuid,text) from public,anon;
grant execute on function public.search_student_dossiers(text,integer),public.get_student_dossier(uuid,text) to authenticated;
commit;


