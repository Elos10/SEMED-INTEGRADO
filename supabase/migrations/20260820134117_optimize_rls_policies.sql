create index if not exists avd_app_state_updated_by_idx on public.avd_app_state(updated_by);
create index if not exists semed_sistema_updated_by_idx on public.semed_sistema(updated_by);

create or replace function private.current_auth_email()
returns text language sql stable security invoker set search_path='' as $$
 select lower(coalesce(auth.jwt()->>'email',''))
$$;
revoke all on function private.current_auth_email() from public,anon;
grant execute on function private.current_auth_email() to authenticated;

drop policy if exists os_orders_read_authorized on public.os_orders;
create policy os_orders_read_authorized on public.os_orders for select to authenticated
using (
 (select private.os_current_role()) in ('Administrador','Gestor/Consulta')
 or opened_by=(select auth.uid())
 or lower(assigned_to_email)=(select private.current_auth_email())
);

drop policy if exists os_orders_create_authorized on public.os_orders;
create policy os_orders_create_authorized on public.os_orders for insert to authenticated
with check (
 (select private.os_current_role()) in ('Administrador','Solicitante')
 and opened_by=(select auth.uid())
 and lower(opened_by_email)=(select private.current_auth_email())
);

drop policy if exists os_orders_update_authorized on public.os_orders;
create policy os_orders_update_authorized on public.os_orders for update to authenticated
using (
 (select private.os_current_role())='Administrador'
 or ((select private.os_current_role())='Responsável' and lower(assigned_to_email)=(select private.current_auth_email()))
)
with check (
 (select private.os_current_role())='Administrador'
 or ((select private.os_current_role())='Responsável' and lower(assigned_to_email)=(select private.current_auth_email()))
);

drop policy if exists os_profiles_admin_write on public.os_profiles;
drop policy if exists os_profiles_admin_insert on public.os_profiles;
create policy os_profiles_admin_insert on public.os_profiles for insert to authenticated
with check ((select private.os_current_role())='Administrador');
drop policy if exists os_profiles_admin_update on public.os_profiles;
create policy os_profiles_admin_update on public.os_profiles for update to authenticated
using ((select private.os_current_role())='Administrador')
with check ((select private.os_current_role())='Administrador');
drop policy if exists os_profiles_admin_delete on public.os_profiles;
create policy os_profiles_admin_delete on public.os_profiles for delete to authenticated
using ((select private.os_current_role())='Administrador');
