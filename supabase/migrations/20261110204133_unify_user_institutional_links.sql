begin;

create table if not exists public.semed_person_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  link_kind text not null default 'COMPLEMENTARY'
    check (link_kind in ('PRIMARY','COMPLEMENTARY','TEMPORARY')),
  area text not null,
  directorate text,
  unit_name text,
  job_title text,
  manager_name text,
  starts_at date,
  ends_at date,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint semed_person_links_period_valid
    check (starts_at is null or ends_at is null or ends_at >= starts_at)
);

create unique index if not exists semed_person_links_one_primary_idx
  on public.semed_person_links(user_id)
  where link_kind='PRIMARY' and active;
create index if not exists semed_person_links_user_active_idx
  on public.semed_person_links(user_id,active,link_kind);
create index if not exists semed_person_links_hierarchy_idx
  on public.semed_person_links(area,directorate,unit_name)
  where active;

alter table public.semed_person_links enable row level security;
revoke all on public.semed_person_links from anon,authenticated;
grant all on public.semed_person_links to service_role;

insert into public.semed_person_links(
  user_id,link_kind,area,directorate,unit_name,job_title,manager_name,
  starts_at,ends_at,active
)
select person.user_id,'PRIMARY',person.area,person.directorate,person.unit_name,
       person.job_title,person.manager_name,person.access_starts_at,
       person.access_ends_at,person.active
from public.semed_people person
where nullif(trim(person.area),'') is not null
  and not exists (
    select 1 from public.semed_person_links link
    where link.user_id=person.user_id and link.link_kind='PRIMARY' and link.active
  );

comment on table public.semed_person_links is
  'Vínculos institucionais hierárquicos de uma identidade única do Portal SEMED.';
comment on column public.semed_person_links.link_kind is
  'PRIMARY mantém compatibilidade com semed_people; COMPLEMENTARY e TEMPORARY ampliam o alcance autorizado.';

commit;
