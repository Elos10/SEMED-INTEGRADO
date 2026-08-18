# Registro de alterações

## 2026-08-18 — Sessão e permissões centralizadas

- incluído login único do portal por Supabase Auth;
- cartões de sistemas filtrados pelo retorno de `get_my_modules()`;
- adicionada proteção de acesso direto às cinco rotas de módulos;
- reaproveitada a sessão central nos módulos Avaliações, Inscrições e Urna;
- uniformizado o encerramento da sessão no módulo Inscrições;
- reforçadas as políticas RLS de Monitoramento, Ordens de Serviço e Urna com a
  permissão central do módulo;
- preservadas as regras de negócio e as tabelas internas de cada aplicação.

