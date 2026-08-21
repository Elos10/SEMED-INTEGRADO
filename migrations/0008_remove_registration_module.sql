begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Remove only the functional state and API created exclusively for the retired module.
drop function if exists public.commit_inscricoes_state(text, bigint, jsonb);
drop table if exists public.semed_sistema;

-- Remove access assignments before the catalog entries, without affecting users.
delete from public.semed_user_module_roles
where module_id in (select id from public.semed_modules where code = 'inscricoes');

delete from public.semed_profile_module_permissions
where module_id in (select id from public.semed_modules where code = 'inscricoes')
   or profile_id in (select id from public.semed_profiles where code like 'INSCRICOES\_%' escape '\');

delete from public.semed_user_profiles
where profile_id in (select id from public.semed_profiles where code like 'INSCRICOES\_%' escape '\');

delete from public.semed_profiles
where code like 'INSCRICOES\_%' escape '\';

delete from public.semed_modules
where code = 'inscricoes';

delete from public.semed_audit
where module_code = 'inscricoes';

commit;
