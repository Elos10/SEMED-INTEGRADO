# Arquitetura atual — SEMED Integrado

> Diagnóstico da Fase 1, realizado em 12/08/2026. O código local é a fonte da verdade. Nenhum dos cinco projetos foi alterado. Este documento distingue implementação observada de intenção descrita em README.

## 1. Escopo e método

Foram inspecionados os cinco diretórios informados, incluindo HTML, JavaScript, CSS, SQL, regras Firebase, manifests, workflows, documentação, planilhas/seeds e configurações de exemplo. Foram executadas verificações estáticas de sintaxe com Node.js. Não houve conexão com projetos remotos Supabase/Firebase; portanto, existência, conteúdo e volume reais dos bancos precisam ser confirmados por exportação controlada na etapa seguinte.

## 2. Resumo executivo

Todos os módulos são aplicações web estáticas, sem framework de componentes e sem processo de build obrigatório. Isso favorece uma integração incremental: é possível preservar as telas e regras atuais, introduzindo primeiro um shell comum e adaptadores de autenticação/persistência.

O maior risco não é de UI, mas de segurança e dados:

- Avaliações e Inscrições usam Supabase apenas como armazenamento de um documento JSON, com autenticação simulada no navegador e políticas que permitem escrita anônima.
- Votação usa Firestore em tempo real, mas o login é próprio e os dois documentos operacionais têm leitura/escrita pública.
- OS SEMED usa somente `localStorage`, credenciais demonstrativas e anexos embutidos no estado do navegador; o arquivo principal contém atualmente um erro de sintaxe.
- Monitor é o único módulo com autenticação gerenciada real (Firebase Auth), regras de banco por perfil, Storage, Functions e auditoria parcial.
- Há pelo menos três cadastros concorrentes de usuários/perfis e várias listas de unidades/escolas. Nomes iguais não são evidência suficiente para unificá-los.

## 3. Matriz comparativa

| Item | Avaliações | Inscrições | Votação | OS SEMED | Monitor |
|---|---|---|---|---|---|
| Stack | HTML/CSS + JavaScript ESM | HTML/CSS + JavaScript | HTML/CSS + JavaScript ESM | HTML/CSS + JavaScript | HTML/CSS + JavaScript + Cloud Functions CJS |
| Versões observadas | Node 20 para validação; `@supabase/supabase-js@2`; XLSX 0.18.5 | Node 20 para validação; `@supabase/supabase-js@2`; ViaCEP | Firebase Web SDK 12.0.0 | Sem dependência externa em runtime | Firebase Web SDK 12.16.0; Functions 6.4; Admin 13.4; Node 22 nas Functions |
| Hospedagem prevista | GitHub Pages | GitHub Pages | Estática/local | Local/estática | Firebase Hosting |
| Banco | Supabase: `avd_app_state` + `avd_records` | Supabase: `semed_sistema` | Firestore: `urnaState/chapas`, `urnaState/votacao` | `localStorage` + seeds de XLSX/CSV | Firestore + Storage |
| Auth | Usuário/senha em JSON; token sintético no navegador | Usuário/senha em JSON; token sintético no navegador | Login próprio em `accessAccounts`; sem Firebase Auth | Login demonstrativo em estado local | Firebase Auth + perfil em `users/{uid}` |
| Autorização | Perfil/tela em JSON e filtros de unidade no código | Permissões granulares em arrays; checagens UI e adaptador | Papéis administrador/mesário no cliente | Regras fixas por perfil no cliente | Regras Firestore + checagens UI; papéis fixos |
| RLS/regras | RLS habilitada, mas CRUD permitido a `anon` | RLS habilitada, mas CRUD permitido a `anon` | Escrita pública nos dois documentos ativos | Não aplicável | Regras por usuário ativo/perfil; exclusões em geral negadas |
| Modelo de rotas | SPA por estado interno; endpoints virtuais no adaptador | SPA por funções; endpoints virtuais no adaptador | `index.html` + `urna.html`; tabs internas | SPA por `currentView` | SPA por `view`; Hosting redireciona tudo a `index.html` |
| UI | Dashboard, análises, relatórios, BNCC, importações e admin | Inscrições, gestão, frequência, relatórios e acesso | Administração, mesário e urna | Dashboard, OS, cadastros e mensagens | Dashboard, objetos, timeline, financeiro, relatórios, importação, acesso e auditoria |
| APIs/integrações | REST Supabase, BNCC, XLSX, PDFs locais | REST Supabase, ViaCEP | Firestore realtime/transactions | Planilhas e CSV locais | Auth, Firestore, Storage, Functions, Hosting |
| Dependência crítica | Documento JSON `avd_app_state/id=db` e `avd_records` | Documento JSON `semed_sistema/id=db` | Atomicidade da transação Firestore e sincronização entre abas | Chave `dirlogistica-os-state-v1` e seed AppSheet | Firebase `semed-gestao`, perfis `users/{uid}` e indexes |

## 4. Avaliações

### Estrutura e componentes

- Entrada publicada: `index.html` carrega `supabase-init.js` e `public/app.js` como módulos.
- `app.js` na raiz e `public/app.js` não têm o mesmo hash; a existência de duas versões é risco de manutenção. A versão efetivamente carregada pelo HTML é `public/app.js`.
- `supabase-init.js` é uma API em memória/no navegador que lê e grava Supabase REST.
- Dados curriculares em JSON e dois PDFs; logos e CSS em `public/`.
- Workflow aplica `supabase.sql`; `package.json` tem apenas validação sintática/configuração.

### Rotas/telas e API virtual

Telas: login, dashboard, relatórios, comparativo, habilidades BNCC, currículo municipal, cadastro de habilidades aplicadas, importações, qualidade dos dados e administração.

Endpoints observados: `/health`, `/auth/login`, `/auth/logout`, `/auth/change-password`, `/me`, `/options`, `/dashboard`, `/records`, `/quality`, `/analysis`, `/analysis/questions`, `/statistics`, `/compare`, `/habilidades-aplicadas`, `/admin/users`, `/admin/permissions`, `/logs`, `/imports`, `/imports/preview`, `/imports/commit`, `/reports/pdf`, `/analysis/questions/pdf` e `/export/excel`.

### Dados e regras de negócio

- `avd_app_state`: documento `id='db'` com usuários, senhas em texto, perfis, permissões, imports, logs e habilidades aplicadas.
- `avd_records`: registros de avaliação por importação, JSON original e colunas físicas de avaliação, unidade, ano, turma, disciplina, aluno, nível, raça, inclusão, pontos, percentual, Q1–Q20 e PT_Q1–PT_Q20.
- Escopo do Gestor de Unidade é aplicado por comparação da unidade escolar no JavaScript.
- Importação tem prévia, chave de duplicidade, commit em lotes e exclusão por lote.
- Questões variam por ano: 10, 15 ou 20; análises consolidam desempenho, prioridades, distratores e intervenções.
- Cadastro de habilidade é único por avaliação + ano + disciplina + questão.

### Riscos

Críticos: senha em texto; token sem assinatura/validação; toda autorização roda no cliente; RLS permite CRUD anônimo; mudança de senha apenas altera JSON; segredo/conexão de banco e credenciais demonstrativas aparecem em arquivos/documentação. A credencial de banco deve ser rotacionada e removida do histórico conforme procedimento seguro.

Outros: duas cópias divergentes do app; blobs de PDF são placeholders no adaptador; nomes de campos importados apresentam sinais de problemas de encoding; um único documento JSON cria contenção e risco de sobrescrita.

## 5. Inscrições

### Estrutura e componentes

- Aplicação estática com `index.html`, `app.js`, `supabase-init.js` e `supabase.sql`.
- Existe uma cópia completa em `SEMED-ATIVIDADES/`; os hashes dos JS principais são idênticos, configurando duplicação física.
- Não há backend servidor: `window.SEMED_DB_REQUEST` implementa endpoints no navegador e persiste um documento Supabase.

### Rotas/telas e API virtual

Telas: dashboard, inscrições de alunos da rede/comunidade, gestão de catálogos, frequência, relatórios e usuários/perfis.

Endpoints: `/health`, `/auth/login`, `/catalogos/{units|locations|modalities|teachers|activities|classes|users}`, `/inscricoes`, `/frequencias`, `/frequencias/classes/{id}/students`, `/relatorios/dashboard`, `/relatorios/atividade/{id}/inscritos`, `/relatorios/gerencial`, `/relatorios/agenda` e `/relatorios/logs`.

Integração externa: ViaCEP para preencher endereço.

### Dados e regras de negócio

O documento `semed_sistema/id=db` contém coleções lógicas: `units`, `teachers`, `locations`, `modalities`, `activities`, `classes`, `users`, `registrations`, `attendance`, `documents` e logs.

Regras centrais:

- inscrições separadas entre rede e comunidade;
- CPF, telefone e CEP formatados no cliente;
- até três turmas por inscrição, sem duplicidade nem choque de dia/horário;
- geração de número de inscrição, vagas/lista de espera e exclusão administrativa;
- frequência por turma, mês e datas de encontro;
- permissões granulares agrupadas em INSCRIÇÕES, GESTÃO, FREQUÊNCIA, RELATÓRIOS e ACESSO;
- administrador recebe todas as permissões; gestor/gerente de unidade tem tratamento especial para unidades.

### Riscos

Críticos: senha em texto no JSON e no seed; token sintético; RLS permite CRUD anônimo; regras de permissão são executadas no cliente/adaptador entregue ao cliente; dados pessoais como CPF, nascimento, endereço e telefone ficam em um blob acessível anonimamente.

Outros: documento único sujeito a conflitos; cópia duplicada do projeto; ausência de constraints relacionais reais; dependência externa ViaCEP sem política explícita de indisponibilidade/privacidade.

## 6. Votação

### Estrutura e componentes

- `index.html` usa `app.js` para administração/mesário; `urna.html` usa `booth.js`.
- `firebase-store.js` centraliza Firebase, normalização do estado, listeners realtime e transações.
- Firestore está dividido em registro (`chapas`) e operação (`votacao`), com leitura legada de `current`.

### Dados e regras de negócio

Entidades lógicas: `settings`, `units`, `accessAccounts`, `candidates`, `boothAssignments`, `votingSessions` e `votes`.

Regras centrais:

- mesário vinculado a uma unidade;
- sessão com token único e uma urna ativa por unidade;
- chapas filtradas pela unidade e tipologia; número de três dígitos;
- voto válido, nulo ou branco; uma gravação por sessão;
- transação Firestore revalida sessão/atribuição para reduzir voto duplicado;
- pesos observados: familiar/EJA = 1 e servidor = 2;
- resultados filtráveis por unidade e tipo de votante;
- sincronização realtime entre painel e urna, com fallback local legado.

### Riscos

Críticos: autenticação própria com credenciais no estado; regras Firestore públicas; qualquer cliente pode alterar chapas, acessos, sessões e votos; dados eleitorais agregados em dois documentos aumentam contenção e limite de tamanho; não há trilha de auditoria imutável.

Outros: configuração Firebase embutida é normal para cliente, mas deve ser protegida por Auth/regras; unidades estão codificadas no JS e se sobrepõem ao cadastro de unidades de outros módulos; fallback local pode divergir do remoto; integridade eleitoral exige testes concorrentes específicos.

## 7. OS SEMED

### Estrutura e componentes

- Aplicação local sem dependências externas: `index.html`, `app.js`, `styles.css`.
- `assets/seed-data.js` é gerado de planilhas/CSV de origem AppSheet por script PowerShell.
- Persistência integral em `localStorage`, chave `dirlogistica-os-state-v1`.
- O plano técnico existente é conceitual; Node/PostgreSQL/Prisma/JWT não estão implementados.

### Rotas/telas, dados e regras

Views: dashboard, ordens de serviço, nova OS, unidades, logística, rotas, veículos, motoristas, usuários e documentação.

Entidades: usuários, responsáveis por área, unidades, catálogo logístico, rotas, veículos, motoristas e ordens; mensagens, histórico e anexos ficam aninhados nas ordens.

Regras centrais:

- perfis Administrador, Solicitante, Responsável e Gestor/Consulta;
- solicitante vê as próprias OS; responsável vê as atribuídas e muda status; gestor consulta tudo; administrador gerencia tudo;
- unidade vinculada ao usuário;
- cascata área → natureza → tipo → descrição → detalhamento;
- responsável derivado da área;
- exclusão lógica de cadastros;
- histórico e mensagens por OS; anexos serializados no estado local.

### Riscos

- **Bloqueador funcional observado:** `app.js` falha na validação sintática na definição do usuário técnico (aspas ausentes no e-mail). O comportamento descrito no README não é executável até correção explícita em fase autorizada.
- Autenticação e autorização são somente demonstrativas; senhas em texto; ausência de banco, API, concorrência e backup.
- `localStorage` é inadequado para anexos e pode atingir rapidamente o limite do navegador.
- Dados importados apresentam sinais de encoding corrompido; é necessário preservar original e definir transformação auditável.
- O README informa senha diferente da senha do usuário administrador no código, outra inconsistência a validar.

## 8. Monitor

### Estrutura e componentes

- SPA estática, Firebase Hosting, Firebase Auth, Firestore, Storage e Functions.
- `firebase-adapter.js` importa SDK 12.16.0; Cloud Functions Node 22 usa `firebase-functions ^6.4.0` e `firebase-admin ^13.4.0`.
- `workflow-enhancements.js` complementa o fluxo principal; CSS segmentado por tema/formulários/gráficos.

### Rotas/telas e dados

Views: visão geral, objetos, timeline, financeiro, relatórios, importação, perfis de acesso e auditoria.

Coleções/regras observadas: `users`, `objects`, `events`, `activities`, `costs`, `documents`, `notificationReads`, `audit` e `imports`. Storage usa `documents/{objectId}/{fileName}`. Índices compostos cobrem objetos ativos/data, eventos por objeto/data, custos por objeto/data e leituras de notificação por usuário/data.

### Auth, permissões e regras de negócio

- Firebase Auth e perfil ativo em `users/{uid}`.
- Papéis fixos: administrador, gabinete, assessoria, diretoria, departamento, seção e servidor.
- Administrador gerencia usuários por callable Function `manageUser`; criação/alteração é auditada.
- Usuários ativos leem dados; perfis operacionais podem escrever; exclusões são restritas; auditoria só é lida por administrador e não pode ser alterada/excluída.
- Objeto agrega código, área, responsável, prioridade, datas, orçamento, execução e produto; eventos registram evolução; custos suportam visão financeira.

### Riscos

- Perfis são strings fixas e amplas; não existe matriz configurável de ação por módulo.
- Regras `canWrite` concedem escrita a quase todos os perfis operacionais, sem escopo por unidade/área.
- A UI cadastra perfil por UID diretamente em um caminho, enquanto existe Function mais segura; é preciso confirmar qual fluxo está ativo.
- Importação exibida na UI aparenta somente preparar uma prévia; não foi identificada persistência completa do arquivo no código principal.
- Migração Firebase → Supabase requer preservar IDs, timestamps, documentos e auditoria; não deve ser feita por troca direta sem dupla leitura/validação.

## 9. Duplicações, conflitos e oportunidades

### Duplicações

- Login, usuário, perfil, menu lateral, logout e tela administrativa aparecem em todos os módulos.
- Unidades/escolas aparecem em Avaliações, Inscrições, Votação e OS; o significado e as chaves não são idênticos.
- Usuários/perfis são representados de quatro formas incompatíveis: JSON AVD, JSON SGI, contas da urna, usuários locais OS e Firebase Auth/Firestore Monitor.
- Logs/auditoria aparecem em Avaliações, Inscrições, OS e Monitor, com níveis de confiabilidade diferentes.
- Inscrições contém uma árvore duplicada idêntica; Avaliações contém duas versões divergentes do app.

### Conflitos de nomenclatura/modelo

- `users`, `units`, `status`, `role/perfil` e `documents` têm semânticas diferentes.
- Perfis não são equivalentes entre módulos. “Gestor” de Avaliações, “Gestor/Consulta” de OS e papéis institucionais do Monitor não devem ser fundidos por nome.
- Dois projetos Supabase e pelo menos dois Firebase são referenciados; a plataforma final exige inventário remoto e escolha formal do projeto destino.
- Datas, IDs e encoding não seguem padrão único; há IDs textuais, numéricos, UIDs Firebase e Row IDs AppSheet.

### Reaproveitamento recomendado

- Preservar inicialmente HTML/CSS e funções de domínio de cada módulo.
- Extrair apenas shell, sessão, guarda de rota, cliente Supabase, feedback visual e componentes institucionais após testes de caracterização.
- Reaproveitar a matriz granular de Inscrições como referência de ações; regras de escopo de Avaliações/OS e o modelo de auditoria/Storage do Monitor como insumos, não como implementação final literal.
- Manter a transação de voto como requisito invariável e reimplementá-la em função SQL/RPC transacional.

## 10. Variáveis e configuração

Observadas: URL/chave pública Supabase nos módulos Avaliações e Inscrições; conexão administrativa Supabase apenas em CI; configuração web Firebase (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, measurementId); service account e senha inicial somente por secrets no Monitor.

Regras para a consolidação:

- cliente recebe apenas URL e chave pública/anon do projeto central;
- `service_role`, conexão PostgreSQL e credenciais administrativas ficam somente em ambiente servidor/CI;
- nenhum segredo, senha inicial ou string de conexão deve estar em README, `.env.example` ou JavaScript;
- antes da migração, rotacionar credenciais expostas e auditar histórico Git/CI.

## 11. Evidências e limitações

- Validação sintática: todos os JS selecionados passaram, exceto `OS SEMED/app.js`.
- Os checks `npm run check` não foram usados diretamente porque `npm` não estava no PATH; os mesmos arquivos foram verificados com o Node.js fornecido pelo ambiente.
- Nenhum teste end-to-end, escrita em banco ou deploy foi executado nesta fase.
- O repositório de Avaliações já tinha uma exclusão local de `avaliações.zip`; ela foi preservada e não é parte deste trabalho.
