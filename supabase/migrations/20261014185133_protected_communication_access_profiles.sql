begin;

insert into public.semed_profiles(code,name,description,active)
values
  ('COMUNICACAO_PROTEGIDA_ACESSO','Comunicação Protegida — Acesso','Cria registros protegidos e consulta somente os casos em que foi autorizado.',true),
  ('COMUNICACAO_PROTEGIDA_GESTOR','Comunicação Protegida — Gestor','Acompanha todos os casos, relatórios e trilhas de auditoria da Comunicação Protegida.',true)
on conflict(code) do update set
  name=excluded.name,
  description=excluded.description,
  active=true,
  updated_at=now();

-- O acesso sensível deixa de ser consequência automática de perfis amplos.
update public.semed_profile_module_permissions permission
set can_view_sensitive=false, updated_at=now()
from public.semed_modules module
where permission.module_id=module.id
  and module.code='comunicacao';

insert into public.semed_profile_module_permissions(
  profile_id,module_id,can_view,can_create,can_edit,can_delete,can_approve,
  can_admin,can_assign,can_export,can_view_sensitive,updated_at
)
select profile.id,module.id,true,false,false,false,false,false,false,false,true,now()
from public.semed_profiles profile
join public.semed_modules module on module.code='comunicacao'
where profile.code in ('COMUNICACAO_PROTEGIDA_ACESSO','COMUNICACAO_PROTEGIDA_GESTOR')
on conflict(profile_id,module_id) do update set
  can_view=true,
  can_create=false,
  can_edit=false,
  can_delete=false,
  can_approve=false,
  can_admin=false,
  can_assign=false,
  can_export=false,
  can_view_sensitive=true,
  updated_at=now();

-- Gestor inicial nominal para que a governança possa ser administrada no portal.
insert into public.semed_user_profiles(user_id,profile_id,active)
select person.user_id,profile.id,true
from public.semed_people person
join public.semed_profiles profile on profile.code='COMUNICACAO_PROTEGIDA_GESTOR'
where lower(person.email)='detic@uberabadigital.com.br'
on conflict(user_id,profile_id) do update set active=true;

commit;
