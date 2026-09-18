alter table public.avd_app_state add column if not exists version bigint not null default 1;
alter table public.avd_app_state add column if not exists updated_by uuid references auth.users(id);
alter table public.semed_sistema add column if not exists version bigint not null default 1;
alter table public.semed_sistema add column if not exists updated_by uuid references auth.users(id);

create or replace function public.commit_avd_app_state(p_id text,p_expected_version bigint,p_value jsonb)
returns bigint language plpgsql security invoker set search_path=public,pg_temp as $$
declare next_version bigint;
begin
  update public.avd_app_state set value=p_value,version=version+1,updated_at=now(),updated_by=auth.uid()
  where id=p_id and version=p_expected_version returning version into next_version;
  if next_version is not null then return next_version; end if;
  if p_expected_version=0 then
    begin
      insert into public.avd_app_state(id,value,version,updated_at,updated_by) values(p_id,p_value,1,now(),auth.uid())
      returning version into next_version; return next_version;
    exception when unique_violation then null;
    end;
  end if;
  raise exception 'version conflict' using errcode='40001';
end $$;

create or replace function public.commit_inscricoes_state(p_id text,p_expected_version bigint,p_value jsonb)
returns bigint language plpgsql security invoker set search_path=public,pg_temp as $$
declare next_version bigint;
begin
  update public.semed_sistema set value=p_value,version=version+1,updated_at=now(),updated_by=auth.uid()
  where id=p_id and version=p_expected_version returning version into next_version;
  if next_version is not null then return next_version; end if;
  if p_expected_version=0 then
    begin
      insert into public.semed_sistema(id,value,version,updated_at,updated_by) values(p_id,p_value,1,now(),auth.uid())
      returning version into next_version; return next_version;
    exception when unique_violation then null;
    end;
  end if;
  raise exception 'version conflict' using errcode='40001';
end $$;

revoke all on function public.commit_avd_app_state(text,bigint,jsonb) from public,anon;
revoke all on function public.commit_inscricoes_state(text,bigint,jsonb) from public,anon;
grant execute on function public.commit_avd_app_state(text,bigint,jsonb) to authenticated;
grant execute on function public.commit_inscricoes_state(text,bigint,jsonb) to authenticated;
