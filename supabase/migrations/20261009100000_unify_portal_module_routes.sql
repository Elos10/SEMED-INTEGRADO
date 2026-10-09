begin;

-- Os módulos passam a ser acessados pela mesma origem do portal. Isso permite
-- que os clientes Supabase reutilizem a sessão central sem expor tokens na URL.
update public.semed_modules
set route = case code
  when 'avaliacoes' then '/avaliacoes/'
  when 'monitor' then '/modules/monitor/'
  when 'comunicacao' then '/comunicacao/'
  when 'votacao' then '/modules/votacao/'
  else route
end,
updated_at = now()
where code in ('avaliacoes','monitor','comunicacao','votacao');

commit;
