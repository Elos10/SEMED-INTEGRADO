alter table public.semed_people add column if not exists must_change_password boolean not null default false;
alter table public.semed_people add column if not exists password_changed_at timestamptz;
update public.semed_people set must_change_password=false where lower(email)='detic@uberabadigital.com.br';

create table if not exists public.semed_user_module_roles(
 user_id uuid not null references auth.users(id) on delete cascade,
 module_id uuid not null references public.semed_modules(id) on delete cascade,
 role_code text not null,
 scope jsonb not null default '{}'::jsonb,
 active boolean not null default true,
 managed_by uuid references auth.users(id),
 managed_at timestamptz not null default now(),
 primary key(user_id,module_id)
);
create index if not exists semed_user_module_roles_module_idx on public.semed_user_module_roles(module_id);
alter table public.semed_user_module_roles enable row level security;
drop policy if exists semed_user_module_roles_read_self on public.semed_user_module_roles;
create policy semed_user_module_roles_read_self on public.semed_user_module_roles for select to authenticated
using(user_id=(select auth.uid()) and active);
revoke all on public.semed_user_module_roles from anon;
grant select on public.semed_user_module_roles to authenticated;

create or replace function private.is_detic_portal_admin()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.semed_people where user_id=(select auth.uid()) and active and lower(email)='detic@uberabadigital.com.br')
$$;
revoke all on function private.is_detic_portal_admin() from public,anon;
grant execute on function private.is_detic_portal_admin() to authenticated;

drop policy if exists semed_people_update_password_flag_self on public.semed_people;
create policy semed_people_update_password_flag_self on public.semed_people for update to authenticated
using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant update(must_change_password,password_changed_at) on public.semed_people to authenticated;

create or replace function public.confirm_my_password_change()
returns void language sql volatile security invoker set search_path=public,pg_temp as $$
 update public.semed_people set must_change_password=false,password_changed_at=now(),updated_at=now() where user_id=auth.uid()
$$;
revoke all on function public.confirm_my_password_change() from public,anon;
grant execute on function public.confirm_my_password_change() to authenticated;

insert into public.semed_profiles(code,name,description,active)
values
 ('GESTOR_SEMED','Gestor SEMED','Gestão institucional ampla, sem administração de usuários.',true),
 ('AVALIACOES_GESTOR','Avaliações — Gestor','Gerencia avaliações, indicadores, importações e análises.',true),
 ('AVALIACOES_CONSULTA','Avaliações — Consulta','Consulta painéis, indicadores e relatórios de avaliações.',true),
 ('INSCRICOES_GESTOR','Inscrições — Gestor','Gerencia atividades, turmas, inscrições e frequência.',true),
 ('INSCRICOES_OPERADOR','Inscrições — Operador','Cadastra e atualiza inscrições e frequência.',true),
 ('INSCRICOES_CONSULTA','Inscrições — Consulta','Consulta inscrições, turmas e relatórios.',true),
 ('MONITOR_GESTAO','Monitoramento — Gestão','Gerencia objetos, metas, indicadores e andamentos.',true),
 ('MONITOR_CONSULTA','Monitoramento — Consulta','Consulta objetos, indicadores e relatórios.',true),
 ('OS_SOLICITANTE','Ordens de Serviço — Solicitante','Abre e acompanha as próprias ordens de serviço.',true),
 ('OS_RESPONSAVEL','Ordens de Serviço — Responsável','Atende ordens atribuídas e atualiza seus status.',true),
 ('OS_CONSULTA','Ordens de Serviço — Consulta','Consulta ordens e cadastros sem alteração.',true),
 ('URNA_MESARIO','Urna — Mesário','Opera a urna da unidade escolar vinculada.',true)
on conflict(code) do update set name=excluded.name,description=excluded.description,active=true,updated_at=now();

with grants(profile_code,module_code,v,c,e,d,a,adm) as (values
 ('GESTOR_SEMED','avaliacoes',true,true,true,false,true,false),
 ('GESTOR_SEMED','inscricoes',true,true,true,false,true,false),
 ('GESTOR_SEMED','monitor',true,true,true,false,true,false),
 ('GESTOR_SEMED','os_semed',true,true,true,false,true,false),
 ('GESTOR_SEMED','votacao',true,false,false,false,false,false),
 ('AVALIACOES_GESTOR','avaliacoes',true,true,true,false,true,false),
 ('AVALIACOES_CONSULTA','avaliacoes',true,false,false,false,false,false),
 ('INSCRICOES_GESTOR','inscricoes',true,true,true,true,true,false),
 ('INSCRICOES_OPERADOR','inscricoes',true,true,true,false,false,false),
 ('INSCRICOES_CONSULTA','inscricoes',true,false,false,false,false,false),
 ('MONITOR_GESTAO','monitor',true,true,true,false,true,false),
 ('MONITOR_CONSULTA','monitor',true,false,false,false,false,false),
 ('OS_SOLICITANTE','os_semed',true,true,false,false,false,false),
 ('OS_RESPONSAVEL','os_semed',true,false,true,false,false,false),
 ('OS_CONSULTA','os_semed',true,false,false,false,false,false),
 ('URNA_MESARIO','votacao',true,false,true,false,false,false)
)
insert into public.semed_profile_module_permissions(profile_id,module_id,can_view,can_create,can_edit,can_delete,can_approve,can_admin,updated_at)
select p.id,m.id,g.v,g.c,g.e,g.d,g.a,g.adm,now() from grants g join public.semed_profiles p on p.code=g.profile_code join public.semed_modules m on m.code=g.module_code
on conflict(profile_id,module_id) do update set can_view=excluded.can_view,can_create=excluded.can_create,can_edit=excluded.can_edit,can_delete=excluded.can_delete,can_approve=excluded.can_approve,can_admin=excluded.can_admin,updated_at=now();

insert into public.semed_user_profiles(user_id,profile_id,active)
select va.user_id,p.id,true from public.votacao_accounts va cross join public.semed_profiles p
where va.active and va.access_kind='MESARIO' and p.code='URNA_MESARIO'
on conflict(user_id,profile_id) do update set active=true;

insert into public.semed_user_profiles(user_id,profile_id,active)
select mp.user_id,p.id,true from public.monitor_profiles mp cross join public.semed_profiles p
where mp.active and lower(mp.role)<>'administrador' and p.code='MONITOR_GESTAO'
on conflict(user_id,profile_id) do update set active=true;

insert into public.semed_user_module_roles(user_id,module_id,role_code,scope,active)
select va.user_id,m.id,va.access_kind,jsonb_build_object('unit_id',va.unit_id),va.active
from public.votacao_accounts va join public.semed_modules m on m.code='votacao'
on conflict(user_id,module_id) do update set role_code=excluded.role_code,scope=excluded.scope,active=excluded.active,managed_at=now();

insert into public.semed_user_module_roles(user_id,module_id,role_code,active)
select mp.user_id,m.id,mp.role,mp.active from public.monitor_profiles mp join public.semed_modules m on m.code='monitor'
on conflict(user_id,module_id) do update set role_code=excluded.role_code,active=excluded.active,managed_at=now();

insert into public.semed_user_module_roles(user_id,module_id,role_code,scope,active)
select op.user_id,m.id,op.role,jsonb_build_object('unit_name',op.unit_name),op.active from public.os_profiles op join public.semed_modules m on m.code='os_semed'
on conflict(user_id,module_id) do update set role_code=excluded.role_code,scope=excluded.scope,active=excluded.active,managed_at=now();

create or replace function public.get_my_access_context()
returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
 select jsonb_build_object(
  'user',jsonb_build_object('id',person.user_id,'email',person.email,'full_name',person.full_name,'active',person.active,'must_change_password',person.must_change_password),
  'portal_admin',lower(person.email)='detic@uberabadigital.com.br',
  'profiles',coalesce((select jsonb_agg(distinct jsonb_build_object('code',p.code,'name',p.name))
    from public.semed_user_profiles up join public.semed_profiles p on p.id=up.profile_id where up.user_id=person.user_id and up.active and p.active),'[]'::jsonb),
  'modules',coalesce((select jsonb_agg(jsonb_build_object('code',x.code,'name',x.name,'route',x.route,'role_code',x.role_code,'scope',x.scope,
    'permissions',jsonb_build_object('view',x.can_view,'create',x.can_create,'edit',x.can_edit,'delete',x.can_delete,'approve',x.can_approve,'admin',x.can_admin)) order by x.display_order)
   from(select m.id,m.code,m.name,m.route,m.display_order,umr.role_code,coalesce(umr.scope,'{}'::jsonb) scope,
    bool_or(pm.can_view) can_view,bool_or(pm.can_create) can_create,bool_or(pm.can_edit) can_edit,bool_or(pm.can_delete) can_delete,bool_or(pm.can_approve) can_approve,bool_or(pm.can_admin) can_admin
    from public.semed_user_profiles up join public.semed_profiles p on p.id=up.profile_id and p.active
    join public.semed_profile_module_permissions pm on pm.profile_id=p.id join public.semed_modules m on m.id=pm.module_id and m.active
    left join public.semed_user_module_roles umr on umr.user_id=up.user_id and umr.module_id=m.id and umr.active
    where up.user_id=person.user_id and up.active group by m.id,m.code,m.name,m.route,m.display_order,umr.role_code,umr.scope)x),'[]'::jsonb)
 ) from public.semed_people person where person.user_id=auth.uid() and person.active
$$;
