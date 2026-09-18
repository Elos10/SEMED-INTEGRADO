-- Área institucional do usuário, compartilhada com o módulo Monitoramento.

alter table public.semed_people
  add column if not exists area text not null default '';

alter table public.monitor_profiles
  add column if not exists area text not null default '';

alter table public.semed_people
  drop constraint if exists semed_people_area_valid;
alter table public.semed_people
  add constraint semed_people_area_valid check (
    area in ('', 'Gestão Pedagógica', 'Infraestrutura', 'Logística', 'Tecnologia', 'Transporte')
  );

alter table public.monitor_profiles
  drop constraint if exists monitor_profiles_area_valid;
alter table public.monitor_profiles
  add constraint monitor_profiles_area_valid check (
    area in ('', 'Gestão Pedagógica', 'Infraestrutura', 'Logística', 'Tecnologia', 'Transporte')
  );

update public.monitor_profiles profile
set area = person.area
from public.semed_people person
where person.user_id = profile.user_id
  and person.area <> ''
  and profile.area = '';

