# Registro de alterações

## 2026-08-18 — Identidade, credenciais e auditoria corporativas

- criada `semed_people`, sincronizada com `auth.users`;
- criado `get_my_access_context()` com usuário, perfis, módulos e operações;
- criado `semed_audit` com RLS e identificação pelo UUID do Auth;
- portal e guardas passaram a exigir pessoa ativa e permissão de visualização;
- removidas senhas iniciais e persistência de senha dos estados dos módulos;
- formulários administrativos de Avaliações, Inscrições, Monitoramento, OS e
  Urna deixaram de administrar credenciais funcionais;
- criada camada comum de carregamento e tratamento de erro;
- preparada, mas ainda não aplicada remotamente,
  `0003_json_state_concurrency.sql`.

## 2026-08-18 — Sessão e permissões centralizadas

- incluído login único do portal por Supabase Auth;
- cartões de sistemas filtrados pelo retorno de `get_my_modules()`;
- adicionada proteção de acesso direto às cinco rotas de módulos;
- reaproveitada a sessão central nos módulos Avaliações, Inscrições e Urna;
- uniformizado o encerramento da sessão no módulo Inscrições;
- reforçadas as políticas RLS de Monitoramento, Ordens de Serviço e Urna com a
  permissão central do módulo;
- preservadas as regras de negócio e as tabelas internas de cada aplicação.
