begin;

update public.semed_profile_module_permissions permission
set
  can_view=true,
  can_create=true,
  can_edit=true,
  can_delete=true,
  can_approve=true,
  can_admin=true,
  can_assign=true,
  can_export=true,
  can_view_sensitive=true,
  updated_at=now()
from public.semed_profiles profile, public.semed_modules module
where permission.profile_id=profile.id
  and permission.module_id=module.id
  and profile.code='ADMIN_GERAL'
  and module.code='comunicacao';

insert into public.semed_user_module_overrides(
  user_id,module_id,can_view,can_create,can_edit,can_delete,can_approve,
  can_admin,can_assign,can_export,can_view_sensitive,active,managed_at
)
select
  assignment.user_id,module.id,true,true,true,true,true,
  true,true,true,true,true,now()
from public.semed_user_profiles assignment
join public.semed_profiles profile on profile.id=assignment.profile_id
join public.semed_modules module on module.code='comunicacao'
where profile.code='ADMIN_GERAL'
  and assignment.active=true
on conflict(user_id,module_id) do update set
  can_view=true,
  can_create=true,
  can_edit=true,
  can_delete=true,
  can_approve=true,
  can_admin=true,
  can_assign=true,
  can_export=true,
  can_view_sensitive=true,
  active=true,
  managed_at=now();

commit;
