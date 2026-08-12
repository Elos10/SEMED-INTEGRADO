# Plano incremental de migração — SEMED Integrado

## 1. Princípios

1. Preservar comportamento antes de melhorar arquitetura.
2. Nenhuma exclusão, renomeação destrutiva ou migração irreversível sem backup, reconciliação e aceite.
3. Código local define as regras atuais; README é evidência secundária.
4. Segurança de banco/API prevalece sobre ocultação de interface.
5. Cada módulo migra em ondas pequenas, com rollback e período de comparação.

## 2. Etapas e gates

### Etapa 0 — diagnóstico local (concluída neste ciclo)

Entregas: inventário dos cinco projetos, arquitetura-alvo e plano de migração. Nenhum projeto legado, banco ou migration foi alterado.

Gate: revisar com donos dos módulos as regras descritas e confirmar qual versão publicada de cada código é a vigente.

### Etapa 1 — inventário remoto e contenção de risco

- Exportar schemas, policies, Functions, índices, buckets e volumes dos dois Supabase e dos Firebase envolvidos.
- Identificar projetos efetivamente produtivos, URLs publicadas e branches/deploys vigentes.
- Rotacionar credenciais expostas e remover senhas demonstrativas/documentadas seguindo plano de acesso.
- Fazer backups somente leitura e registrar hashes/contagens.
- Confirmar a divergência `app.js` vs `public/app.js` de Avaliações e a pasta duplicada de Inscrições.
- Registrar o erro sintático de OS como correção isolada, sujeita a autorização.

Gate: backup restaurável testado, inventário remoto aprovado e nenhum segredo administrativo no cliente.

### Etapa 2 — testes de caracterização

Criar cenários por módulo antes de refatorar:

- Avaliações: login/perfil, filtro por unidade, importação/duplicidade, métricas, habilidade única, exclusão de lote.
- Inscrições: tipos de inscrição, até três turmas, conflito de horário, vagas/espera, frequência, permissões.
- Votação: token único, uma sessão por unidade, voto único, branco/nulo/válido, pesos, concorrência entre abas.
- OS: escopo por perfil, cascata logística, responsável automático, mudança de status, histórico, mensagens e anexos.
- Monitor: auth/perfil ativo, objeto/evento/custo, regras por papel, usuário, auditoria e Storage.

Gate: suíte reproduz o comportamento vigente e documenta falhas já existentes sem “corrigi-las” silenciosamente.

### Etapa 3 — fundação do Supabase central

- Criar projeto/ambientes e repositório de migrations.
- Criar schemas/namespaces, tabelas Core, índices, constraints e seeds de módulos/ações.
- Implementar Supabase Auth, perfis, permissões, escopos, função `has_permission` e auditoria append-only.
- Criar RLS e suíte de testes negativos/positivos.
- Criar fluxo seguro de convite, ativação/desativação e recuperação.

Gate: usuário sem permissão não vê módulo e recebe negação no banco/API, inclusive por chamada manual.

### Etapa 4 — shell/hub sem migrar regras de domínio

- Implementar login único, hub dinâmico, layout, troca de módulo, breadcrumbs e logout.
- Encaixar módulos atrás de adaptadores e feature flags.
- Manter fontes de dados legadas inicialmente, mas remover logins duplicados somente quando a sessão central estiver integrada e testada.

Gate: todos os módulos autorizados abrem com uma sessão; módulos não autorizados falham por UI, rota e backend.

### Etapa 5 — migração módulo a módulo

Ordem sugerida por risco/valor:

1. **OS SEMED:** corrigir apenas o bloqueador sintático; normalizar dados locais para banco e Storage. Não há backend remoto a conciliar, mas anexos/encoding exigem cuidado.
2. **Avaliações:** já usa Supabase e tem `avd_records`; separar core do blob e endurecer RLS sem mudar cálculos.
3. **Inscrições:** normalizar o documento único em tabelas relacionais; preservar conflitos, vagas e frequência.
4. **Monitor:** migrar coleções/Storage/Auth Firebase com IDs legados e comparação de resultados.
5. **Votação:** por último, após segurança e observabilidade maduras; preservar fluxo e criar RPC transacional/append-only.

Se Votação estiver em calendário eleitoral ativo, sua onda deve ser isolada e agendada fora do pleito.

Para cada módulo: staging → transformação idempotente → validação → leitura paralela → dupla escrita apenas se necessária → corte controlado → observação → desativação posterior da origem.

### Etapa 6 — reconciliação de dados compartilhados

- Carregar unidades de cada origem em staging.
- Propor correspondências, nunca aplicar apenas por similaridade de nome.
- Aprovação humana para casos ambíguos.
- Adotar `core.units` gradualmente mantendo IDs de origem e aliases.

Gate: zero referência órfã e relatório de correspondência aprovado.

### Etapa 7 — encerramento dos backends legados

Somente após período acordado sem divergências:

- congelar escrita antiga;
- gerar export final e backup;
- revogar chaves/regras públicas;
- manter origem em leitura pelo prazo de retenção;
- remover feature flags e adaptadores obsoletos em PR separado.

Gate: aceite funcional, segurança, restauração e reconciliação assinados.

## 3. Mapeamento inicial de dados

| Origem | Destino inicial | Tratamento |
|---|---|---|
| `avd_app_state.users/permissions` | Core Auth/perfis/permissões | Não migrar senhas; convidar usuários |
| `avd_app_state` imports/logs/habilidades | `avaliacoes.*` / `audit.events` | Preservar IDs e timestamps; separar JSON |
| `avd_records` | `avaliacoes.records` | Migração quase direta, com validação de encoding e números |
| `semed_sistema` | `inscricoes.*` | Normalizar coleções e relacionamentos; manter `legacy_id` |
| `urnaState/chapas` | `votacao` registro/configuração | Separar unidades, contas, chapas e membros |
| `urnaState/votacao` | sessões/urnas/votos | Append-only, deduplicar por sessão, validar contagens |
| `dirlogistica-os-state-v1` + seed | `os_semed.*` + Storage | Preservar Row IDs, arquivo bruto e encoding original |
| Firestore Monitor | `monitor.*` | Preservar document ID e timestamps |
| Firebase Storage | bucket/prefixo Monitor | Checksum, MIME, tamanho e vínculo ao registro |

## 4. Migrations propostas (ainda não criadas)

Sequência conceitual:

1. `0001_schemas_and_extensions`
2. `0002_core_identity_modules_actions`
3. `0003_core_permissions_and_scopes`
4. `0004_audit_events`
5. `0005_core_rls_helpers`
6. `0006_core_rls_policies`
7. migrations de cada domínio em ordem independente
8. staging/import por origem
9. views/RPC de compatibilidade

Cada migration terá `up` idempotente quando possível, rollback lógico documentado, comentário de policy e teste correspondente. Nenhuma migration foi aplicada na Fase 1.

## 5. Validação e reconciliação

- Contagem por entidade e por status/origem.
- Unicidade de chaves, referências órfãs e valores nulos inesperados.
- Checksums de arquivos e amostras de JSON bruto.
- Comparação de KPIs/relatórios antes/depois com tolerância explicitamente zero ou justificada.
- Para votação: total de sessões votadas = votos, um voto por sessão e reconciliação de válidos/brancos/nulos/pesos.
- Para inscrições: ocupação/lista de espera e conflitos preservados.
- Para avaliações: totais de pontos, percentuais e Q1–Q20 preservados.

## 6. Rollback

- Feature flag retorna leitura ao legado.
- Escrita central é pausada; eventos pendentes são exportados e reconciliados.
- Nunca reverter destruindo dados novos; usar migration compensatória ou nova versão.
- Backends antigos permanecem disponíveis em modo controlado até o gate final.
- Procedimento de rollback ensaiado em homologação antes de cada corte.

## 7. Riscos priorizados

| Prioridade | Risco | Mitigação |
|---|---|---|
| P0 | Escrita anônima em Avaliações, Inscrições e Votação | Conter/rotacionar; migrar Auth/RLS; não expor dados reais enquanto público |
| P0 | Senhas/credenciais em código ou documentação | Rotação, convite seguro e limpeza de histórico conforme governança |
| P0 | OS não passa na sintaxe | Correção mínima isolada após autorização e teste de caracterização |
| P1 | Sobrescrita/contenção em documentos JSON | Normalização e escrita transacional por entidade |
| P1 | Divergência de unidades e usuários | Staging + aliases + aprovação humana |
| P1 | Corrida/duplicidade em votação e vagas | RPC transacional + constraints + testes concorrentes |
| P1 | Encoding inconsistente | Guardar bruto, transformação versionada e relatório de rejeição |
| P2 | Duas cópias/versionamentos divergentes | Definir fonte publicada antes de consolidar |
| P2 | Papéis fixos e permissões amplas | Matriz configurável + escopos + RLS |

## 8. Checkpoint desta entrega

- **ETAPA:** Fase 1 — diagnóstico e desenho.
- **STATUS:** concluída localmente; pendente validação dos responsáveis e inventário remoto.
- **Arquivos criados:** `docs/ARQUITETURA_ATUAL.md`, `docs/ARQUITETURA_FINAL.md`, `docs/PLANO_DE_MIGRACAO.md`.
- **Arquivos legados modificados:** nenhum.
- **Banco:** nenhuma conexão ou alteração.
- **Migrations:** nenhuma criada/aplicada; apenas sequência proposta.
- **Funcionalidades preservadas/alteradas:** nenhuma alteração funcional.
- **Problemas:** auth/RLS públicas/inseguras em três módulos; erro sintático em OS; duplicações de código; credenciais/documentação sensível; divergência README/código.
- **Testes:** inventário estático e validação sintática; todos os JS selecionados passaram exceto OS SEMED. Sem E2E ou testes remotos.
- **Próxima etapa:** inventário remoto, contenção de credenciais/regras e testes de caracterização, sem iniciar migração destrutiva.
