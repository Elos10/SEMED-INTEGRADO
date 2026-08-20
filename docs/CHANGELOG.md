# Registro de alterações

## 2026-08-20 — Cadastro corporativo de usuários e perfis

- criada administração central exclusiva para `detic@uberabadigital.com.br`;
- criada matriz com 13 perfis corporativos e permissões por operação;
- criado vínculo de papel e escopo por usuário e módulo;
- implantada senha temporária com troca obrigatória no primeiro acesso;
- bloqueado o acesso direto aos módulos enquanto a troca estiver pendente;
- Avaliações e Inscrições passaram a sincronizar usuários pelo contexto central;
- Monitoramento, OS e Urna recebem os papéis locais pelo serviço central;
- a Edge Function `manage-semed-user` passou a exigir JWT e valida o e-mail do
  administrador no servidor;
- adicionadas as migrations `central_user_profiles` e
  `index_user_module_role_manager`.

## 2026-08-20 — Prioridade imediata de segurança

- implantados login, sessão, módulos e permissões centralizados;
- acrescentado fluxo completo de recuperação e atualização de senha;
- padronizados logout e recuperação nos cinco módulos;
- preparado Cloudflare Turnstile no login e na recuperação;
- removidas 80 senhas do backup JSON legado da Urna;
- confirmado que os documentos ativos no Supabase não contêm chaves de senha;
- aplicadas as migrations `json_state_concurrency`,
  `harden_privileged_functions_rls` e `optimize_rls_policies`;
- funções públicas privilegiadas passaram a `SECURITY INVOKER`;
- corrigidas políticas corporativas, políticas da Urna e políticas de OS;
- o Security Advisor passou a registrar apenas a proteção contra senhas
  comprometidas, que depende de ativação no painel e de plano compatível.

## 2026-08-18 — Identidade, credenciais e auditoria corporativas

- criada `semed_people`, sincronizada com `auth.users`;
- criado `get_my_access_context()` com usuário, perfis, módulos e operações;
- criado `semed_audit` com RLS e identificação pelo UUID do Auth;
- portal e guardas passaram a exigir pessoa ativa e permissão de visualização;
- removidas senhas iniciais e persistência de senha dos estados dos módulos;
- formulários administrativos de Avaliações, Inscrições, Monitoramento, OS e
  Urna deixaram de administrar credenciais funcionais;
- criada camada comum de carregamento e tratamento de erro;
- aplicada `0003_json_state_concurrency.sql`.

## 2026-08-18 — Sessão e permissões centralizadas

- incluído login único do portal por Supabase Auth;
- cartões de sistemas filtrados pelo retorno de `get_my_modules()`;
- adicionada proteção de acesso direto às cinco rotas de módulos;
- reaproveitada a sessão central nos módulos Avaliações, Inscrições e Urna;
- uniformizado o encerramento da sessão no módulo Inscrições;
- reforçadas as políticas RLS de Monitoramento, Ordens de Serviço e Urna com a
  permissão central do módulo;
- preservadas as regras de negócio e as tabelas internas de cada aplicação.
