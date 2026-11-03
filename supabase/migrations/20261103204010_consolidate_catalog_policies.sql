begin;

drop policy if exists semed_reference_catalogs_module_read on public.semed_reference_catalogs;
drop policy if exists semed_reference_catalogs_read on public.semed_reference_catalogs;
create policy semed_reference_catalogs_read on public.semed_reference_catalogs
 for select to authenticated using (
   (active and exists (
     select 1 from public.semed_people person
     where person.user_id=(select auth.uid()) and person.active and person.account_status='ACTIVE'
   )) or (select private.semed_can_module('cadastros','view'))
 );

drop policy if exists avalia_units_catalog_admin_insert on public.avalia_educational_units;
drop policy if exists avalia_units_insert on public.avalia_educational_units;
create policy avalia_units_insert on public.avalia_educational_units
 for insert to authenticated with check (
   (organization_id=(select private.avalia_current_organization_id()) and (select private.semed_can_module('avaliacoes','create')))
   or (organization_id=(select private.avalia_current_organization_id())
       and (select private.semed_can_module('cadastros','create')))
 );

drop policy if exists avalia_units_catalog_admin_update on public.avalia_educational_units;
drop policy if exists avalia_units_update on public.avalia_educational_units;
create policy avalia_units_update on public.avalia_educational_units
 for update to authenticated using (
   (organization_id=(select private.avalia_current_organization_id()) and (select private.semed_can_module('avaliacoes','edit')))
   or (organization_id=(select private.avalia_current_organization_id())
       and (select private.semed_can_module('cadastros','edit')))
 ) with check (
   (organization_id=(select private.avalia_current_organization_id()) and (select private.semed_can_module('avaliacoes','edit')))
   or (organization_id=(select private.avalia_current_organization_id())
       and (select private.semed_can_module('cadastros','edit')))
 );

commit;
