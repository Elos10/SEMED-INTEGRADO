insert into public.semed_modules(code,name,description,icon,route,display_order,active)
values(
  'comunicacao',
  'Comunicação',
  'Comunicação institucional, protocolos, documentos e acompanhamento.',
  'message-square',
  'https://semed-comunicacao.vercel.app/',
  60,
  true
)
on conflict(code) do update set
  name=excluded.name,
  description=excluded.description,
  icon=excluded.icon,
  route=excluded.route,
  display_order=excluded.display_order,
  active=true,
  updated_at=now();

insert into public.semed_profile_module_permissions(
  profile_id,module_id,can_view,can_create,can_edit,can_delete,can_approve,can_admin
)
select p.id,m.id,true,true,true,true,true,true
from public.semed_profiles p
cross join public.semed_modules m
where p.code='ADMIN_GERAL' and p.active and m.code='comunicacao'
on conflict(profile_id,module_id) do update set
  can_view=true,
  can_create=true,
  can_edit=true,
  can_delete=true,
  can_approve=true,
  can_admin=true,
  updated_at=now();
