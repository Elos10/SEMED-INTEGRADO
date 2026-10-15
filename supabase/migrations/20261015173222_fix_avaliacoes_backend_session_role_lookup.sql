-- Em funções SECURITY DEFINER, current_user é o proprietário da função.
-- session_user mantém a identidade real da credencial conectada ao pooler.
create or replace function private.avalia_backend_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select organization_id
  from private.avalia_backend_role_tenants
  where role_name = session_user
$$;
