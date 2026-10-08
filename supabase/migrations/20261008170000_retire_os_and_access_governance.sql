begin;

-- O módulo de Ordens de Serviço deixa de fazer parte do SEMED Integra.
-- Os dados operacionais são preservados para auditoria e eventual recuperação.
update public.semed_modules
set active = false, updated_at = now()
where code = 'os_semed';

update public.semed_profiles
set active = false, updated_at = now()
where code in ('OS_SOLICITANTE', 'OS_RESPONSAVEL', 'OS_CONSULTA');

update public.semed_user_module_roles
set active = false, managed_at = now()
where module_id = (select id from public.semed_modules where code = 'os_semed');

-- Permissões individuais complementam os perfis corporativos. Valores nulos
-- herdam o perfil; true/false permitem exceções explícitas e auditáveis.
create table if not exists public.semed_user_module_overrides (
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id uuid not null references public.semed_modules(id) on delete cascade,
  can_view boolean,
  can_create boolean,
  can_edit boolean,
  can_delete boolean,
  can_approve boolean,
  can_admin boolean,
  scope jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  active boolean not null default true,
  managed_by uuid references auth.users(id),
  managed_at timestamptz not null default now(),
  primary key (user_id, module_id)
);

create index if not exists semed_user_module_overrides_module_idx
  on public.semed_user_module_overrides(module_id, user_id)
  where active;
create index if not exists semed_user_module_overrides_expiry_idx
  on public.semed_user_module_overrides(expires_at)
  where active and expires_at is not null;

alter table public.semed_user_module_overrides enable row level security;
drop policy if exists semed_user_module_overrides_read_self on public.semed_user_module_overrides;
create policy semed_user_module_overrides_read_self
on public.semed_user_module_overrides for select to authenticated
using (user_id = (select auth.uid()) and active and (expires_at is null or expires_at > now()));

revoke all on public.semed_user_module_overrides from anon;
revoke insert, update, delete on public.semed_user_module_overrides from authenticated;
grant select on public.semed_user_module_overrides to authenticated;

create or replace function public.get_my_access_context()
returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
 with person as (
  select * from public.semed_people where user_id=auth.uid() and active
 ), profile_access as (
  select m.id,m.code,m.name,m.route,m.display_order,
   bool_or(pm.can_view) can_view,bool_or(pm.can_create) can_create,
   bool_or(pm.can_edit) can_edit,bool_or(pm.can_delete) can_delete,
   bool_or(pm.can_approve) can_approve,bool_or(pm.can_admin) can_admin
  from public.semed_user_profiles up
  join public.semed_profiles p on p.id=up.profile_id and p.active
  join public.semed_profile_module_permissions pm on pm.profile_id=p.id
  join public.semed_modules m on m.id=pm.module_id and m.active
  where up.user_id=auth.uid() and up.active
  group by m.id,m.code,m.name,m.route,m.display_order
 ), effective_access as (
  select pa.id,pa.code,pa.name,pa.route,pa.display_order,umr.role_code,
   coalesce(nullif(uo.scope,'{}'::jsonb),umr.scope,'{}'::jsonb) scope,
   coalesce(uo.can_view,pa.can_view) can_view,
   coalesce(uo.can_create,pa.can_create) can_create,
   coalesce(uo.can_edit,pa.can_edit) can_edit,
   coalesce(uo.can_delete,pa.can_delete) can_delete,
   coalesce(uo.can_approve,pa.can_approve) can_approve,
   coalesce(uo.can_admin,pa.can_admin) can_admin,
   uo.expires_at
  from profile_access pa
  left join public.semed_user_module_roles umr
    on umr.user_id=auth.uid() and umr.module_id=pa.id and umr.active
  left join public.semed_user_module_overrides uo
    on uo.user_id=auth.uid() and uo.module_id=pa.id and uo.active
   and pa.code <> 'votacao'
   and (uo.expires_at is null or uo.expires_at > now())
 )
 select jsonb_build_object(
  'user',jsonb_build_object('id',person.user_id,'email',person.email,'full_name',person.full_name,
    'area',person.area,'active',person.active,'must_change_password',person.must_change_password),
  'portal_admin',lower(person.email)='detic@uberabadigital.com.br',
  'profiles',coalesce((select jsonb_agg(distinct jsonb_build_object('code',p.code,'name',p.name))
    from public.semed_user_profiles up join public.semed_profiles p on p.id=up.profile_id
    where up.user_id=person.user_id and up.active and p.active),'[]'::jsonb),
  'modules',coalesce((select jsonb_agg(jsonb_build_object('code',ea.code,'name',ea.name,'route',ea.route,
    'role_code',ea.role_code,'scope',ea.scope,'expires_at',ea.expires_at,
    'permissions',jsonb_build_object('view',ea.can_view,'create',ea.can_create,'edit',ea.can_edit,
      'delete',ea.can_delete,'approve',ea.can_approve,'admin',ea.can_admin)) order by ea.display_order)
    from effective_access ea where ea.can_view),'[]'::jsonb)
 ) from person
$$;

revoke all on function public.get_my_access_context() from public,anon;
grant execute on function public.get_my_access_context() to authenticated;

commit;
