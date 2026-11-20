# Consulta Integrada do Aluno

Local: Inteligência Gerencial → Consulta Integrada do Aluno.

## Relatório de Acompanhamento do Aluno

A apresentação principal segue o padrão dos relatórios SAE: identificação compacta, filtros de Unidade, Aluno, Módulo e período e tabelas independentes por módulo. A linha do tempo permanece como apresentação alternativa.

A navegação inicial é recolhida por unidade: nome e quantidade de alunos cadastrados no alcance autorizado. Selecionar uma unidade restringe a listagem a ela. Clicar na unidade expande/recolhe a relação paginada de alunos; clicar no nome abre o relatório individual completo, com série, turma e opção de impressão. A contagem é de alunos do cadastro escolar, não de atendimentos.

O filtro de unidade atual controla os grupos. O filtro opcional de unidade onde o registro aconteceu é independente, para preservar a consulta de registros anteriores a transferências.

A lista de alunos é paginada no servidor e depende da unidade atual selecionada. A pesquisa por nome ou matrícula permite refinar a escolha sem carregar toda a rede. O modo "Onde o registro aconteceu" pesquisa o aluno no alcance autorizado e filtra a unidade histórica dos registros, sem alterar a unidade atual.

Cada módulo autorizado possui quantidade e tabela própria; textos completos ficam em detalhes expansíveis e são abertos integralmente na impressão. A versão impressa mantém os mesmos filtros de unidade histórica, módulo e datas. Campos e módulos sem autorização não são acrescentados pelo relatório.

## Identidade e vínculos

- O cadastro escolar existente fornece matrícula e identificador permanente (`avalia_students.id`). Não existe uma segunda cópia do aluno criada pelo prontuário.
- Avaliações se relacionam pelo identificador, nunca pelo nome.
- Os registros antigos de CREI/SAE não possuem matrícula escolar comum. Por isso, são localizados na fonte e vinculados somente depois de conferência explícita, por usuário com permissão de confirmar vínculos.
- Nomes iguais, abreviações ou semelhança de unidade não criam associações automáticas. Alunos que ainda não estão no cadastro escolar precisam ser regularizados nesse cadastro antes da vinculação.
- O histórico inicial de lotação retrata a situação na implantação; não é uma data retroativa de ingresso. Alterações de turma, matrícula ou situação preservam novos retratos, sem inventar um histórico anterior.

## Permissões

O módulo administrativo `prontuario` aparece em Usuários e acessos. O perfil corporativo `PRONTUARIO_CONSULTA` libera a entrada na Inteligência Gerencial e a consulta individual. Não libera sistemas de origem.

- Acessar: consultar prontuários no alcance configurado.
- Direcionar: confirmar/desfazer vínculos com registros já existentes; não permite alterar o registro original.
- Exportar: preparar a impressão do prontuário.
- Administrar: operações do prontuário, sem ignorar as permissões das fontes.
- Administrador geral: acesso padrão aos recursos do portal, preservadas as regras das fontes.

Sem alcance explícito, aplica-se a unidade da lotação. Alcances de área/diretoria utilizam a hierarquia das tabelas compartilhadas. Referências não reconhecidas e alcances não suportados não se transformam em acesso institucional.

O cadastro escolar e as avaliações continuam sujeitos à autorização existente de Avaliações. Os registros CREI são consultados com a sessão do próprio usuário após validação central, respeitando RLS da origem.

## Sigilo

- O índice de vínculos não é exposto ao navegador. Somente o serviço de integração o utiliza, após validar o aluno e as permissões centrais.
- Comunicação Protegida aparece somente para os destinatários institucionais autorizados e administrador. A consulta integrada não descriptografa nem remove máscaras. A abertura com senha continua na origem.
- Participantes de incidentes com identidade protegida não são reidentificados pelo prontuário.
- Relatos são consultados na fonte; nenhum conteúdo sigiloso é copiado para uma nova base de prontuários.
- Busca, consulta, preparação de impressão e alterações de vínculos são auditadas. O histórico dos vínculos é gravado atomicamente no banco.

## Impressão e limites

A4 retrato, margens 1 cm, Calibri 10, sem controles do portal. A impressão atualiza a consulta e exige permissão de exportação; máscaras são reaplicadas também no formulário.

O documento identifica o aluno, as fontes, o histórico escolar disponível, o emissor e a preparação. Não constitui declaração de inexistência de outros registros, assinatura digital ou inclusão automática dos anexos.

Não há busca por nome em textos livres de Comunicação Interna ou Monitoramento. Esses módulos só deverão integrar um aluno quando existir vínculo estruturado e regra de acesso própria.

## Validação

- `node --test scripts/student-dossier.test.mjs`
- `supabase/tests/student_dossier.sql`: testes transacionais de autorização, alcance, auditoria e identidade; nenhum dado de teste é mantido.
- `node scripts/build-portal.mjs`

O serviço `student-dossier-sources` é implantado no projeto central. Ele valida a sessão do Portal explicitamente. O cliente privilegiado acessa somente o índice privado de vínculos; o conteúdo de atendimentos e ocorrências é obtido com a sessão do usuário na origem.
