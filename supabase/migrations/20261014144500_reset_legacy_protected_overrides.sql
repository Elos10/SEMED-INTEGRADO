begin;

update public.semed_user_module_overrides override_access
set can_view_sensitive=false, managed_at=now()
from public.semed_modules module
where override_access.module_id=module.id
  and module.code='comunicacao';

insert into public.semed_user_module_overrides(
  user_id,module_id,can_view_sensitive,active,managed_at
)
select person.user_id,module.id,true,true,now()
from public.semed_people person
join public.semed_modules module on module.code='comunicacao'
where lower(person.email)='detic@uberabadigital.com.br'
on conflict(user_id,module_id) do update set
  can_view_sensitive=true,
  active=true,
  managed_at=now();

commit;
