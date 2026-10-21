begin;

insert into public.semed_modules(code,name,description,icon,route,display_order,active)
values (
  'inteligencia',
  'Inteligência Gerencial',
  'Painéis executivos, alertas, indicadores estratégicos e agenda de decisões.',
  'chart-no-axes-combined',
  '/modules/inteligencia/',
  50,
  true
)
on conflict (code) do update set
  name=excluded.name,
  description=excluded.description,
  icon=excluded.icon,
  route=excluded.route,
  display_order=excluded.display_order,
  active=true,
  updated_at=now();

insert into public.semed_profile_module_permissions(
  profile_id,module_id,can_view,can_create,can_edit,can_delete,
  can_approve,can_admin,can_assign,can_export,can_view_sensitive
)
select
  profile.id,module.id,
  true,true,true,
  profile.code='ADMIN_GERAL',
  true,
  profile.code='ADMIN_GERAL',
  true,true,false
from public.semed_profiles profile
join public.semed_modules module on module.code='inteligencia'
where profile.code in ('ADMIN_GERAL','GESTOR_SEMED') and profile.active
on conflict (profile_id,module_id) do update set
  can_view=excluded.can_view,
  can_create=excluded.can_create,
  can_edit=excluded.can_edit,
  can_delete=excluded.can_delete,
  can_approve=excluded.can_approve,
  can_admin=excluded.can_admin,
  can_assign=excluded.can_assign,
  can_export=excluded.can_export,
  can_view_sensitive=excluded.can_view_sensitive,
  updated_at=now();

create table if not exists public.semed_management_decisions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 3 and 160),
  source_module text not null default 'Portal',
  problem text not null check (char_length(trim(problem)) >= 3),
  evidence text not null check (char_length(trim(evidence)) >= 3),
  decision text not null check (char_length(trim(decision)) >= 3),
  responsible_name text not null check (char_length(trim(responsible_name)) >= 3),
  due_date date not null,
  review_date date,
  priority text not null default 'media' check (priority in ('alta','media','baixa')),
  status text not null default 'aberta' check (status in ('aberta','em_execucao','concluida','cancelada')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint semed_management_decisions_review_date_check check (review_date is null or review_date >= created_at::date)
);

create index if not exists semed_management_decisions_status_due_idx
  on public.semed_management_decisions(status,due_date)
  where status in ('aberta','em_execucao');
create index if not exists semed_management_decisions_created_at_idx
  on public.semed_management_decisions(created_at desc);
create index if not exists semed_management_decisions_created_by_idx
  on public.semed_management_decisions(created_by);

alter table public.semed_management_decisions enable row level security;

drop policy if exists management_decisions_read on public.semed_management_decisions;
create policy management_decisions_read
on public.semed_management_decisions for select to authenticated
using ((select private.semed_can_module('inteligencia','view')));

drop policy if exists management_decisions_insert on public.semed_management_decisions;
create policy management_decisions_insert
on public.semed_management_decisions for insert to authenticated
with check (
  created_by=(select auth.uid())
  and (select private.semed_can_module('inteligencia','create'))
);

drop policy if exists management_decisions_update on public.semed_management_decisions;
create policy management_decisions_update
on public.semed_management_decisions for update to authenticated
using ((select private.semed_can_module('inteligencia','edit')))
with check ((select private.semed_can_module('inteligencia','edit')));

drop policy if exists management_decisions_delete on public.semed_management_decisions;
create policy management_decisions_delete
on public.semed_management_decisions for delete to authenticated
using ((select private.semed_can_module('inteligencia','delete')));

revoke all on public.semed_management_decisions from anon;
grant select,insert,update,delete on public.semed_management_decisions to authenticated;

commit;
