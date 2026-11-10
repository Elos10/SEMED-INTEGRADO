begin;

drop policy if exists semed_person_links_deny_direct_access on public.semed_person_links;
create policy semed_person_links_deny_direct_access
  on public.semed_person_links
  for all
  to authenticated
  using (false)
  with check (false);

create index if not exists semed_person_links_created_by_idx
  on public.semed_person_links(created_by)
  where created_by is not null;

commit;
