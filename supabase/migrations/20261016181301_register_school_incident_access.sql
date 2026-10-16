begin;

insert into public.semed_modules(code,name,description,route,display_order,active)
values ('incidentes','Incidente Escolar','Registro, acompanhamento e relatórios de incidentes escolares.','/comunicacao/?view=incidentes',35,true)
on conflict(code) do update set name=excluded.name,description=excluded.description,route=excluded.route,display_order=excluded.display_order,active=true;

insert into public.semed_profiles(code,name,description,active) values
 ('INCIDENTE_REGISTRADOR','Incidente Escolar — Registrador','Cria e acompanha os incidentes que registrou.',true),
 ('INCIDENTE_UNIDADE','Incidente Escolar — Gestor de unidade','Consulta, encaminha e acompanha incidentes da unidade vinculada.',true),
 ('INCIDENTE_CENTRAL','Incidente Escolar — Gestão central','Acompanha incidentes de todas as unidades e acessa relatórios.',true),
 ('INCIDENTE_ADMIN','Incidente Escolar — Administrador','Administra integralmente o módulo de incidentes escolares.',true)
on conflict(code) do update set name=excluded.name,description=excluded.description,active=true,updated_at=now();

with grants(profile_code,v,c,e,d,a,adm,assign_,export_,sensitive_) as (values
 ('INCIDENTE_REGISTRADOR',true,true,true,false,false,false,false,false,false),
 ('INCIDENTE_UNIDADE',true,true,true,false,false,false,true,true,false),
 ('INCIDENTE_CENTRAL',true,true,true,false,true,false,true,true,true),
 ('INCIDENTE_ADMIN',true,true,true,true,true,true,true,true,true),
 ('ADMIN_GERAL',true,true,true,true,true,true,true,true,true)
)
insert into public.semed_profile_module_permissions(profile_id,module_id,can_view,can_create,can_edit,can_delete,can_approve,can_admin,can_assign,can_export,can_view_sensitive,updated_at)
select p.id,m.id,g.v,g.c,g.e,g.d,g.a,g.adm,g.assign_,g.export_,g.sensitive_,now()
from grants g join public.semed_profiles p on p.code=g.profile_code join public.semed_modules m on m.code='incidentes'
on conflict(profile_id,module_id) do update set can_view=excluded.can_view,can_create=excluded.can_create,can_edit=excluded.can_edit,can_delete=excluded.can_delete,can_approve=excluded.can_approve,can_admin=excluded.can_admin,can_assign=excluded.can_assign,can_export=excluded.can_export,can_view_sensitive=excluded.can_view_sensitive,updated_at=now();

-- Os perfis de incidente também recebem o acesso mínimo ao contêiner Comunicação.
insert into public.semed_profile_module_permissions(profile_id,module_id,can_view,can_create,can_edit,can_delete,can_approve,can_admin,can_assign,can_export,can_view_sensitive,updated_at)
select p.id,m.id,true,false,false,false,false,false,false,false,false,now()
from public.semed_profiles p join public.semed_modules m on m.code='comunicacao'
where p.code in ('INCIDENTE_REGISTRADOR','INCIDENTE_UNIDADE','INCIDENTE_CENTRAL','INCIDENTE_ADMIN')
on conflict(profile_id,module_id) do update set can_view=true,updated_at=now();

commit;
