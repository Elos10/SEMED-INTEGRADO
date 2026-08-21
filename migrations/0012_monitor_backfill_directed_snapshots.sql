-- Consolida como retrato inicial os andamentos direcionados antes da migration 0011.
-- A função de proteção cria o snapshot a partir do próprio registro preexistente.

update public.monitor_records
set updated_at = updated_at
where collection = 'events'
  and nullif(data->>'assignedTo', '') is not null
  and data->'initialSnapshot' is null;
