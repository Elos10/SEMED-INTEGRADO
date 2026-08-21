# Registro de alterações

## 2026-08-21 — Área institucional de usuários e andamentos

- adicionado o campo obrigatório **Área de atuação** ao cadastro administrativo
  de usuários do portal;
- a área passou a ser exibida na listagem e incluída na pesquisa de usuários;
- padronizadas as opções em Gestão Pedagógica, Infraestrutura, Logística,
  Tecnologia e Transporte;
- a mesma lista passou a ser utilizada na criação e edição de andamentos do
  módulo Monitoramento;
- adicionada a migration `0010_user_institutional_area.sql`, incluindo o campo
  validado em `semed_people` e `monitor_profiles`;
- atualizada e publicada a Edge Function `manage-semed-user` para carregar,
  validar e persistir a área no cadastro central e no Monitoramento.

## 2026-08-21 — Posse e edição dos andamentos do Monitoramento

- adicionado o botão **Editar** aos andamentos da timeline somente para o
  criador, quando não direcionado, ou para o usuário que estiver com a posse;
- o responsável atual pode responder, atualizar status e progresso, encaminhar
  a outro usuário ou devolver o andamento ao remetente;
- após o encaminhamento, o usuário anterior perde imediatamente a permissão de
  movimentação e o novo responsável recebe a posse exclusiva;
- andamentos já direcionados não podem ficar sem responsável;
- autoria original e histórico de encaminhamentos são preservados;
- adicionada a migration `0009_monitor_event_ownership.sql`, com trigger de
  integridade e política RLS de atualização por criador/possuidor;
- política e trigger aplicados e validados no projeto Supabase ativo.

## 2026-08-21 — Notificações interativas do Monitoramento

- transformadas as mensagens da Central de Notificações em cartões inteiros
  clicáveis, com suporte a teclado e adaptação para telas pequenas;
- ao selecionar uma mensagem, a leitura é registrada no Supabase e o objeto
  correspondente é aberto com o andamento destacado na linha do tempo;
- andamentos direcionados também confirmam automaticamente o recebimento;
- confirmações de recebimento passam a desaparecer da Central após a leitura;
- mantidas as regras existentes de destinatário, sessão e persistência.

## 2026-08-21 — Apresentação institucional nas entradas dos módulos

- adicionada a apresentação **Portal de Sistemas Unificados** às telas iniciais
  de Avaliações, Monitoramento, Ordens de Serviço e Urna Eletrônica;
- o bloco compartilhado reproduz título, texto institucional, faixa azul e
  acabamento visual do modelo fornecido;
- a inserção é automática e idempotente, inclusive após logout ou reconstrução
  da tela de login;
- preservados os formulários, identificação individual de cada sistema, botão
  de retorno ao portal e rodapé de segurança/suporte;
- ajustado o encaixe responsivo para manter o formulário visível em desktop e
  permitir rolagem vertical segura em telas pequenas.

## 2026-08-21 — Central de Relatórios do Monitoramento

- incluído resumo do recorte com total de objetos, progresso médio, atrasos,
  criticidade e última atualização;
- adicionados filtros explícitos de busca e situação, compartilhados entre a
  pré-visualização e a impressão;
- reorganizados os cartões da Central por finalidade, quantidade de registros
  e formato de saída;
- ampliado o Relatório Executivo com seis indicadores, distribuições por
  situação e prioridade e tabela visual de itens que exigem atenção;
- ampliado o Relatório Geral com resumo gerencial, distribuições e detalhamento
  condensado de objeto, responsável, período, situação e progresso;
- adicionados marcadores de situação, barras de progresso, hierarquia visual,
  linhas alternadas e identificação dos filtros no documento impresso;
- corrigido o tratamento dos filtros especiais `Atrasado`, `Concluído` e
  `Alta prioridade` dentro dos relatórios;
- preservadas as consultas, tabelas, permissões RLS e regras de negócio.

## 2026-08-21 — Navegação das telas iniciais dos módulos

- reforçado o cabeçalho institucional compartilhado nas telas de login dos quatro módulos;
- adicionados os controles padronizados `Voltar ao Portal` e `Ajuda` no lado direito;
- o retorno aponta para a raiz do portal sem reabrir automaticamente o módulo anterior;
- o botão é reinstalado quando a tela de login é reconstruída após o logout;
- preservados os fluxos de autenticação e as regras de negócio de cada módulo.

## 2026-08-21 — Retirada do módulo Inscrições

- removidos o cartão, a rota, a proteção de rota e o cadastro administrativo do módulo;
- removidos os arquivos e estilos exclusivos de Inscrições;
- removidos do Supabase o módulo, seus três perfis, permissões, vínculos e auditoria exclusiva;
- removidos o documento funcional `semed_sistema` e a função `commit_inscricoes_state`;
- preservados usuários do Supabase Auth e todos os dados dos quatro módulos restantes.

## 2026-08-20 — Diagnóstico do cadastro por Edge Function

- o portal passou a apresentar a mensagem enviada no corpo das respostas não-2xx
  da função `manage-semed-user`, em vez do erro genérico do cliente;
- a senha temporária é validada no formulário com os mesmos requisitos do servidor;
- o formulário impede envio sem perfil e bloqueia cliques duplicados durante o cadastro;
- os scripts receberam nova versão para evitar o uso de arquivos antigos em cache.

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
## 2026-08-21 — Entrada dos módulos e gestão central de usuários

- reforçada a exibição integral do conteúdo central e do rodapé nas quatro
  telas institucionais de login, neutralizando regras visuais legadas;
- corrigida a estrutura HTML de inicialização do módulo Monitoramento;
- removidas das navegações de Avaliações, Monitoramento e Ordens de Serviço
  as opções locais de usuários e perfis;
- removida da Urna Eletrônica a aba administrativa de acessos;
- tentativas de abrir estados antigos dessas áreas agora retornam ao painel
  operacional do respectivo módulo;
- mantida a gestão corporativa em **Usuários e acessos**, exibida no portal
  somente quando `get_my_access_context()` confirma `portal_admin` para DETIC;
- não houve alteração de tabelas, RLS ou migrations nesta etapa.

## 2026-08-21 — Histórico sucessivo dos andamentos direcionados

- o destinatário de um andamento passou a visualizar para edição somente
  **Tipo**, **Status** e **Resposta / Movimentação**;
- descrição, área, responsável, datas, direcionamento e demais dados recebidos
  permanecem preservados como retrato inicial;
- cada salvamento acrescenta uma movimentação com usuário e data, sem
  sobrescrever respostas anteriores;
- a conclusão define automaticamente 100% e encerra novas edições;
- a migration `0011_monitor_directed_movement_history.sql` reforça a mesma
  regra no banco, além da restrição já existente por posse e RLS.

## 2026-08-21 — Rastreamento de recebimento na timeline

- o emissor passou a visualizar na timeline com qual usuário está o andamento;
- a confirmação apresenta o nome de quem recebeu e a data/hora registrada;
- enquanto o destinatário ainda não abriu o andamento, a timeline informa
  **Aguardando recebimento**;
- o horário continua sendo persistido pelo Supabase e apenas formatado para o
  padrão brasileiro na interface.

## 2026-08-21 — Timeline ampliada e impressão corporativa

- a Timeline dos detalhes do objeto no Monitoramento saiu da coluna lateral e
  passou a ocupar toda a largura abaixo da Visão Geral;
- os cards dos andamentos ganharam mais espaço horizontal para descrição,
  movimentações, destinatário e confirmação de recebimento;
- criado um padrão compartilhado de relatórios para Avaliações, Monitoramento,
  Ordens de Serviço e Urna Eletrônica;
- a impressão dos relatórios foi uniformizada em papel A4, orientação paisagem,
  fonte Calibri tamanho 13 e margens de 1 cm nos quatro lados.
