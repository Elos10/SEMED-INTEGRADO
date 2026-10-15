-- Credencial técnica do backend de Avaliações, isolada por organização.
create table if not exists private.avalia_backend_role_tenants (
  role_name name primary key,
  organization_id uuid not null references public.avalia_organizations(id) on delete restrict
);

revoke all on private.avalia_backend_role_tenants from public, anon, authenticated;

create or replace function private.avalia_backend_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select organization_id
  from private.avalia_backend_role_tenants
  where role_name = current_user
$$;

revoke all on function private.avalia_backend_organization_id() from public, anon, authenticated;

do $$
declare
  generated_password text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  stored_secret_id uuid;
begin
  if not exists (select 1 from pg_roles where rolname = 'gestao_avaliacoes_api') then
    execute format(
      'create role gestao_avaliacoes_api login password %L nosuperuser nocreatedb nocreaterole noinherit nobypassrls',
      generated_password
    );
  else
    execute format(
      'alter role gestao_avaliacoes_api login password %L nosuperuser nocreatedb nocreaterole noinherit nobypassrls',
      generated_password
    );
  end if;

  insert into private.avalia_backend_role_tenants(role_name, organization_id)
  select 'gestao_avaliacoes_api', id
  from public.avalia_organizations
  order by created_at asc
  limit 1
  on conflict (role_name) do update set organization_id = excluded.organization_id;

  select id into stored_secret_id
  from vault.secrets
  where name = 'gestao_avaliacoes_api_database_password'
  limit 1;

  if stored_secret_id is null then
    perform vault.create_secret(generated_password, 'gestao_avaliacoes_api_database_password', 'Senha técnica do backend Gestão de Avaliações');
  else
    perform vault.update_secret(stored_secret_id, generated_password, 'gestao_avaliacoes_api_database_password', 'Senha técnica do backend Gestão de Avaliações');
  end if;
end
$$;

grant connect on database postgres to gestao_avaliacoes_api;
grant usage on schema public, private to gestao_avaliacoes_api;
grant execute on function private.avalia_backend_organization_id() to gestao_avaliacoes_api;
grant select on public.avalia_organizations, public.avalia_unit_memberships to gestao_avaliacoes_api;
grant select, insert, update on public.avalia_profiles to gestao_avaliacoes_api;
grant select, insert, update, delete on
  public.avalia_educational_units,
  public.avalia_school_classes,
  public.avalia_students,
  public.avalia_assessments,
  public.avalia_official_answers,
  public.avalia_answer_sheets,
  public.avalia_reading_processings,
  public.avalia_student_answers,
  public.avalia_results
to gestao_avaliacoes_api;

drop policy if exists avalia_backend_tenant_select on public.avalia_organizations;
create policy avalia_backend_tenant_select on public.avalia_organizations
  for select to gestao_avaliacoes_api
  using (id = private.avalia_backend_organization_id());

drop policy if exists avalia_backend_tenant_access on public.avalia_profiles;
create policy avalia_backend_tenant_access on public.avalia_profiles
  for all to gestao_avaliacoes_api
  using (organization_id = private.avalia_backend_organization_id())
  with check (organization_id = private.avalia_backend_organization_id());

drop policy if exists avalia_backend_tenant_access on public.avalia_educational_units;
create policy avalia_backend_tenant_access on public.avalia_educational_units
  for all to gestao_avaliacoes_api
  using (organization_id = private.avalia_backend_organization_id())
  with check (organization_id = private.avalia_backend_organization_id());

drop policy if exists avalia_backend_tenant_access on public.avalia_school_classes;
create policy avalia_backend_tenant_access on public.avalia_school_classes
  for all to gestao_avaliacoes_api
  using (exists (
    select 1 from public.avalia_educational_units u
    where u.id = unit_id and u.organization_id = private.avalia_backend_organization_id()
  ))
  with check (exists (
    select 1 from public.avalia_educational_units u
    where u.id = unit_id and u.organization_id = private.avalia_backend_organization_id()
  ));

drop policy if exists avalia_backend_tenant_access on public.avalia_students;
create policy avalia_backend_tenant_access on public.avalia_students
  for all to gestao_avaliacoes_api
  using (exists (
    select 1 from public.avalia_school_classes c
    join public.avalia_educational_units u on u.id = c.unit_id
    where c.id = class_id and u.organization_id = private.avalia_backend_organization_id()
  ))
  with check (exists (
    select 1 from public.avalia_school_classes c
    join public.avalia_educational_units u on u.id = c.unit_id
    where c.id = class_id and u.organization_id = private.avalia_backend_organization_id()
  ));

drop policy if exists avalia_backend_tenant_access on public.avalia_assessments;
create policy avalia_backend_tenant_access on public.avalia_assessments
  for all to gestao_avaliacoes_api
  using (exists (
    select 1 from public.avalia_educational_units u
    where u.id = unit_id and u.organization_id = private.avalia_backend_organization_id()
  ))
  with check (exists (
    select 1 from public.avalia_educational_units u
    where u.id = unit_id and u.organization_id = private.avalia_backend_organization_id()
  ));

drop policy if exists avalia_backend_tenant_access on public.avalia_official_answers;
create policy avalia_backend_tenant_access on public.avalia_official_answers
  for all to gestao_avaliacoes_api
  using (exists (
    select 1 from public.avalia_assessments a
    join public.avalia_educational_units u on u.id = a.unit_id
    where a.id = assessment_id and u.organization_id = private.avalia_backend_organization_id()
  ))
  with check (exists (
    select 1 from public.avalia_assessments a
    join public.avalia_educational_units u on u.id = a.unit_id
    where a.id = assessment_id and u.organization_id = private.avalia_backend_organization_id()
  ));

drop policy if exists avalia_backend_tenant_access on public.avalia_answer_sheets;
create policy avalia_backend_tenant_access on public.avalia_answer_sheets
  for all to gestao_avaliacoes_api
  using (exists (
    select 1 from public.avalia_assessments a
    join public.avalia_educational_units u on u.id = a.unit_id
    where a.id = assessment_id and u.organization_id = private.avalia_backend_organization_id()
  ))
  with check (exists (
    select 1 from public.avalia_assessments a
    join public.avalia_educational_units u on u.id = a.unit_id
    where a.id = assessment_id and u.organization_id = private.avalia_backend_organization_id()
  ));

drop policy if exists avalia_backend_tenant_access on public.avalia_reading_processings;
create policy avalia_backend_tenant_access on public.avalia_reading_processings
  for all to gestao_avaliacoes_api
  using (
    exists (
      select 1 from public.avalia_answer_sheets s
      join public.avalia_assessments a on a.id = s.assessment_id
      join public.avalia_educational_units u on u.id = a.unit_id
      where s.id = sheet_id and u.organization_id = private.avalia_backend_organization_id()
    )
    or exists (
      select 1 from public.avalia_profiles p
      where p.id = uploaded_by and p.organization_id = private.avalia_backend_organization_id()
    )
  )
  with check (
    exists (
      select 1 from public.avalia_answer_sheets s
      join public.avalia_assessments a on a.id = s.assessment_id
      join public.avalia_educational_units u on u.id = a.unit_id
      where s.id = sheet_id and u.organization_id = private.avalia_backend_organization_id()
    )
    or exists (
      select 1 from public.avalia_profiles p
      where p.id = uploaded_by and p.organization_id = private.avalia_backend_organization_id()
    )
  );

drop policy if exists avalia_backend_tenant_access on public.avalia_student_answers;
create policy avalia_backend_tenant_access on public.avalia_student_answers
  for all to gestao_avaliacoes_api
  using (exists (
    select 1
    from public.avalia_reading_processings p
    left join public.avalia_answer_sheets s on s.id = p.sheet_id
    left join public.avalia_assessments a on a.id = s.assessment_id
    left join public.avalia_educational_units u on u.id = a.unit_id
    left join public.avalia_profiles pr on pr.id = p.uploaded_by
    where p.id = processing_id
      and (u.organization_id = private.avalia_backend_organization_id() or pr.organization_id = private.avalia_backend_organization_id())
  ))
  with check (exists (
    select 1
    from public.avalia_reading_processings p
    left join public.avalia_answer_sheets s on s.id = p.sheet_id
    left join public.avalia_assessments a on a.id = s.assessment_id
    left join public.avalia_educational_units u on u.id = a.unit_id
    left join public.avalia_profiles pr on pr.id = p.uploaded_by
    where p.id = processing_id
      and (u.organization_id = private.avalia_backend_organization_id() or pr.organization_id = private.avalia_backend_organization_id())
  ));

drop policy if exists avalia_backend_tenant_access on public.avalia_results;
create policy avalia_backend_tenant_access on public.avalia_results
  for all to gestao_avaliacoes_api
  using (exists (
    select 1 from public.avalia_answer_sheets s
    join public.avalia_assessments a on a.id = s.assessment_id
    join public.avalia_educational_units u on u.id = a.unit_id
    where s.id = sheet_id and u.organization_id = private.avalia_backend_organization_id()
  ))
  with check (exists (
    select 1 from public.avalia_answer_sheets s
    join public.avalia_assessments a on a.id = s.assessment_id
    join public.avalia_educational_units u on u.id = a.unit_id
    where s.id = sheet_id and u.organization_id = private.avalia_backend_organization_id()
  ));

drop policy if exists avalia_backend_tenant_select on public.avalia_unit_memberships;
create policy avalia_backend_tenant_select on public.avalia_unit_memberships
  for select to gestao_avaliacoes_api
  using (exists (
    select 1 from public.avalia_profiles p
    where p.id = profile_id and p.organization_id = private.avalia_backend_organization_id()
  ));
