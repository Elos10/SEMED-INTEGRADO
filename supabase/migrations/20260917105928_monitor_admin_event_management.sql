-- Permite ao Administrador editar e excluir logicamente Etapas e Sub-Etapas.
-- Os demais perfis permanecem submetidos às regras de posse e histórico.

create or replace function private.monitor_enforce_event_ownership()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id text := (select auth.uid())::text;
  administrator boolean := (select private.monitor_role()) = 'administrador';
  previous_owner text := nullif(old.data->>'assignedTo', '');
  next_owner text := nullif(new.data->>'assignedTo', '');
  old_history jsonb := coalesce(old.data->'movementHistory', '[]'::jsonb);
  new_history jsonb := coalesce(new.data->'movementHistory', '[]'::jsonb);
  last_movement jsonb;
  movement_changed boolean;
begin
  if old.collection <> 'events' then
    return new;
  end if;

  -- A autoria e a data originais continuam imutáveis para todos os perfis.
  new.created_by := old.created_by;
  new.data := jsonb_set(coalesce(new.data, '{}'::jsonb), '{createdBy}', coalesce(old.data->'createdBy', to_jsonb(old.created_by::text)), true);
  new.data := jsonb_set(new.data, '{createdByName}', coalesce(old.data->'createdByName', '""'::jsonb), true);
  new.data := jsonb_set(new.data, '{eventAt}', coalesce(old.data->'eventAt', 'null'::jsonb), true);

  -- O Administrador pode administrar o registro completo, inclusive exclusão lógica.
  -- A policy abaixo ainda exige autenticação e updated_by = auth.uid().
  if administrator then
    return new;
  end if;

  if previous_owner is not null then
    if old.data->'initialSnapshot' is null then
      new.data := jsonb_set(new.data, '{initialSnapshot}', jsonb_build_object(
        'type', old.data->>'eventType', 'status', old.data->>'status',
        'progress', coalesce(old.data->'progress', '0'::jsonb),
        'description', old.data->>'description',
        'productDelivery', old.data->>'productDelivery',
        'responsible', old.data->>'responsible', 'area', old.data->>'area',
        'observation', old.data->>'observation',
        'assignedTo', old.data->>'assignedTo',
        'assignedToName', old.data->>'assignedToName',
        'assignedBy', old.data->>'assignedBy',
        'assignedByName', old.data->>'assignedByName',
        'directedAt', coalesce(old.data->>'eventAt', old.created_at::text)
      ), true);
    elsif new.data->'initialSnapshot' is distinct from old.data->'initialSnapshot' then
      raise exception 'O retrato inicial do direcionamento é imutável.' using errcode = '42501';
    end if;

    if (new.data - array['eventType','status','progress','assigneeNote','movementHistory','initialSnapshot','updatedAt','updatedBy','receivedAt','receivedBy','receivedByName'])
       is distinct from
       (old.data - array['eventType','status','progress','assigneeNote','movementHistory','initialSnapshot','updatedAt','updatedBy','receivedAt','receivedBy','receivedByName']) then
      raise exception 'O destinatário pode alterar somente Tipo, Status e Resposta/Movimentação.' using errcode = '42501';
    end if;

    if jsonb_typeof(old_history) <> 'array' or jsonb_typeof(new_history) <> 'array' then
      raise exception 'O histórico de movimentações deve ser uma lista.' using errcode = '22023';
    end if;

    movement_changed := new_history is distinct from old_history
      or new.data->>'eventType' is distinct from old.data->>'eventType'
      or new.data->>'status' is distinct from old.data->>'status'
      or new.data->>'assigneeNote' is distinct from old.data->>'assigneeNote';

    if movement_changed then
      if jsonb_array_length(new_history) <> jsonb_array_length(old_history) + 1
         or (new_history - (jsonb_array_length(new_history) - 1)) is distinct from old_history then
        raise exception 'Cada atualização deve acrescentar exatamente uma movimentação, sem alterar as anteriores.' using errcode = '42501';
      end if;

      last_movement := new_history->(jsonb_array_length(new_history) - 1);
      if nullif(btrim(last_movement->>'response'), '') is null
         or last_movement->>'movedBy' is distinct from actor_id
         or last_movement->>'type' is distinct from new.data->>'eventType'
         or last_movement->>'status' is distinct from new.data->>'status'
         or last_movement->>'response' is distinct from new.data->>'assigneeNote' then
        raise exception 'A nova movimentação deve identificar o usuário e corresponder aos campos enviados.' using errcode = '42501';
      end if;
    end if;

    if lower(coalesce(new.data->>'status', '')) in ('finalizado','concluido','concluído') then
      new.data := jsonb_set(new.data, '{progress}', '100'::jsonb, true);
    else
      new.data := jsonb_set(new.data, '{progress}', coalesce(old.data->'progress', '0'::jsonb), true);
    end if;
  elsif next_owner is not null then
    if not exists (
      select 1 from public.monitor_profiles profile
      where profile.user_id::text = next_owner and profile.active
    ) then
      raise exception 'O responsável não possui perfil ativo no Monitoramento.' using errcode = '42501';
    end if;
    if nullif(new.data->>'assignedBy', '') is distinct from actor_id then
      raise exception 'O remetente do direcionamento deve ser o usuário autenticado.' using errcode = '42501';
    end if;
    if jsonb_typeof(new.data->'initialSnapshot') <> 'object'
       or jsonb_typeof(coalesce(new.data->'movementHistory', '[]'::jsonb)) <> 'array'
       or jsonb_array_length(coalesce(new.data->'movementHistory', '[]'::jsonb)) <> 0 then
      raise exception 'O direcionamento deve preservar o retrato inicial e iniciar um histórico vazio.' using errcode = '22023';
    end if;
    new.data := jsonb_set(new.data, '{receivedAt}', '""'::jsonb, true);
    new.data := jsonb_set(new.data, '{receivedBy}', '""'::jsonb, true);
    new.data := jsonb_set(new.data, '{receivedByName}', '""'::jsonb, true);
  end if;

  return new;
end;
$$;

drop policy if exists monitor_records_update on public.monitor_records;
create policy monitor_records_update
on public.monitor_records
for update
to authenticated
using (
  (select private.monitor_role()) is not null
  and (
    (select private.monitor_role()) = 'administrador'
    or collection <> 'events'
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
