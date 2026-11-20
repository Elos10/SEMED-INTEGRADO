-- Regression checks use synthetic students and transaction-local access changes.
-- All fixtures, snapshots, audit rows and profile edits are rolled back.
begin;
create temp table dossier_test_results(name text primary key,passed boolean);
create temp table dossier_test_context as
select p.user_id actor,c.id class_id,c.unit_id,c2.id other_class_id,c2.unit_id other_unit_id,u.name unit_name
from public.semed_people p cross join public.avalia_school_classes c join public.avalia_educational_units u on u.id=c.unit_id
cross join public.avalia_school_classes c2
where lower(p.email)='detic@uberabadigital.com.br' and c.unit_id<>c2.unit_id limit 1;
grant select on dossier_test_context to authenticated;
grant select,insert on dossier_test_results to authenticated;
insert into public.avalia_students(id,class_id,registration,name,active)
select 'c8000000-0000-4000-8000-000000000001',class_id,'DOSSIER-REGRESSION-01','ZZ DOSSIER REGRESSION',true from dossier_test_context;
insert into public.avalia_students(id,class_id,registration,name,active)
select 'c8000000-0000-4000-8000-000000000002',other_class_id,'DOSSIER-REGRESSION-02','ZZ DOSSIER REGRESSION',true from dossier_test_context;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select actor from dossier_test_context),'role','authenticated')::text,true);
insert into public.semed_student_record_links(student_id,source_module,source_record_id,confirmed_by)
select 'c8000000-0000-4000-8000-000000000001','sae','c8000000-0000-4000-8000-000000000099',actor from dossier_test_context;
do $$ begin
 assert exists(select 1 from public.semed_student_dossier_audit where student_id='c8000000-0000-4000-8000-000000000001' and action='LINK' and actor_id=(select actor from dossier_test_context)),'link audit missing';
 insert into dossier_test_results values('link audit recorded atomically',true);
end $$;
update public.semed_student_record_links set active=false where student_id='c8000000-0000-4000-8000-000000000001';
do $$ begin
 assert exists(select 1 from public.semed_student_dossier_audit where student_id='c8000000-0000-4000-8000-000000000001' and action='UNLINK'),'unlink audit missing';
 insert into dossier_test_results values('unlink preserves original and audit',true);
end $$;
set local role authenticated;
do $$ declare d jsonb; begin
 d:=public.get_student_dossier('c8000000-0000-4000-8000-000000000001');
 assert d->'student'->>'registration'='DOSSIER-REGRESSION-01','identity mismatch';
 assert not d ? 'links','private source index exposed';
 assert jsonb_array_length(d->'enrollments')=1,'snapshot missing';
 assert (d->>'can_link')::boolean and (d->>'can_print')::boolean,'administrator denied';
 insert into dossier_test_results values('administrator dossier, audit and stable identity',true),('private source index absent from response',true),('enrollment trigger records source update',true);
 begin perform * from public.semed_student_record_links limit 1; raise exception 'link index exposed'; exception when insufficient_privilege then null; end;
 insert into dossier_test_results values('link index denied even to authenticated administrator',true);
end $$;
reset role;
-- Change only the transaction-local actor's portal authorization, not Auth.
update public.semed_people set email='dossier-regression@example.invalid',unit_name=(select unit_name from dossier_test_context) where user_id=(select actor from dossier_test_context);
delete from public.semed_user_profiles where user_id=(select actor from dossier_test_context);
delete from public.semed_user_module_overrides where user_id=(select actor from dossier_test_context);
delete from public.semed_user_module_roles where user_id=(select actor from dossier_test_context);
insert into public.semed_user_profiles(user_id,profile_id,active)
select c.actor,p.id,true from dossier_test_context c cross join public.semed_profiles p where p.code='AVALIACOES_CONSULTA';
set local role authenticated;
do $$ begin
 assert not private.student_dossier_access(),'ordinary evaluation permission grants dossier';
 begin perform public.search_student_dossiers('REGRESSION',0); raise exception 'unauthorized search'; exception when insufficient_privilege then null; end;
 insert into dossier_test_results values('evaluation access alone cannot open dossier',true);
end $$;
reset role;
insert into public.semed_user_profiles(user_id,profile_id,active)
select c.actor,p.id,true from dossier_test_context c cross join public.semed_profiles p where p.code='PRONTUARIO_CONSULTA';
set local role authenticated;
do $$ declare d jsonb; found jsonb; begin
 assert private.student_dossier_access(),'explicit permission not recognized';
 found:=public.search_student_dossiers('DOSSIER-REGRESSION',0);
 assert jsonb_array_length(found)=1,'unit scope crossed';
 assert found->0->>'registration'='DOSSIER-REGRESSION-01','wrong unit';
 d:=public.get_student_dossier('c8000000-0000-4000-8000-000000000001');
 assert not (d->>'can_link')::boolean and not (d->>'can_print')::boolean,'read role elevated';
 assert not (d->'sources'->>'protected')::boolean,'protected source disclosed';
 assert jsonb_array_length(public.get_student_report_units())=1,'unit dropdown crossed scope';
 assert jsonb_array_length(public.search_student_report((select unit_id from dossier_test_context),'DOSSIER-REGRESSION',0))=1,'unit dependent students mismatch';
 assert jsonb_array_length(public.search_student_report((select other_unit_id from dossier_test_context),'DOSSIER-REGRESSION',0))=0,'cross-unit filter bypass';
 insert into dossier_test_results values('report unit list respects scope',true),('report students depend on selected unit',true),('report cross-unit filter cannot bypass access',true);
 assert jsonb_array_length(public.get_student_report_groups(null,'DOSSIER-REGRESSION'))=1,'group counts crossed scope';
 assert (public.get_student_report_groups((select unit_id from dossier_test_context),'DOSSIER-REGRESSION')->0->>'student_count')::integer=1,'group count mismatch';
 assert jsonb_array_length(public.get_student_report_groups((select other_unit_id from dossier_test_context),'DOSSIER-REGRESSION'))=0,'selected group bypassed scope';
 insert into dossier_test_results values('unit group counts limited to authorized unit',true),('selected unit returns exact filtered student count',true),('unauthorized unit group is not disclosed',true);
 begin perform public.get_student_dossier('c8000000-0000-4000-8000-000000000002'); raise exception 'cross-unit IDOR'; exception when insufficient_privilege then null; end;
 begin perform public.get_student_dossier('c8000000-0000-4000-8000-000000000001','PRINT'); raise exception 'unauthorized print'; exception when insufficient_privilege then null; end;
 insert into dossier_test_results values('consultation limited to linked unit',true),('cross-unit direct ID denied',true),('read role cannot link or export',true),('protected source hidden from ordinary role',true);
end $$;
reset role;
insert into public.semed_user_module_overrides(user_id,module_id,can_view,can_export,scope,active)
select c.actor,m.id,false,false,'{"mode":"ALL"}',true from dossier_test_context c cross join public.semed_modules m where m.code='prontuario';
set local role authenticated;
do $$ begin
 assert not private.student_dossier_access(),'deny override ignored';
 insert into dossier_test_results values('individual deny override respected',true);
end $$;
reset role;
update public.semed_user_module_overrides set can_view=true,can_export=true where user_id=(select actor from dossier_test_context) and module_id=(select id from public.semed_modules where code='prontuario');
set local role authenticated;
do $$ declare d jsonb; begin
 assert jsonb_array_length(public.search_student_dossiers('DOSSIER-REGRESSION',0))=2,'explicit institutional scope denied';
 d:=public.get_student_dossier('c8000000-0000-4000-8000-000000000002','PRINT');
 assert (d->>'can_print')::boolean,'export override ignored';
 insert into dossier_test_results values('explicit institutional scope and export respected',true);
end $$;
reset role;
insert into public.semed_user_module_overrides(user_id,module_id,can_view,scope,active)
select c.actor,m.id,false,'{}',true from dossier_test_context c cross join public.semed_modules m where m.code='avaliacoes';
set local role authenticated;
do $$ begin
 assert jsonb_array_length(public.search_student_dossiers('DOSSIER-REGRESSION',0))=0,'source deny override ignored';
 insert into dossier_test_results values('source system effective deny respected',true);
end $$;
reset role;
update public.semed_people set access_ends_at=current_date-1 where user_id=(select actor from dossier_test_context);
set local role authenticated;
do $$ begin
 assert not private.student_dossier_access(),'expired account authorized';
 insert into dossier_test_results values('expired portal account denied',true);
end $$;
reset role;
do $$ begin
 assert not has_function_privilege('anon','public.get_student_dossier(uuid,text)','execute'),'anonymous RPC exposed';
 insert into dossier_test_results values('anonymous access revoked',true);
end $$;
select name,passed from dossier_test_results order by name;
rollback;
