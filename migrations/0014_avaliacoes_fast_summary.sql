-- Indicadores leves da tela de importações, sem transferir todos os registros
-- para o navegador. SECURITY INVOKER mantém as políticas RLS da tabela.
create or replace function public.avd_records_summary()
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $function$
  select jsonb_build_object(
    'totalAlunos', count(*),
    'pontosPossiveis', coalesce(sum(pontos_possiveis), 0),
    'acertos', coalesce(sum(pontos), 0),
    'percentualAcertos', case
      when coalesce(sum(pontos_possiveis), 0) = 0 then 0
      else round((sum(pontos)::numeric / sum(pontos_possiveis)::numeric) * 100, 1)
    end
  )
  from public.avd_records;
$function$;

revoke all on function public.avd_records_summary() from public, anon;
grant execute on function public.avd_records_summary() to authenticated;
