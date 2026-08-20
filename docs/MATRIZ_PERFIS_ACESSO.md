# Matriz corporativa de perfis e acessos

## Administração exclusiva

Somente `detic@uberabadigital.com.br` pode abrir o cadastro corporativo de
usuários, definir senha temporária, ativar ou inativar contas e atribuir perfis.
A restrição existe na interface e na Edge Function; não depende apenas de
ocultação visual.

## Perfis corporativos

| Perfil | Módulos | Operações |
|---|---|---|
| Administrador Geral | Todos | visualizar, cadastrar, editar, excluir, aprovar e administrar |
| Gestor SEMED | Todos | visualizar, cadastrar, editar e aprovar; Urna apenas consulta |
| Avaliações — Gestor | Avaliações | visualizar, cadastrar, editar e aprovar |
| Avaliações — Consulta | Avaliações | somente visualizar |
| Inscrições — Gestor | Inscrições | visualizar, cadastrar, editar, excluir e aprovar |
| Inscrições — Operador | Inscrições | visualizar, cadastrar e editar |
| Inscrições — Consulta | Inscrições | somente visualizar |
| Monitoramento — Gestão | Monitoramento | visualizar, cadastrar, editar e aprovar |
| Monitoramento — Consulta | Monitoramento | somente visualizar |
| OS — Solicitante | Ordens de Serviço | abrir e acompanhar as próprias OS |
| OS — Responsável | Ordens de Serviço | visualizar e atualizar OS atribuídas |
| OS — Consulta | Ordens de Serviço | somente visualizar |
| Urna — Mesário | Urna Eletrônica | operar a votação da unidade vinculada |

## Papéis funcionais por módulo

- Avaliações: Gestor SEMED, Gestor Unidade e Consulta.
- Inscrições: Gestor SEMED, Gestor Unidade, Professor e Secretaria.
- Monitoramento: Gabinete, Assessoria, Diretoria, Departamento, Seção e
  Servidor.
- Ordens de Serviço: Solicitante, Responsável e Gestor/Consulta.
- Urna Eletrônica: Mesário, vinculado a uma unidade escolar.

O perfil corporativo determina o módulo e as operações. O papel funcional
determina o campo de atuação dentro do módulo, como unidade escolar,
departamento, área responsável ou urna.

## Ciclo da senha

1. O administrador DETIC cria a conta com uma senha temporária forte.
2. O Supabase Auth armazena somente o hash da senha.
3. `semed_people.must_change_password` é marcado como verdadeiro.
4. No primeiro login, nenhum módulo é liberado.
5. O usuário define uma nova senha no portal.
6. O portal registra a confirmação e encerra a sessão.
7. O usuário entra novamente e visualiza apenas os módulos autorizados.

A recuperação por “Esqueci minha senha” segue o fluxo de e-mail do Supabase
Auth e também elimina a pendência de primeiro acesso após a troca bem-sucedida.

