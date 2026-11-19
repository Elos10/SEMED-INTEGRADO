begin;
-- The link index may reveal the existence of a protected case. Never expose
-- it directly or through a browser RPC; only the gateway filters by origin RLS.
revoke all on public.semed_student_record_links from authenticated,anon,public;
grant select,insert,update on public.semed_student_record_links to service_role;
create index student_record_links_confirmer_idx on public.semed_student_record_links(confirmed_by);

create table public.semed_student_enrollment_history (
 id uuid primary key default gen_random_uuid(),student_id uuid not null,
 registration text not null,unit_id uuid not null,unit_name text not null,
 class_id uuid not null,class_name text not null,grade integer,school_year integer,
 student_active boolean not null,observed_at timestamptz not null default now(),
 origin text not null check(origin in ('initial_snapshot','school_update'))
);
create index student_enrollment_history_student_idx on public.semed_student_enrollment_history(student_id,observed_at desc);
alter table public.semed_student_enrollment_history enable row level security;
revoke all on public.semed_student_enrollment_history from public,anon,authenticated;
grant select on public.semed_student_enrollment_history to authenticated;
create policy dossier_enrollment_read on public.semed_student_enrollment_history for select to authenticated using (
 private.student_dossier_unit_allowed(unit_id) and exists(select 1 from public.avalia_students s join public.avalia_school_classes c on c.id=s.class_id where s.id=student_id and private.student_dossier_unit_allowed(c.unit_id)));
insert into public.semed_student_enrollment_history(student_id,registration,unit_id,unit_name,class_id,class_name,grade,school_year,student_active,origin)
select s.id,s.registration,u.id,u.name,c.id,c.name,c.grade,c.school_year,s.active,'initial_snapshot'
from public.avalia_students s join public.avalia_school_classes c on c.id=s.class_id join public.avalia_educational_units u on u.id=c.unit_id;

-- Only a database trigger can append enrollment snapshots. The application
-- cannot rewrite or fabricate this history; source INSERT/UPDATE RLS is intact.
create function private.capture_student_enrollment() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' or new.class_id is distinct from old.class_id or new.active is distinct from old.active or new.registration is distinct from old.registration then
  insert into public.semed_student_enrollment_history(student_id,registration,unit_id,unit_name,class_id,class_name,grade,school_year,student_active,origin)
  select new.id,new.registration,u.id,u.name,c.id,c.name,c.grade,c.school_year,new.active,'school_update'
  from public.avalia_school_classes c join public.avalia_educational_units u on u.id=c.unit_id where c.id=new.class_id;
 end if;
 return new;
end $$;
revoke all on function private.capture_student_enrollment() from public,anon,authenticated;
create trigger capture_student_enrollment after insert or update of class_id,active,registration on public.avalia_students for each row execute function private.capture_student_enrollment();

create or replace function public.get_student_dossier(p_student uuid,p_action text default 'OPEN') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare student jsonb; evaluations jsonb; source_flags jsonb; enrollments jsonb;
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
 select coalesce(jsonb_agg(to_jsonb(h) order by h.observed_at desc),'[]') into enrollments from public.semed_student_enrollment_history h where h.student_id=p_student;
 source_flags:=jsonb_build_object('protected',private.student_dossier_source_allowed('protected'),'incidents',private.student_dossier_source_allowed('incidents'),'active_search',private.student_dossier_source_allowed('active_search'),'sae',private.student_dossier_source_allowed('sae'));
 insert into public.semed_student_dossier_audit(student_id,action) values(p_student,p_action);
 return jsonb_build_object('student',student,'evaluations',evaluations,'enrollments',enrollments,'sources',source_flags,'can_link',private.student_dossier_access('assign'),'can_print',private.student_dossier_access('export'),'emitted_at',now(),'issuer',public.get_my_access_context()->'user'->>'full_name');
end $$;

commit;


