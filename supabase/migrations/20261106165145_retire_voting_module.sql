begin;

update public.semed_modules
set active=false, updated_at=now()
where code='votacao';

update public.semed_profiles
set active=false
where code='URNA_MESARIO';

update public.semed_user_profiles assignment
set active=false
from public.semed_profiles profile
where assignment.profile_id=profile.id
  and profile.code='URNA_MESARIO'
  and assignment.active;

update public.semed_user_module_roles role_assignment
set active=false, managed_at=now()
from public.semed_modules module
where role_assignment.module_id=module.id
  and module.code='votacao'
  and role_assignment.active;

update public.semed_user_module_overrides override_access
set active=false, managed_at=now()
from public.semed_modules module
where override_access.module_id=module.id
  and module.code='votacao'
  and override_access.active;

update public.votacao_accounts
set active=false, updated_at=now()
where active;

commit;
