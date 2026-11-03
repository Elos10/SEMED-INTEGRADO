begin;

-- Sincronizações automáticas podem ocorrer sem uma sessão de usuário. Nesse caso,
-- o histórico continua registrado e changed_by identifica corretamente uma ação do sistema.
alter table public.semed_reference_catalog_history
  alter column changed_by drop not null;

commit;
