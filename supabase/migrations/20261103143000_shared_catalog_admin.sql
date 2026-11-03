begin;

insert into public.semed_modules(code,name,description,icon,route,display_order,active)
values ('cadastros','Cadastros Compartilhados','Tabelas institucionais reutilizadas pelos sistemas do Portal.','database','/',60,true)
on conflict (code) do update set
  name=excluded.name,description=excluded.description,icon=excluded.icon,
  route=excluded.route,display_order=excluded.display_order,active=true,updated_at=now();

insert into public.semed_profiles(code,name,description,active)
values
 ('CADASTROS_CONSULTA','Cadastros Compartilhados — Consulta','Consulta as tabelas institucionais compartilhadas sem alterar registros.',true),
 ('CADASTROS_GESTOR','Cadastros Compartilhados — Gestor','Cria, edita, ativa e inativa tabelas institucionais compartilhadas.',true)
on conflict (code) do update set name=excluded.name,description=excluded.description,active=true;

with grants(profile_code,v,c,e,adm) as (values
 ('CADASTROS_CONSULTA',true,false,false,false),
 ('CADASTROS_GESTOR',true,true,true,true),
 ('ADMIN_GERAL',true,true,true,true)
)
insert into public.semed_profile_module_permissions(
 profile_id,module_id,can_view,can_create,can_edit,can_delete,can_approve,
 can_admin,can_assign,can_export,can_view_sensitive,updated_at
)
select p.id,m.id,g.v,g.c,g.e,false,false,g.adm,false,true,false,now()
from grants g join public.semed_profiles p on p.code=g.profile_code
join public.semed_modules m on m.code='cadastros'
on conflict(profile_id,module_id) do update set
 can_view=excluded.can_view,can_create=excluded.can_create,can_edit=excluded.can_edit,
 can_delete=false,can_approve=false,can_admin=excluded.can_admin,
 can_assign=false,can_export=true,can_view_sensitive=false,updated_at=now();

create table if not exists public.semed_reference_catalog_history (
 id bigint generated always as identity primary key,
 reference_id uuid not null,
 operation text not null check(operation in ('INSERT','UPDATE')),
 previous_data jsonb,
 new_data jsonb not null,
 changed_by uuid not null,
 changed_at timestamptz not null default now()
);
create index if not exists semed_reference_history_reference_idx
 on public.semed_reference_catalog_history(reference_id,changed_at desc);
create index if not exists semed_reference_history_changed_at_idx
 on public.semed_reference_catalog_history(changed_at desc);
alter table public.semed_reference_catalog_history enable row level security;
revoke all on public.semed_reference_catalog_history from anon;
grant select on public.semed_reference_catalog_history to authenticated;

drop policy if exists semed_reference_history_read on public.semed_reference_catalog_history;
create policy semed_reference_history_read on public.semed_reference_catalog_history
 for select to authenticated using ((select private.semed_can_module('cadastros','view')));

drop policy if exists semed_reference_catalogs_module_read on public.semed_reference_catalogs;
create policy semed_reference_catalogs_module_read on public.semed_reference_catalogs
 for select to authenticated using ((select private.semed_can_module('cadastros','view')));
drop policy if exists semed_reference_catalogs_module_insert on public.semed_reference_catalogs;
create policy semed_reference_catalogs_module_insert on public.semed_reference_catalogs
 for insert to authenticated with check ((select private.semed_can_module('cadastros','create')));
drop policy if exists semed_reference_catalogs_module_update on public.semed_reference_catalogs;
create policy semed_reference_catalogs_module_update on public.semed_reference_catalogs
 for update to authenticated
 using ((select private.semed_can_module('cadastros','edit')))
 with check ((select private.semed_can_module('cadastros','edit')));
grant select,insert,update on public.semed_reference_catalogs to authenticated;

-- A unidade educacional permanece vinculada à origem de Avaliações, mas pode ser
-- mantida na administração central. A política preserva o mesmo controle do módulo.
drop policy if exists avalia_units_catalog_admin_update on public.avalia_educational_units;
create policy avalia_units_catalog_admin_update on public.avalia_educational_units
 for update to authenticated
 using ((select private.semed_can_module('cadastros','edit')))
 with check ((select private.semed_can_module('cadastros','edit')));
drop policy if exists avalia_units_catalog_admin_insert on public.avalia_educational_units;
create policy avalia_units_catalog_admin_insert on public.avalia_educational_units
 for insert to authenticated
 with check ((select private.semed_can_module('cadastros','create')));
grant insert,update(name,code,active) on public.avalia_educational_units to authenticated;

create or replace function private.audit_semed_reference_catalog()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.semed_reference_catalog_history(reference_id,operation,previous_data,new_data,changed_by)
  values(new.id,tg_op,case when tg_op='UPDATE' then to_jsonb(old) end,to_jsonb(new),(select auth.uid()));
  return new;
end $$;
revoke all on function private.audit_semed_reference_catalog() from public,anon,authenticated;

drop trigger if exists semed_reference_catalog_audit on public.semed_reference_catalogs;
create trigger semed_reference_catalog_audit after insert or update on public.semed_reference_catalogs
for each row execute function private.audit_semed_reference_catalog();

commit;
