-- Execute os três comandos juntos depois das migrations.
-- Pode ser repetido e nunca armazena a senha do usuário.

insert into public.organizations (id, name)
select gen_random_uuid(), 'Secretaria Municipal de Educação de Uberaba'
where not exists (
  select 1
  from public.organizations
  where name = 'Secretaria Municipal de Educação de Uberaba'
);

insert into public.profiles (id, organization_id, name, role, active)
select
  u.id,
  (
    select o.id
    from public.organizations o
    where o.name = 'Secretaria Municipal de Educação de Uberaba'
    order by o.created_at
    limit 1
  ),
  'Administrador DETIC',
  'ADMIN',
  true
from auth.users u
where lower(u.email) = lower('detic@uberabadigital.com.br')
on conflict (id) do update set
  organization_id = excluded.organization_id,
  name = excluded.name,
  role = excluded.role,
  active = excluded.active;

select
  u.email,
  p.role,
  p.active,
  o.name as organization
from auth.users u
left join public.profiles p on p.id = u.id
left join public.organizations o on o.id = p.organization_id
where lower(u.email) = lower('detic@uberabadigital.com.br');
