begin;

create table if not exists public.semed_profiles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.semed_modules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  icon text,
  route text not null,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.semed_user_profiles (
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.semed_profiles(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, profile_id)
);

create table if not exists public.semed_profile_module_permissions (
  profile_id uuid not null references public.semed_profiles(id) on delete cascade,
  module_id uuid not null references public.semed_modules(id) on delete cascade,
  can_view boolean not null default false,
  can_create boolean not null default false,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  can_approve boolean not null default false,
  can_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, module_id)
);

alter table public.semed_profiles enable row level security;
alter table public.semed_modules enable row level security;
alter table public.semed_user_profiles enable row level security;
alter table public.semed_profile_module_permissions enable row level security;

revoke all on public.semed_profiles from anon, authenticated;
revoke all on public.semed_modules from anon, authenticated;
revoke all on public.semed_user_profiles from anon, authenticated;
revoke all on public.semed_profile_module_permissions from anon, authenticated;

insert into public.semed_profiles (code, name, description)
values ('ADMIN_GERAL', 'Administrador Geral', 'Administração integral da plataforma SEMED Integrado.')
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  active = true,
  updated_at = now();

insert into public.semed_modules (code, name, description, icon, route, display_order)
values
  ('avaliacoes', 'Avaliações', 'Avaliações diagnósticas, análises e relatórios pedagógicos.', '✓', './modules/avaliacoes/', 10),
  ('inscricoes', 'Inscrições', 'Inscrições, oficinas, frequência e relatórios.', '✎', './modules/inscricoes/', 20),
  ('votacao', 'Votação', 'Administração eleitoral, sessões e urna escolar.', '▣', './modules/votacao/', 30),
  ('os_semed', 'OS SEMED', 'Ordens de serviço e gestão logística.', '⚙', './modules/os-semed/', 40),
  ('monitor', 'Monitor', 'Monitoramento físico, financeiro e operacional.', '◫', './modules/monitor/', 50)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  route = excluded.route,
  display_order = excluded.display_order,
  active = true,
  updated_at = now();

insert into public.semed_user_profiles (user_id, profile_id)
select
  '02d38eaa-08c1-4a5f-966f-0e30bc2ebe12'::uuid,
  p.id
from public.semed_profiles p
where p.code = 'ADMIN_GERAL'
on conflict (user_id, profile_id) do update set active = true;

insert into public.semed_profile_module_permissions (
  profile_id, module_id, can_view, can_create, can_edit, can_delete, can_approve, can_admin
)
select p.id, m.id, true, true, true, true, true, true
from public.semed_profiles p
cross join public.semed_modules m
where p.code = 'ADMIN_GERAL'
on conflict (profile_id, module_id) do update set
  can_view = true,
  can_create = true,
  can_edit = true,
  can_delete = true,
  can_approve = true,
  can_admin = true,
  updated_at = now();

create or replace function public.get_my_modules()
returns table (
  codigo text,
  nome text,
  descricao text,
  icone text,
  rota text,
  ordem integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select distinct
    m.code,
    m.name,
    m.description,
    m.icon,
    m.route,
    m.display_order
  from public.semed_user_profiles up
  join public.semed_profiles p
    on p.id = up.profile_id and p.active
  join public.semed_profile_module_permissions permission
    on permission.profile_id = p.id and permission.can_view
  join public.semed_modules m
    on m.id = permission.module_id and m.active
  where up.user_id = auth.uid()
    and up.active
  order by m.display_order, m.name;
$$;

revoke all on function public.get_my_modules() from public, anon;
grant execute on function public.get_my_modules() to authenticated;

commit;
