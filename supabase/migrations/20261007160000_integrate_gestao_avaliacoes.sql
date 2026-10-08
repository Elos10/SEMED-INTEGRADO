-- Gestão de Avaliações integrada ao Supabase corporativo do INTEGRA.
create type public."AvaliaUserRole" as enum ('ADMIN','MANAGER','TEACHER','OPERATOR');
create type public."AvaliaSubject" as enum ('PORTUGUESE','MATHEMATICS','SINGLE');
create type public."AvaliaTimeMode" as enum ('PARTIAL','FULL','ALL');
create type public."AvaliaAssessmentStatus" as enum ('DRAFT','PUBLISHED','CLOSED');
create type public."AvaliaProcessingStatus" as enum ('RECEIVED','PROCESSING','REVIEW_REQUIRED','READY','FINALIZED','FAILED');
create type public."AvaliaAnswerStatus" as enum ('MARKED','BLANK','MULTIPLE','REVIEW');

create table public.avalia_organizations(id uuid primary key default gen_random_uuid(),name text not null,created_at timestamptz not null default now());
create table public.avalia_profiles(id uuid primary key references auth.users(id) on delete cascade,organization_id uuid not null references public.avalia_organizations(id),name text not null,role public."AvaliaUserRole" not null,active boolean not null default true);
create table public.avalia_educational_units(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.avalia_organizations(id),name text not null,code text,active boolean not null default true,unique(organization_id,name));
create table public.avalia_unit_memberships(profile_id uuid not null references public.avalia_profiles(id) on delete cascade,unit_id uuid not null references public.avalia_educational_units(id) on delete cascade,primary key(profile_id,unit_id));
create table public.avalia_school_classes(id uuid primary key default gen_random_uuid(),unit_id uuid not null references public.avalia_educational_units(id),name text not null,grade integer not null,school_year integer not null,time_mode public."AvaliaTimeMode" not null,unique(unit_id,grade,name,school_year,time_mode));
create table public.avalia_students(id uuid primary key default gen_random_uuid(),class_id uuid not null references public.avalia_school_classes(id),registration text,name text not null,active boolean not null default true);
create table public.avalia_assessments(id uuid primary key default gen_random_uuid(),unit_id uuid not null references public.avalia_educational_units(id),class_id uuid references public.avalia_school_classes(id),created_by uuid not null references public.avalia_profiles(id),number text not null,year integer not null,grade integer not null,subject public."AvaliaSubject" not null,time_mode public."AvaliaTimeMode" not null,question_count integer not null,max_score numeric(5,2) not null default 10,assessment_date date not null,status public."AvaliaAssessmentStatus" not null default 'DRAFT',unique(unit_id,year,number,subject,class_id));
create table public.avalia_official_answers(assessment_id uuid not null references public.avalia_assessments(id) on delete cascade,question integer not null,choice char(1) not null,primary key(assessment_id,question));
create table public.avalia_answer_sheets(id uuid primary key default gen_random_uuid(),assessment_id uuid not null references public.avalia_assessments(id),student_id uuid references public.avalia_students(id) on delete set null,public_code uuid not null default gen_random_uuid() unique,template_id text not null,template_version integer not null,created_at timestamptz not null default now(),unique(assessment_id,student_id));
create table public.avalia_reading_processings(id uuid primary key default gen_random_uuid(),sheet_id uuid references public.avalia_answer_sheets(id) on delete set null,uploaded_by uuid not null references auth.users(id),status public."AvaliaProcessingStatus" not null default 'RECEIVED',storage_path text not null,mime_type text not null,sha256 text not null,algorithm_version text not null,quality jsonb,error_code text,error_detail text,started_at timestamptz,finished_at timestamptz,created_at timestamptz not null default now());
create table public.avalia_student_answers(id uuid primary key default gen_random_uuid(),processing_id uuid not null references public.avalia_reading_processings(id) on delete cascade,question integer not null,detected_choice char(1),final_choice char(1),status public."AvaliaAnswerStatus" not null,confidence numeric(5,4) not null,fills jsonb not null,reviewed_by uuid references auth.users(id),reviewed_at timestamptz,unique(processing_id,question));
create table public.avalia_results(id uuid primary key default gen_random_uuid(),sheet_id uuid not null references public.avalia_answer_sheets(id),processing_id uuid not null unique references public.avalia_reading_processings(id),total integer not null,correct integer not null,wrong integer not null,blank integer not null,invalid integer not null,percentage numeric(5,2) not null,score numeric(5,2) not null,finalized_by uuid not null references auth.users(id),finalized_at timestamptz not null default now());

create index avalia_profiles_org_active_idx on public.avalia_profiles(organization_id,active);
create index avalia_classes_unit_year_grade_idx on public.avalia_school_classes(unit_id,school_year,grade);
create index avalia_students_class_name_idx on public.avalia_students(class_id,name);
create index avalia_assessments_unit_date_idx on public.avalia_assessments(unit_id,assessment_date);
create index avalia_assessments_class_idx on public.avalia_assessments(class_id);
create index avalia_sheets_student_idx on public.avalia_answer_sheets(student_id);
create index avalia_processings_status_created_idx on public.avalia_reading_processings(status,created_at);
create index avalia_processings_sheet_created_idx on public.avalia_reading_processings(sheet_id,created_at);
create index avalia_results_sheet_finalized_idx on public.avalia_results(sheet_id,finalized_at);

insert into public.avalia_organizations(name) values ('Secretaria Municipal de Educação de Uberaba');

do $$ declare t text; begin
 foreach t in array array['avalia_organizations','avalia_profiles','avalia_educational_units','avalia_unit_memberships','avalia_school_classes','avalia_students','avalia_assessments','avalia_official_answers','avalia_answer_sheets','avalia_reading_processings','avalia_student_answers','avalia_results'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 end loop;
end $$;

create or replace function private.avalia_current_organization_id() returns uuid language sql stable security definer set search_path='' as $$
 select p.organization_id from public.avalia_profiles p where p.id=(select auth.uid()) and p.active=true and (select private.semed_can_module('avaliacoes','view')) limit 1
$$;
revoke all on function private.avalia_current_organization_id() from public,anon;
grant execute on function private.avalia_current_organization_id() to authenticated;

create policy avalia_organizations_read on public.avalia_organizations for select to authenticated using(id=(select private.avalia_current_organization_id()));
create policy avalia_profiles_read on public.avalia_profiles for select to authenticated using(organization_id=(select private.avalia_current_organization_id()));
create policy avalia_units_read on public.avalia_educational_units for select to authenticated using(organization_id=(select private.avalia_current_organization_id()));
create policy avalia_units_manage on public.avalia_educational_units for all to authenticated using(organization_id=(select private.avalia_current_organization_id()) and (select private.semed_can_module('avaliacoes','edit'))) with check(organization_id=(select private.avalia_current_organization_id()) and (select private.semed_can_module('avaliacoes','edit')));
create policy avalia_memberships_read on public.avalia_unit_memberships for select to authenticated using(exists(select 1 from public.avalia_profiles p where p.id=profile_id and p.organization_id=(select private.avalia_current_organization_id())));
create policy avalia_classes_read on public.avalia_school_classes for select to authenticated using(exists(select 1 from public.avalia_educational_units u where u.id=unit_id and u.organization_id=(select private.avalia_current_organization_id())));
create policy avalia_classes_manage on public.avalia_school_classes for all to authenticated using(exists(select 1 from public.avalia_educational_units u where u.id=unit_id and u.organization_id=(select private.avalia_current_organization_id())) and (select private.semed_can_module('avaliacoes','edit'))) with check(exists(select 1 from public.avalia_educational_units u where u.id=unit_id and u.organization_id=(select private.avalia_current_organization_id())) and (select private.semed_can_module('avaliacoes','edit')));
create policy avalia_students_read on public.avalia_students for select to authenticated using(exists(select 1 from public.avalia_school_classes c join public.avalia_educational_units u on u.id=c.unit_id where c.id=class_id and u.organization_id=(select private.avalia_current_organization_id())));
create policy avalia_students_manage on public.avalia_students for all to authenticated using(exists(select 1 from public.avalia_school_classes c join public.avalia_educational_units u on u.id=c.unit_id where c.id=class_id and u.organization_id=(select private.avalia_current_organization_id())) and (select private.semed_can_module('avaliacoes','edit'))) with check(exists(select 1 from public.avalia_school_classes c join public.avalia_educational_units u on u.id=c.unit_id where c.id=class_id and u.organization_id=(select private.avalia_current_organization_id())) and (select private.semed_can_module('avaliacoes','edit')));
create policy avalia_assessments_read on public.avalia_assessments for select to authenticated using(exists(select 1 from public.avalia_educational_units u where u.id=unit_id and u.organization_id=(select private.avalia_current_organization_id())));
create policy avalia_assessments_manage on public.avalia_assessments for all to authenticated using(exists(select 1 from public.avalia_educational_units u where u.id=unit_id and u.organization_id=(select private.avalia_current_organization_id())) and (select private.semed_can_module('avaliacoes','edit'))) with check(exists(select 1 from public.avalia_educational_units u where u.id=unit_id and u.organization_id=(select private.avalia_current_organization_id())) and (select private.semed_can_module('avaliacoes','edit')));
create policy avalia_answers_read on public.avalia_official_answers for select to authenticated using(exists(select 1 from public.avalia_assessments a join public.avalia_educational_units u on u.id=a.unit_id where a.id=assessment_id and u.organization_id=(select private.avalia_current_organization_id())));
create policy avalia_answers_manage on public.avalia_official_answers for all to authenticated using((select private.semed_can_module('avaliacoes','edit'))) with check((select private.semed_can_module('avaliacoes','edit')));
create policy avalia_sheets_read on public.avalia_answer_sheets for select to authenticated using(exists(select 1 from public.avalia_assessments a join public.avalia_educational_units u on u.id=a.unit_id where a.id=assessment_id and u.organization_id=(select private.avalia_current_organization_id())));
create policy avalia_sheets_manage on public.avalia_answer_sheets for all to authenticated using((select private.semed_can_module('avaliacoes','edit'))) with check((select private.semed_can_module('avaliacoes','edit')));
create policy avalia_processings_access on public.avalia_reading_processings for all to authenticated using(uploaded_by=(select auth.uid()) or (select private.semed_can_module('avaliacoes','admin'))) with check(uploaded_by=(select auth.uid()) and (select private.semed_can_module('avaliacoes','edit')));
create policy avalia_student_answers_access on public.avalia_student_answers for all to authenticated using(exists(select 1 from public.avalia_reading_processings p where p.id=processing_id and (p.uploaded_by=(select auth.uid()) or (select private.semed_can_module('avaliacoes','admin'))))) with check((select private.semed_can_module('avaliacoes','edit')));
create policy avalia_results_read on public.avalia_results for select to authenticated using(exists(select 1 from public.avalia_answer_sheets s join public.avalia_assessments a on a.id=s.assessment_id join public.avalia_educational_units u on u.id=a.unit_id where s.id=sheet_id and u.organization_id=(select private.avalia_current_organization_id())));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('omr-private','omr-private',false,15728640,array['application/pdf','image/png','image/jpeg']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy avalia_omr_upload on storage.objects for insert to authenticated with check(bucket_id='omr-private' and (storage.foldername(name))[1]=(select auth.uid())::text and (select private.semed_can_module('avaliacoes','edit')));
create policy avalia_omr_read on storage.objects for select to authenticated using(bucket_id='omr-private' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select private.semed_can_module('avaliacoes','admin'))));
create policy avalia_omr_delete on storage.objects for delete to authenticated using(bucket_id='omr-private' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select private.semed_can_module('avaliacoes','delete'))));
