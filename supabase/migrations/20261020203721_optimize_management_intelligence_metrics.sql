begin;

create index if not exists avalia_classes_unit_year_idx
  on public.avalia_school_classes(unit_id,school_year);
create index if not exists avalia_students_active_class_idx
  on public.avalia_students(class_id)
  where active;

create or replace view public.semed_intelligence_unit_metrics
with (security_invoker=true)
as
select
  unit.id as unit_id,
  unit.name as unit_name,
  unit.active as unit_active,
  class.school_year,
  count(distinct class.id)::bigint as class_count,
  count(student.id) filter (where student.active)::bigint as student_count
from public.avalia_educational_units unit
left join public.avalia_school_classes class on class.unit_id=unit.id
left join public.avalia_students student on student.class_id=class.id
group by unit.id,unit.name,unit.active,class.school_year;

revoke all on public.semed_intelligence_unit_metrics from anon;
grant select on public.semed_intelligence_unit_metrics to authenticated;

commit;
