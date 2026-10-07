-- Execute after the Prisma migration. Auth/RLS and private upload bucket.
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.educational_units enable row level security;
alter table public.unit_memberships enable row level security;
alter table public.school_classes enable row level security;
alter table public.students enable row level security;
alter table public.assessments enable row level security;
alter table public.official_answers enable row level security;
alter table public.answer_sheets enable row level security;
alter table public.reading_processings enable row level security;
alter table public.student_answers enable row level security;
alter table public.results enable row level security;

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

alter table public.profiles add constraint profiles_auth_user_fk foreign key (id) references auth.users(id) on delete cascade;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create or replace function private.current_organization_id() returns uuid language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then return null; end if;
  return (select organization_id from public.profiles where id = auth.uid() and active = true);
end $$;
revoke all on function private.current_organization_id() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.current_organization_id() to authenticated;

create policy "profiles_same_organization" on public.profiles for select to authenticated using (organization_id = (select private.current_organization_id()));
create policy "organizations_member_read" on public.organizations for select to authenticated using (id = (select private.current_organization_id()));
create policy "units_member_access" on public.educational_units for all to authenticated using (organization_id = (select private.current_organization_id())) with check (organization_id = (select private.current_organization_id()));
create policy "memberships_member_read" on public.unit_memberships for select to authenticated using (exists(select 1 from public.profiles p where p.id=profile_id and p.organization_id=(select private.current_organization_id())));
create policy "classes_unit_access" on public.school_classes for all to authenticated using (exists(select 1 from public.educational_units u where u.id=unit_id and u.organization_id=(select private.current_organization_id()))) with check (exists(select 1 from public.educational_units u where u.id=unit_id and u.organization_id=(select private.current_organization_id())));
create policy "students_unit_access" on public.students for all to authenticated using (exists(select 1 from public.school_classes c join public.educational_units u on u.id=c.unit_id where c.id=class_id and u.organization_id=(select private.current_organization_id()))) with check (exists(select 1 from public.school_classes c join public.educational_units u on u.id=c.unit_id where c.id=class_id and u.organization_id=(select private.current_organization_id())));
create policy "assessments_unit_access" on public.assessments for all to authenticated using (exists(select 1 from public.educational_units u where u.id=unit_id and u.organization_id=(select private.current_organization_id()))) with check (exists(select 1 from public.educational_units u where u.id=unit_id and u.organization_id=(select private.current_organization_id())));
create policy "official_answers_access" on public.official_answers for all to authenticated using (exists(select 1 from public.assessments a join public.educational_units u on u.id=a.unit_id where a.id=assessment_id and u.organization_id=(select private.current_organization_id()))) with check (exists(select 1 from public.assessments a join public.educational_units u on u.id=a.unit_id where a.id=assessment_id and u.organization_id=(select private.current_organization_id())));
create policy "sheets_access" on public.answer_sheets for all to authenticated using (exists(select 1 from public.assessments a join public.educational_units u on u.id=a.unit_id where a.id=assessment_id and u.organization_id=(select private.current_organization_id()))) with check (exists(select 1 from public.assessments a join public.educational_units u on u.id=a.unit_id where a.id=assessment_id and u.organization_id=(select private.current_organization_id())));
create policy "processings_access" on public.reading_processings for all to authenticated using (uploaded_by=(select auth.uid())) with check (uploaded_by=(select auth.uid()));
create policy "answers_access" on public.student_answers for all to authenticated using (exists(select 1 from public.reading_processings p where p.id=processing_id and p.uploaded_by=(select auth.uid()))) with check (exists(select 1 from public.reading_processings p where p.id=processing_id and p.uploaded_by=(select auth.uid())));
create policy "results_access" on public.results for select to authenticated using (exists(select 1 from public.answer_sheets s join public.assessments a on a.id=s.assessment_id join public.educational_units u on u.id=a.unit_id where s.id=sheet_id and u.organization_id=(select private.current_organization_id())));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('omr-private','omr-private',false,15728640,array['application/pdf','image/png','image/jpeg']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy "omr_upload_own_folder" on storage.objects for insert to authenticated with check (bucket_id='omr-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "omr_read_own_folder" on storage.objects for select to authenticated using (bucket_id='omr-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
