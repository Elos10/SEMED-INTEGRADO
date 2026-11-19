begin;
-- Audit link changes in the same transaction as the private index mutation.
create function private.audit_student_dossier_link() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' or new.active is distinct from old.active then
   insert into public.semed_student_dossier_audit(actor_id,student_id,action)
   values(new.confirmed_by,new.student_id,case when new.active then 'LINK' else 'UNLINK' end);
 end if;
 return new;
end $$;
revoke all on function private.audit_student_dossier_link() from public,anon,authenticated;
create trigger audit_student_dossier_link after insert or update of active on public.semed_student_record_links
for each row execute function private.audit_student_dossier_link();
commit;


