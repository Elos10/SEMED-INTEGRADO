-- Posse e movimentação dos andamentos do módulo Monitoramento.

create or replace function private.monitor_enforce_event_ownership()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id text := (select auth.uid())::text;
  previous_owner text := nullif(old.data->>'assignedTo', '');
  next_owner text := nullif(new.data->>'assignedTo', '');
begin
  if old.collection <> 'events' then
    return new;
  end if;

  -- A origem do andamento é imutável, mesmo quando o adaptador faz upsert.
  new.created_by := old.created_by;
  new.data := jsonb_set(
    coalesce(new.data, '{}'::jsonb),
    '{createdBy}',
    coalesce(old.data->'createdBy', to_jsonb(old.created_by::text)),
    true
  );
  new.data := jsonb_set(
    new.data,
    '{createdByName}',
    coalesce(old.data->'createdByName', '""'::jsonb),
    true
  );
  new.data := jsonb_set(
    new.data,
    '{eventAt}',
    coalesce(old.data->'eventAt', 'null'::jsonb),
    true
  );

  if previous_owner is not null and next_owner is null then
    raise exception 'Um andamento direcionado precisa permanecer com um responsável.'
      using errcode = '42501';
  end if;

  if next_owner is distinct from previous_owner then
    if next_owner is not null and not exists (
      select 1
      from public.monitor_profiles profile
      where profile.user_id::text = next_owner
        and profile.active
    ) then
      raise exception 'O novo responsável não possui perfil ativo no Monitoramento.'
        using errcode = '42501';
    end if;

    if nullif(new.data->>'assignedBy', '') is distinct from actor_id then
      raise exception 'O remetente do encaminhamento deve ser o usuário autenticado.'
        using errcode = '42501';
    end if;

    new.data := jsonb_set(new.data, '{receivedAt}', '""'::jsonb, true);
    new.data := jsonb_set(new.data, '{receivedBy}', '""'::jsonb, true);
    new.data := jsonb_set(new.data, '{receivedByName}', '""'::jsonb, true);
  end if;

  return new;
end;
$$;

drop trigger if exists monitor_event_ownership_guard on public.monitor_records;
create trigger monitor_event_ownership_guard
before update on public.monitor_records
for each row
when (old.collection = 'events')
execute function private.monitor_enforce_event_ownership();

drop policy if exists monitor_records_update on public.monitor_records;
create policy monitor_records_update
on public.monitor_records
for update
to authenticated
using (
  (select private.monitor_role()) is not null
  and (
    collection <> 'events'
    or (
      nullif(data->>'assignedTo', '') is not null
      and data->>'assignedTo' = (select auth.uid())::text
    )
    or (
      nullif(data->>'assignedTo', '') is null
      and coalesce(nullif(data->>'createdBy', ''), created_by::text) = (select auth.uid())::text
    )
  )
)
with check (
  (select private.monitor_role()) is not null
  and updated_by = (select auth.uid())
);

revoke all on function private.monitor_enforce_event_ownership() from public, anon, authenticated;

