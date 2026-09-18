# Arquitetura final proposta — SEMED Integrado

## 1. Decisão arquitetural

Adotar uma evolução por estrangulamento, não uma reescrita: um portal central passa a controlar autenticação, navegação e autorização; cada módulo é encaixado e migrado internamente em ondas. O stack inicial permanece HTML/CSS/JavaScript modular, pois é o denominador comum dos quatro sistemas ativos. Uma migração futura para framework só deve ocorrer por benefício comprovado e módulo a módulo.

## 2. Visão de componentes

```text
Navegador
  └─ SEMED Integrado (shell comum)
      ├─ Supabase Auth / sessão única
      ├─ Hub dinâmico de módulos
      ├─ Guarda de rota e ações na UI
      ├─ Layout, menu, breadcrumbs, troca de módulo, logout
      └─ Adaptadores dos módulos
          ├─ Avaliações
          ├─ Votação
          ├─ OS SEMED
          └─ Monitor

Supabase central
  ├─ Auth (`auth.users`)
  ├─ Core: perfis, módulos, ações, permissões, escopos, unidades
  ├─ Dados de domínio com namespace por módulo
  ├─ Storage com buckets/prefixos e policies
  ├─ RPC/Edge Functions para operações privilegiadas ou atômicas
  └─ Auditoria append-only
```

## 3. Organização do código

```text
semed-integrado/
  app/
    index.html
    bootstrap.js
    router.js
  core/
    auth/
    authorization/
    audit/
    navigation/
    supabase/
  components/
    layout/
    feedback/
    forms/
  modules/
    avaliacoes/
    votacao/
    os-semed/
    monitor/
  migrations/
  tests/
    characterization/
    integration/
    security/
  docs/
```

No primeiro encaixe, cada pasta de módulo pode conter os arquivos legados quase intactos e um `adapter.js` para sessão, navegação e dados. Não criar pacote compartilhado para regras específicas de negócio.

## 4. Estratégia PostgreSQL/Supabase

### 4.1 Namespaces

Usar schemas PostgreSQL por domínio (`core`, `avaliacoes`, `votacao`, `os_semed`, `monitor`, `audit`) e um schema `api` com views/RPC explicitamente expostas quando necessário. Isso evita colisões como `users`, `units` e `documents`. Caso a configuração de schemas expostos imponha risco operacional na primeira onda, usar temporariamente tabelas `public` prefixadas (`core_*`, `avaliacoes_*`) mantendo a mesma separação lógica; não misturar nomes genéricos em `public`.

### 4.2 Core proposto

- `core.profiles`: perfil configurável, ativo, sem nomes codificados.
- `core.user_profiles`: vínculo N:N entre `auth.users` e perfis; permite múltiplas responsabilidades futuras.
- `core.modules`: código, nome, rota, ícone, ordem, ativo.
- `core.actions`: ações normalizadas (`view`, `create`, `edit`, `delete`, `approve`, `admin`, mais ações específicas).
- `core.profile_module_actions`: concessão por perfil + módulo + ação.
- `core.user_module_actions`: exceções individuais opcionais e auditadas; negar deve prevalecer sobre permitir.
- `core.scopes` e `core.user_scopes`: escopo por unidade/área/registro quando aplicável.
- `core.units`: identidade canônica mínima da unidade, com tabela de aliases/origens; só consolidar após reconciliação.
- `core.profiles_public`: nome, e-mail institucional derivado, situação e metadados, sempre 1:1 com `auth.users` quando essa visão simples for necessária.

Perfis iniciais são seeds administráveis, não enums: Administrador Geral, Administrador de Módulo, Gestor, Coordenador, Operador e Consulta.

### 4.3 Domínios

- `avaliacoes`: imports, records, habilidades aplicadas e metadados; retirar usuários/permissões do blob.
- `votacao`: eleições/configuração, unidades participantes, chapas/membros, credenciais funcionais de mesário ligadas a Auth, sessões, urnas e votos. Voto deve ser append-only e confirmado por uma única RPC transacional.
- `os_semed`: ordens, catálogo logístico, responsáveis por área, rotas, veículos, motoristas, mensagens, histórico e anexos.
- `monitor`: objetos, eventos, atividades, custos, documentos, leituras de notificação e imports.
- `audit.events`: evento append-only com ator, módulo, ação, entidade, ID, antes/depois, request ID, horário e metadados de cliente permitidos.

## 5. Autenticação e autorização

### Autenticação

- Uma sessão Supabase Auth para todos os módulos.
- Senhas exclusivamente em `auth.users`; nunca copiar hashes ou senhas legadas para tabelas públicas.
- Migração de usuários por convite/recuperação segura, não por transporte de senha em texto.
- Criação/desativação de usuários por Edge Function/RPC servidor com `service_role`, nunca no navegador.

### Autorização em três pontos

1. Hub/menu: consulta permissões e só apresenta módulos com `view`.
2. Router/ações: guarda central impede URL direta e oculta/desabilita ações.
3. Banco/API: RLS e RPC repetem a decisão usando `auth.uid()`; esta é a barreira de segurança real.

Uma função estável, por exemplo `core.has_permission(module_code, action_code, scope_type, scope_id)`, centraliza a avaliação. Policies não devem comparar e-mail ou espalhar nomes de perfil.

## 6. RLS e segurança

- RLS ativa em toda tabela exposta; sem policies para `anon` em dados corporativos.
- `authenticated` recebe apenas operações explicitamente permitidas.
- Tabelas de autorização só são alteradas por administradores autorizados e toda mudança gera auditoria.
- Views comuns devem respeitar `security_invoker`; funções `security definer` têm `search_path` fixo, validação interna e privilégio mínimo.
- Dados sensíveis (CPF, nascimento, telefone, avaliações, votos, OS e custos) têm policies por módulo e escopo.
- Votos, auditoria e histórico não permitem update/delete pelo cliente.
- Storage usa bucket/prefixo por módulo, limite de tamanho/MIME e policy ligada ao registro pai.
- Rate limiting e proteção antiabuso nas operações de login, convite, importação e votação.

## 7. Auditoria

Registrar no banco, preferencialmente por trigger/RPC, e não confiar somente no frontend. Eventos mínimos: login relevante, criação/desativação de usuário, mudança de perfil/permissão/escopo, imports, exclusões lógicas, aprovações, mudança de status de OS, administração eleitoral e confirmação de voto sem armazenar informação que quebre sigilo.

`audit.events` deve ser append-only; leitura limitada a perfis autorizados; retenção e tratamento de IP/user-agent definidos com jurídico/LGPD.

## 8. Reaproveitamento por módulo

| Módulo | Preservar | Substituir primeiro |
|---|---|---|
| Avaliações | filtros, cálculos, importação, análises, BNCC, relatórios | auth/token, usuários/perfis no JSON, RLS pública |
| Votação | fluxo mesário/urna, tipologia, pesos e transação lógica | contas próprias, regras públicas, documentos agregados |
| OS SEMED | cascata logística, escopos por perfil, histórico/mensagens | erro de sintaxe, localStorage, anexos locais, credenciais demo |
| Monitor | UI, modelo de objeto/evento/custo, auditoria e upload | Firebase Auth/dados, papéis fixos/amplos |

## 9. Dados compartilhados

Não promover automaticamente `units`/escolas a `core.units`. Criar staging por origem e uma tabela de correspondência com `source_system`, `source_id`, `canonical_unit_id`, método, confiança e aprovador. Comparar nome normalizado, endereço, código oficial e contexto. Professores, alunos, servidores e setores seguem o mesmo princípio quando existirem em mais de um módulo.

## 10. Operação, migrations e ambientes

- Um único repositório de migrations Supabase em `supabase/migrations`, versionadas e imutáveis após aplicadas. A pasta legada `migrations/` não deve ser recriada, pois o Supabase Preview não a considera ao reconciliar o histórico remoto.
- Ambientes separados: desenvolvimento, homologação e produção.
- Backup/export antes de cada onda; scripts idempotentes; contagem, checksums e relatórios de rejeição.
- Observabilidade por request ID, logs de erro sem PII e métricas de latência/falha.
- Feature flags por módulo/usuário para alternar leitura antiga, dupla escrita controlada e nova fonte.

## 11. Critérios de qualidade

- Testes de caracterização congelam comportamento atual antes de extração.
- Testes de contrato para adaptadores de dados.
- Testes RLS positivos e negativos por perfil/escopo, inclusive acesso direto por URL/API.
- Testes concorrentes para matrícula/vagas, importações, mudança de status e voto único.
- Acessibilidade, responsividade e regressão visual do shell e de cada módulo.
- Reconciliação de dados com totais, chaves, duplicidades e amostras aprovadas pelos donos de negócio.

## 12. Design system institucional

O shell compartilhado adota a referência visual aprovada para o SEMED Integrado sem alterar regras de negócio ou a avaliação de permissões. A tela de acesso usa uma composição *split-screen*: identidade e mensagem institucional em superfície clara à esquerda; área verde profunda à direita com o formulário em card marfim. Em telas de até 900 px, as regiões passam a formar uma única coluna, preservando ordem de leitura, rótulos e alvos de toque.

Os tokens canônicos ficam em `design-system.css` e devem ser consumidos por login, portal e, de forma incremental, pelos layouts compartilhados dos módulos:

| Papel | Token | Valor |
|---|---|---|
| Fundo institucional profundo | `--semed-green-950` | `#10231D` |
| Variação de fundo | `--semed-green-900` | `#12251F` |
| Ação primária | `--semed-green-700` | `#28674F` |
| Superfície marfim | `--semed-ivory-100` | `#F5F2EA` |
| Branco/off-white | `--semed-white` | `#FAFAF8` |
| Título institucional | `--semed-navy-900` | `#071A58` |
| Acento dourado/bege | `--semed-gold-600` | `#A88A5A` |
| Texto principal | `--semed-neutral-900` | `#17211E` |
| Texto secundário | `--semed-neutral-700` | `#5F655F` |
| Borda neutra | `--semed-neutral-300` | `#D5D1C8` |

Componentes devem preferir os aliases semânticos (`--semed-color-action`, `--semed-color-title`, `--semed-color-surface`, `--semed-color-text-muted`) para permitir evolução da paleta sem retrabalho. Botões primários usam verde de ação com texto branco; inputs e cards usam borda neutra e foco visível; estados de erro usam `--semed-color-danger`. O arquivo também padroniza raios, sombras, transições, seleção, foco por teclado e redução de movimento.

O Portal de Módulos mantém a mesma identidade com cabeçalho verde profundo, superfícies marfim, cartões claros e chamadas de ação verdes. A filtragem dinâmica e a guarda de rota continuam sendo conduzidas por `get_my_modules()` e pelas verificações existentes; a camada visual não codifica perfil, e-mail ou autorização.
# Autenticação central do portal

O Portal SEMED usa uma única sessão do Supabase Auth. Antes de apresentar os
módulos, o portal chama `get_my_modules()` e exibe somente os sistemas liberados
para os perfis ativos do usuário.

Cada rota de módulo também executa a mesma verificação. Assim, ocultar um cartão
não é tratado como mecanismo de segurança: acessos diretos por URL sem sessão ou
sem permissão retornam ao portal. As políticas RLS dos bancos dos módulos usam a
autorização central como segunda barreira.

Fluxo: autenticação Supabase -> sessão central -> `get_my_modules()` -> portal
filtrado -> guarda da rota -> RLS do módulo.

## Identidade corporativa única

`auth.users` é a fonte exclusiva de credenciais. A tabela `semed_people`
mantém somente dados corporativos não secretos e usa o mesmo UUID do Supabase
Auth. Perfis e permissões continuam nas tabelas corporativas, enquanto tabelas
específicas dos módulos guardam apenas atributos funcionais, nunca senhas.

O portal e as guardas consultam `get_my_access_context()`, que entrega usuário
ativo, perfis corporativos, módulos e permissões de operação. A interface pode
ocultar ações por essa resposta, mas a decisão de segurança permanece nas
políticas RLS por operação.

`semed_audit` recebe eventos corporativos comuns. Logs de domínio podem
continuar nos módulos, associados ao mesmo `auth.uid()`.

A administração de identidades é exclusiva do administrador DETIC e ocorre por
Edge Function autenticada. `semed_user_module_roles` guarda o papel funcional e
o escopo de cada módulo sem duplicar credenciais. Senhas temporárias são
gravadas somente pelo Supabase Auth e exigem substituição no primeiro acesso.

## Desagregação dos documentos JSON

A migração para tabelas relacionais será feita por agregado funcional, sem
substituição destrutiva. Até a desagregação, todo documento agregado deve usar
versão esperada na gravação para detectar concorrência. O controle de concorrência
permanece ativo para os documentos agregados dos módulos preservados.
