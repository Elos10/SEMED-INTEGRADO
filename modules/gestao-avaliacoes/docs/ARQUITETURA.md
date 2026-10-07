# Arquitetura do MVP OMR Escolar

## Decisões

O projeto é um monorepo com quatro limites claros:

- `apps/web`: React, TypeScript, Vite e Tailwind. Não contém regras escolares.
- `apps/api`: Node.js, TypeScript e Fastify. Valida autenticação, autorização, uploads e orquestra os serviços.
- `packages/core`: regras puras, contrato do template, reconhecimento e correção, compartilhados por API e testes.
- `workers/omr`: OpenCV em Python para rasterização, código de barras, localização, perspectiva e extração de preenchimentos.

PostgreSQL/Supabase é a fonte de dados. Supabase Auth emite o JWT; a API valida o usuário com `getUser(token)`. O navegador recebe apenas URL e chave publicável. A chave secreta fica somente na API. PDFs e digitalizações ficam em buckets privados. Todas as tabelas públicas têm RLS por organização e unidade.

## Fluxo ponta a ponta

1. A API valida série/disciplina e deriva a quantidade de questões em `assessmentRules`.
2. A avaliação e o gabarito oficial são persistidos.
3. Para cada aluno, `answerSheetService` cria um UUID aleatório, opaco e compacto para o código de barras.
4. `pdfService` desenha duas metades idênticas e independentes pela geometria de `A4_LANDSCAPE_2UP_HORIZONTAL_V1`.
5. O upload é limitado, inspecionado por assinatura (magic bytes), armazenado em caminho não previsível e enviado ao worker.
6. `PageLayoutDetector` distingue página A4 ou meia folha, procura quatro marcadores por metade e aplica homografia.
7. O código de barras identifica o cartão. As ROIs são calculadas pelo mesmo template, nunca por coordenadas duplicadas.
8. OpenCV devolve a razão de pixels escuros no interior de cada bolha; `answerRecognitionService` classifica marcada, branca, dupla ou baixa confiança.
9. A revisão manual preserva valor automático, valor final, autor e horário.
10. `gradingService` corrige e persiste o resultado; `reportService` agrega e exporta CSV.

## Template determinístico

`A4_LANDSCAPE_2UP_HORIZONTAL_V1` mede 297 x 210 mm, margem externa de 10 mm, corte em x=148,5 mm e duas áreas úteis de 128,5 x 190 mm. Cada metade tem quatro marcadores quadrados, código de barras próprio, cabeçalho, grade de respostas e assinatura. Calibri 12 é a fonte preferencial; o gerador incorpora `CALIBRI_FONT_PATH` e falha em produção se ela não existir (em desenvolvimento usa Helvetica com aviso).

O JSON/TypeScript do template é a fonte única de:

- dimensões em milímetros;
- centros e raios das bolhas;
- marcadores e código de barras;
- regiões de cabeçalho/assinatura;
- conversão para pontos PDF e pixels normalizados.

A versão é gravada no código de barras e no banco. Templates publicados são imutáveis; mudanças criam V2. O arquivo tem exatamente duas metades lado a lado, linha tracejada de corte e nenhum elemento cruza o centro.

## Algoritmo OMR

`PageLayoutDetector` rasteriza PDF a 300 dpi, aplica escala de cinza, CLAHE e threshold adaptativo. Ele testa orientação pelo código de barras e pelos marcadores. Em página inteira, divide candidatos pela linha central; em meia folha, trata a imagem como um candidato. Contornos quadrados grandes perto dos cantos formam os quatro marcadores. A combinação com menor erro geométrico gera a homografia para 1285 x 1900 px (10 px/mm).

Após a normalização, o Code 128 é lido com ZXing; o `QRCodeDetector` permanece apenas para compatibilidade com folhas antigas. Para cada bolha, mede-se o preenchimento em um disco interno (o contorno impresso fica fora da máscara), descontando uma mediana local. Parâmetros iniciais configuráveis: `blankThreshold=0.18`, `markedThreshold=0.42`, `doubleMarkDelta=0.10`, confiança confiável `0.90`, revisão `0.50`. Duas bolhas acima do limiar produzem `MULTIPLE`; nenhuma acima de branco produz `BLANK`; ambiguidades produzem `REVIEW`. A confiança combina distância do limiar, separação entre primeiro/segundo e qualidade dos marcadores.

## Segurança e operação

- RBAC: Administrador, Gestor, Professor e Operador; permissões são verificadas na API e em RLS.
- Upload: 15 MB, PDF/JPEG/PNG, magic bytes, nome UUID, sem SVG/HTML, bucket privado, antivírus como etapa recomendada antes de produção.
- Código de barras: UUID aleatório e opaco, validado no banco e restrito à organização; nenhum dado pessoal do aluno.
- Logs: estado, duração, hash SHA-256, usuário, erros sanitizados e versão do algoritmo.
- Filas: MVP síncrono com limite; interface `ProcessingQueue` permite migrar para worker assíncrono.
- Observabilidade: request id e processing id em todos os logs.

## Estrutura

```text
apps/api/src/{routes,services,plugins}
apps/web/src/{components,pages,lib}
packages/core/src/{config,template,services,types}
prisma/schema.prisma
supabase/migrations/0001_initial.sql
workers/omr/{omr_worker.py,requirements.txt}
tests/fixtures
scripts
docs
```

## APIs do MVP

- `GET /health`
- `GET/POST /api/units`, `/api/classes`, `/api/students`
- `GET/POST /api/assessments`
- `PUT /api/assessments/:id/answer-key`
- `POST /api/assessments/:id/sheets`
- `GET /api/sheets/:id/pdf`
- `POST /api/processings` (multipart)
- `GET/PATCH /api/processings/:id/review`
- `POST /api/processings/:id/finalize`
- `GET /api/results` e `GET /api/reports/results.csv`

Rotas adicionais implementadas no MVP: `GET /api/me`, detalhe da avaliação, geração em turma, listagem de processamentos, acesso protegido ao original, revisão, finalização e resumo de relatórios. Todas recebem o escopo da organização autenticada.
