# Unificação gradual dos dados do portal

## Fonte de verdade

- Identidade e permissões: projeto central INTEGRADO SEMED, contexto de acesso autenticado. Não usar dados editáveis do usuário para conceder privilégios.
- Opções dos novos cadastros: Tabelas Compartilhadas, consultadas pela sessão central e sujeitas às políticas do banco.
- Unidades no Comunicação/CREI: `get_semed_shared_options('EDUCATIONAL_UNIT')`, sem depender do serviço de Avaliações.
- Prontuários SAE, comunicações protegidas e incidentes: permanecem na base atual e com seus controles específicos. Não foram migrados nem tornados públicos.

## Primeira etapa implementada

Comunicação e CREI passam a consultar as unidades diretamente do catálogo central. Uma falha nessa consulta é informada na tela, sem impedir a leitura dos demais registros. Catálogo vazio não é substituído por uma lista antiga: isso evitaria respeitar a inativação de uma unidade.

Os identificadores centrais são preservados no resultado da consulta. Os formulários atuais ainda gravam os nomes nos campos legados; portanto esta etapa não equivale à migração dos relacionamentos históricos.

## Etapas necessárias antes de reunir bases operacionais

1. Inventariar esquemas, anexos, políticas, contagens e referências de cada base. Conferir backup restaurável antes de qualquer movimentação.
2. Criar correspondência explícita entre identificador de origem e identificador central. Nomes parecidos não autorizam fusão automática.
3. Adicionar referências centrais aos registros existentes sem remover os campos antigos; revisar divergências e homônimos.
4. Validar em ambiente separado contagens, relatórios, acessos permitidos e negados, anexos e históricos. Conteúdo protegido precisa de testes próprios.
5. Migrar um módulo por vez, com janela de mudança, controle de novas gravações, reconciliação e procedimento de retorno testado.
6. Desativar a base antiga somente após aceite e prazo de retenção. Não apagar usuários, históricos ou bases como parte desta primeira etapa.

## Verificação e retorno desta etapa

Na origem Comunicação: `node --test tests/shared-units.test.mjs` e `pnpm run lint`.
Validar também o formulário com uma sessão real autorizada após a implantação.
Para retornar, reverter apenas o commit desta integração no repositório Comunicação. Não há alteração de esquema ou exclusão de dados para desfazer.
