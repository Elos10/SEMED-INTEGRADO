-- Políticas por operação evitam avaliações RLS duplicadas e mantêm leitura separada da gestão.
drop policy avalia_units_manage on public.avalia_educational_units;
drop policy avalia_classes_manage on public.avalia_school_classes;
drop policy avalia_students_manage on public.avalia_students;
drop policy avalia_assessments_manage on public.avalia_assessments;
drop policy avalia_answers_manage on public.avalia_official_answers;
drop policy avalia_sheets_manage on public.avalia_answer_sheets;

create policy avalia_units_insert on public.avalia_educational_units for insert to authenticated with check(organization_id=(select private.avalia_current_organization_id()) and (select private.semed_can_module('avaliacoes','create')));
create policy avalia_units_update on public.avalia_educational_units for update to authenticated using(organization_id=(select private.avalia_current_organization_id()) and (select private.semed_can_module('avaliacoes','edit'))) with check(organization_id=(select private.avalia_current_organization_id()) and (select private.semed_can_module('avaliacoes','edit')));
create policy avalia_units_delete on public.avalia_educational_units for delete to authenticated using(organization_id=(select private.avalia_current_organization_id()) and (select private.semed_can_module('avaliacoes','delete')));

create policy avalia_classes_insert on public.avalia_school_classes for insert to authenticated with check((select private.semed_can_module('avaliacoes','create')) and exists(select 1 from public.avalia_educational_units u where u.id=unit_id and u.organization_id=(select private.avalia_current_organization_id())));
create policy avalia_classes_update on public.avalia_school_classes for update to authenticated using((select private.semed_can_module('avaliacoes','edit')) and exists(select 1 from public.avalia_educational_units u where u.id=unit_id and u.organization_id=(select private.avalia_current_organization_id()))) with check((select private.semed_can_module('avaliacoes','edit')) and exists(select 1 from public.avalia_educational_units u where u.id=unit_id and u.organization_id=(select private.avalia_current_organization_id())));
create policy avalia_classes_delete on public.avalia_school_classes for delete to authenticated using((select private.semed_can_module('avaliacoes','delete')) and exists(select 1 from public.avalia_educational_units u where u.id=unit_id and u.organization_id=(select private.avalia_current_organization_id())));

create policy avalia_students_insert on public.avalia_students for insert to authenticated with check((select private.semed_can_module('avaliacoes','create')) and exists(select 1 from public.avalia_school_classes c join public.avalia_educational_units u on u.id=c.unit_id where c.id=class_id and u.organization_id=(select private.avalia_current_organization_id())));
create policy avalia_students_update on public.avalia_students for update to authenticated using((select private.semed_can_module('avaliacoes','edit')) and exists(select 1 from public.avalia_school_classes c join public.avalia_educational_units u on u.id=c.unit_id where c.id=class_id and u.organization_id=(select private.avalia_current_organization_id()))) with check((select private.semed_can_module('avaliacoes','edit')));
create policy avalia_students_delete on public.avalia_students for delete to authenticated using((select private.semed_can_module('avaliacoes','delete')) and exists(select 1 from public.avalia_school_classes c join public.avalia_educational_units u on u.id=c.unit_id where c.id=class_id and u.organization_id=(select private.avalia_current_organization_id())));

create policy avalia_assessments_insert on public.avalia_assessments for insert to authenticated with check((select private.semed_can_module('avaliacoes','create')) and exists(select 1 from public.avalia_educational_units u where u.id=unit_id and u.organization_id=(select private.avalia_current_organization_id())));
create policy avalia_assessments_update on public.avalia_assessments for update to authenticated using((select private.semed_can_module('avaliacoes','edit')) and exists(select 1 from public.avalia_educational_units u where u.id=unit_id and u.organization_id=(select private.avalia_current_organization_id()))) with check((select private.semed_can_module('avaliacoes','edit')));
create policy avalia_assessments_delete on public.avalia_assessments for delete to authenticated using((select private.semed_can_module('avaliacoes','delete')) and exists(select 1 from public.avalia_educational_units u where u.id=unit_id and u.organization_id=(select private.avalia_current_organization_id())));

create policy avalia_answers_insert on public.avalia_official_answers for insert to authenticated with check((select private.semed_can_module('avaliacoes','create')));
create policy avalia_answers_update on public.avalia_official_answers for update to authenticated using((select private.semed_can_module('avaliacoes','edit'))) with check((select private.semed_can_module('avaliacoes','edit')));
create policy avalia_answers_delete on public.avalia_official_answers for delete to authenticated using((select private.semed_can_module('avaliacoes','delete')));
create policy avalia_sheets_insert on public.avalia_answer_sheets for insert to authenticated with check((select private.semed_can_module('avaliacoes','create')));
create policy avalia_sheets_update on public.avalia_answer_sheets for update to authenticated using((select private.semed_can_module('avaliacoes','edit'))) with check((select private.semed_can_module('avaliacoes','edit')));
create policy avalia_sheets_delete on public.avalia_answer_sheets for delete to authenticated using((select private.semed_can_module('avaliacoes','delete')));

create index avalia_assessments_created_by_idx on public.avalia_assessments(created_by);
create index avalia_processings_uploaded_by_idx on public.avalia_reading_processings(uploaded_by);
create index avalia_results_finalized_by_idx on public.avalia_results(finalized_by);
create index avalia_answers_reviewed_by_idx on public.avalia_student_answers(reviewed_by);
create index avalia_memberships_unit_idx on public.avalia_unit_memberships(unit_id);
