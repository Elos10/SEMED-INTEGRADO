-- Endurecimento de funções privilegiadas e políticas corporativas.
create index if not exists semed_profile_module_permissions_module_idx on public.semed_profile_module_permissions(module_id);
create index if not exists semed_user_profiles_profile_idx on public.semed_user_profiles(profile_id);

drop policy if exists semed_user_profiles_read_self on public.semed_user_profiles;
create policy semed_user_profiles_read_self on public.semed_user_profiles for select to authenticated
using (user_id=(select auth.uid()) and active);

drop policy if exists semed_profiles_read_assigned on public.semed_profiles;
create policy semed_profiles_read_assigned on public.semed_profiles for select to authenticated
using (active and exists(select 1 from public.semed_user_profiles up where up.profile_id=semed_profiles.id and up.user_id=(select auth.uid()) and up.active));

drop policy if exists semed_permissions_read_assigned on public.semed_profile_module_permissions;
create policy semed_permissions_read_assigned on public.semed_profile_module_permissions for select to authenticated
using (exists(select 1 from public.semed_user_profiles up where up.profile_id=semed_profile_module_permissions.profile_id and up.user_id=(select auth.uid()) and up.active));

drop policy if exists semed_modules_read_assigned on public.semed_modules;
create policy semed_modules_read_assigned on public.semed_modules for select to authenticated
using (active and exists(
 select 1 from public.semed_profile_module_permissions pm
 join public.semed_user_profiles up on up.profile_id=pm.profile_id
 where pm.module_id=semed_modules.id and up.user_id=(select auth.uid()) and up.active
));

grant select on public.semed_modules,public.semed_profiles,public.semed_user_profiles,public.semed_profile_module_permissions to authenticated;
revoke all on public.semed_modules,public.semed_profiles,public.semed_user_profiles,public.semed_profile_module_permissions from anon;

create or replace function private.semed_can_module(p_module text,p_action text default 'view')
returns boolean language sql stable security definer set search_path='' as $$
 select exists(
  select 1 from public.semed_people person
  join public.semed_user_profiles up on up.user_id=person.user_id and up.active
  join public.semed_profiles p on p.id=up.profile_id and p.active
  join public.semed_profile_module_permissions pm on pm.profile_id=p.id
  join public.semed_modules m on m.id=pm.module_id and m.active
  where person.user_id=(select auth.uid()) and person.active and m.code=p_module
  and case p_action
   when 'create' then pm.can_create or pm.can_admin
   when 'edit' then pm.can_edit or pm.can_admin
   when 'delete' then pm.can_delete or pm.can_admin
   when 'approve' then pm.can_approve or pm.can_admin
   when 'admin' then pm.can_admin
   else pm.can_view or pm.can_admin end
 )
$$;
revoke all on function private.semed_can_module(text,text) from public,anon;
grant execute on function private.semed_can_module(text,text) to authenticated;

alter function public.get_my_modules() security invoker;
alter function public.get_my_access_context() security invoker;

revoke all on function private.os_current_role() from public,anon;
revoke all on function private.monitor_role() from public,anon;
revoke all on function private.votacao_role() from public,anon;
grant execute on function private.os_current_role(),private.monitor_role(),private.votacao_role() to authenticated;

drop policy if exists votacao_state_update_authorized on public.votacao_state;
create policy votacao_state_update_authorized on public.votacao_state for update to authenticated
using (
 private.semed_can_module('votacao','edit')
 and private.votacao_role() is not null
 and (key='voting' or private.votacao_role()='ADMINISTRADOR')
)
with check (
 private.semed_can_module('votacao','edit')
 and private.votacao_role() is not null
 and (key='voting' or private.votacao_role()='ADMINISTRADOR')
);
alter function public.commit_votacao_state(jsonb) security invoker;
revoke all on function public.commit_votacao_state(jsonb) from public,anon;
grant execute on function public.commit_votacao_state(jsonb) to authenticated;
