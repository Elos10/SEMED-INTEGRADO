begin;

-- Cadastro institucional único. A autorização não depende de metadados editáveis
-- do Auth: todos os vínculos e vigências são mantidos nesta tabela protegida.
alter table public.semed_people add column if not exists directorate text;
alter table public.semed_people add column if not exists unit_name text;
alter table public.semed_people add column if not exists job_title text;
alter table public.semed_people add column if not exists manager_name text;
alter table public.semed_people add column if not exists account_status text not null default 'ACTIVE';
alter table public.semed_people add column if not exists access_starts_at date;
alter table public.semed_people add column if not exists access_ends_at date;

update public.semed_people
set account_status = case when active then 'ACTIVE' else 'INACTIVE' end
where account_status is null or account_status not in ('ACTIVE','SUSPENDED','INACTIVE');

alter table public.semed_people drop constraint if exists semed_people_account_status_valid;
alter table public.semed_people add constraint semed_people_account_status_valid
  check (account_status in ('ACTIVE','SUSPENDED','INACTIVE'));
alter table public.semed_people drop constraint if exists semed_people_access_period_valid;
alter table public.semed_people add constraint semed_people_access_period_valid
  check (access_starts_at is null or access_ends_at is null or access_ends_at >= access_starts_at);

-- Ações corporativas adicionais, separando operação, publicação e dados sensíveis.
alter table public.semed_profile_module_permissions add column if not exists can_assign boolean not null default false;
alter table public.semed_profile_module_permissions add column if not exists can_export boolean not null default false;
alter table public.semed_profile_module_permissions add column if not exists can_view_sensitive boolean not null default false;
alter table public.semed_user_module_overrides add column if not exists can_assign boolean;
alter table public.semed_user_module_overrides add column if not exists can_export boolean;
alter table public.semed_user_module_overrides add column if not exists can_view_sensitive boolean;

-- Perfis funcionais claros. A Urna permanece com o modelo próprio existente.
insert into public.semed_profiles(code,name,description,active)
values
 ('AVALIACOES_ADMIN','Avaliações — Administrador','Administra configurações e todos os fluxos de avaliações.',true),
 ('AVALIACOES_GESTOR_REDE','Avaliações — Gestor da rede','Gerencia avaliações e resultados em toda a rede autorizada.',true),
 ('AVALIACOES_GESTOR_UNIDADE','Avaliações — Gestor de unidade','Gerencia avaliações e resultados da unidade vinculada.',true),
 ('AVALIACOES_PROFESSOR','Avaliações — Professor','Opera avaliações das turmas e componentes atribuídos.',true),
 ('AVALIACOES_OPERADOR','Avaliações — Operador','Importa e trata dados conforme o escopo concedido.',true),
 ('MONITOR_ADMIN','Monitoramento — Administrador','Administra objetos, etapas, finanças e configurações.',true),
 ('MONITOR_GESTOR_INSTITUCIONAL','Monitoramento — Gestor institucional','Acompanha e aprova informações no escopo institucional.',true),
 ('MONITOR_GESTOR_AREA','Monitoramento — Gestor de área','Gerencia objetos e etapas da área vinculada.',true),
 ('MONITOR_RESPONSAVEL','Monitoramento — Responsável','Movimenta etapas que estejam sob sua responsabilidade.',true),
 ('MONITOR_FINANCEIRO','Monitoramento — Financeiro','Registra e consulta execução financeira autorizada.',true),
 ('COMUNICACAO_ADMIN','Comunicação — Administrador','Administra configurações e fluxos de comunicação.',true),
 ('COMUNICACAO_GESTOR','Comunicação — Gestor','Gerencia comunicações da área ou unidade vinculada.',true),
 ('COMUNICACAO_EMISSOR','Comunicação — Emissor','Cria e encaminha comunicações institucionais.',true),
 ('COMUNICACAO_DESTINATARIO','Comunicação — Destinatário','Recebe, lê e responde comunicações direcionadas.',true),
 ('COMUNICACAO_AUDITOR','Comunicação — Auditoria','Consulta histórico e rastreabilidade sem alterar registros.',true),
 ('COMUNICACAO_PUBLICADOR','Comunicação — Publicador','Revisa, aprova e publica comunicações autorizadas.',true)
on conflict(code) do update set name=excluded.name,description=excluded.description,active=true,updated_at=now();

with grants(profile_code,module_code,v,c,e,d,a,adm,assign_,export_,sensitive_) as (values
 ('AVALIACOES_ADMIN','avaliacoes',true,true,true,true,true,true,true,true,true),
 ('AVALIACOES_GESTOR_REDE','avaliacoes',true,true,true,false,true,false,true,true,true),
 ('AVALIACOES_GESTOR_UNIDADE','avaliacoes',true,true,true,false,true,false,true,true,true),
 ('AVALIACOES_PROFESSOR','avaliacoes',true,true,true,false,false,false,false,false,false),
 ('AVALIACOES_OPERADOR','avaliacoes',true,true,true,false,false,false,false,true,false),
 ('MONITOR_ADMIN','monitor',true,true,true,true,true,true,true,true,true),
 ('MONITOR_GESTOR_INSTITUCIONAL','monitor',true,true,true,false,true,false,true,true,true),
 ('MONITOR_GESTOR_AREA','monitor',true,true,true,false,true,false,true,true,false),
 ('MONITOR_RESPONSAVEL','monitor',true,true,true,false,false,false,true,false,false),
 ('MONITOR_FINANCEIRO','monitor',true,true,true,false,true,false,false,true,true),
 ('COMUNICACAO_ADMIN','comunicacao',true,true,true,true,true,true,true,true,true),
 ('COMUNICACAO_GESTOR','comunicacao',true,true,true,false,true,false,true,true,true),
 ('COMUNICACAO_EMISSOR','comunicacao',true,true,true,false,false,false,true,false,false),
 ('COMUNICACAO_DESTINATARIO','comunicacao',true,false,true,false,false,false,false,false,false),
 ('COMUNICACAO_AUDITOR','comunicacao',true,false,false,false,false,false,false,true,true),
 ('COMUNICACAO_PUBLICADOR','comunicacao',true,true,true,false,true,false,true,true,false)
)
insert into public.semed_profile_module_permissions
 (profile_id,module_id,can_view,can_create,can_edit,can_delete,can_approve,can_admin,can_assign,can_export,can_view_sensitive,updated_at)
select p.id,m.id,g.v,g.c,g.e,g.d,g.a,g.adm,g.assign_,g.export_,g.sensitive_,now()
from grants g join public.semed_profiles p on p.code=g.profile_code join public.semed_modules m on m.code=g.module_code
on conflict(profile_id,module_id) do update set
 can_view=excluded.can_view,can_create=excluded.can_create,can_edit=excluded.can_edit,
 can_delete=excluded.can_delete,can_approve=excluded.can_approve,can_admin=excluded.can_admin,
 can_assign=excluded.can_assign,can_export=excluded.can_export,
 can_view_sensitive=excluded.can_view_sensitive,updated_at=now();

-- O administrador corporativo recebe as novas ações nos módulos comuns.
update public.semed_profile_module_permissions pm
set can_assign=true,can_export=true,can_view_sensitive=true,updated_at=now()
from public.semed_profiles p, public.semed_modules m
where pm.profile_id=p.id and pm.module_id=m.id and p.code='ADMIN_GERAL' and m.code<>'votacao';

create index if not exists semed_people_effective_access_idx
  on public.semed_people(user_id,account_status,access_starts_at,access_ends_at)
  where active;

create or replace function public.get_my_access_context()
returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
 with person as (
  select * from public.semed_people
  where user_id=(select auth.uid()) and active and account_status='ACTIVE'
    and (access_starts_at is null or access_starts_at <= current_date)
    and (access_ends_at is null or access_ends_at >= current_date)
 ), profile_access as (
  select m.id,m.code,m.name,m.route,m.display_order,
   bool_or(pm.can_view) can_view,bool_or(pm.can_create) can_create,
   bool_or(pm.can_edit) can_edit,bool_or(pm.can_delete) can_delete,
   bool_or(pm.can_approve) can_approve,bool_or(pm.can_admin) can_admin,
   bool_or(pm.can_assign) can_assign,bool_or(pm.can_export) can_export,
   bool_or(pm.can_view_sensitive) can_view_sensitive
  from public.semed_user_profiles up
  join public.semed_profiles p on p.id=up.profile_id and p.active
  join public.semed_profile_module_permissions pm on pm.profile_id=p.id
  join public.semed_modules m on m.id=pm.module_id and m.active
  where up.user_id=(select auth.uid()) and up.active
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
   coalesce(uo.can_assign,pa.can_assign) can_assign,
   coalesce(uo.can_export,pa.can_export) can_export,
   coalesce(uo.can_view_sensitive,pa.can_view_sensitive) can_view_sensitive,
   uo.expires_at
  from profile_access pa
  left join public.semed_user_module_roles umr
    on umr.user_id=(select auth.uid()) and umr.module_id=pa.id and umr.active
  left join public.semed_user_module_overrides uo
    on uo.user_id=(select auth.uid()) and uo.module_id=pa.id and uo.active
   and pa.code <> 'votacao' and (uo.expires_at is null or uo.expires_at > now())
 )
 select jsonb_build_object(
  'user',jsonb_build_object('id',person.user_id,'email',person.email,'full_name',person.full_name,
    'area',person.area,'directorate',person.directorate,'unit_name',person.unit_name,
    'job_title',person.job_title,'manager_name',person.manager_name,'active',person.active,
    'account_status',person.account_status,'access_starts_at',person.access_starts_at,
    'access_ends_at',person.access_ends_at,'must_change_password',person.must_change_password),
  'portal_admin',lower(person.email)='detic@uberabadigital.com.br',
  'profiles',coalesce((select jsonb_agg(distinct jsonb_build_object('code',p.code,'name',p.name))
    from public.semed_user_profiles up join public.semed_profiles p on p.id=up.profile_id
    where up.user_id=person.user_id and up.active and p.active),'[]'::jsonb),
  'modules',coalesce((select jsonb_agg(jsonb_build_object('code',ea.code,'name',ea.name,'route',ea.route,
    'role_code',ea.role_code,'scope',ea.scope,'expires_at',ea.expires_at,
    'permissions',jsonb_build_object('view',ea.can_view,'create',ea.can_create,'edit',ea.can_edit,
      'delete',ea.can_delete,'approve',ea.can_approve,'admin',ea.can_admin,'assign',ea.can_assign,
      'export',ea.can_export,'view_sensitive',ea.can_view_sensitive)) order by ea.display_order)
    from effective_access ea where ea.can_view),'[]'::jsonb)
 ) from person
$$;

revoke all on function public.get_my_access_context() from public,anon;
grant execute on function public.get_my_access_context() to authenticated;

commit;
