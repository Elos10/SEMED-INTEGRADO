begin;
alter policy dossier_audit_insert on public.semed_student_dossier_audit
with check (
 actor_id=auth.uid() and private.student_dossier_access()
 and action in ('SEARCH','OPEN','PRINT')
 and (action<>'PRINT' or private.student_dossier_access('export'))
);
commit;


