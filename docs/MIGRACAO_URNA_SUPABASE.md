# Migração da Urna Eletrônica para Supabase

## Estado confirmado

A Urna usa dois documentos do Firestore e autenticação eleitoral própria armazenada no estado da aplicação. Leitura somente consulta realizada em 13/08/2026:

| Entidade | Quantidade |
|---|---:|
| Unidades | 79 |
| Contas internas | 80 |
| Candidatos | 158 |
| Mesas vinculadas | 1 |
| Sessões | 10 |
| Votos | 9 |

Origem: `urnaState/chapas` e `urnaState/votacao`, atualizados em `2026-08-13T14:28:00Z`. O primeiro possui aproximadamente 1 MB e o segundo 8 KB.

## Corte seguro

O Firebase deve permanecer ativo até a validação integral no Supabase:

1. criar estrutura, RLS e funções transacionais;
2. migrar contas sem manter senhas abertas em JSON;
3. importar os dois documentos em transação controlada;
4. conferir todas as contagens e identificadores;
5. bloquear gravações no Firebase durante o delta final;
6. testar voto simultâneo, voto duplicado, liberação de urna e Realtime;
7. trocar o adaptador e manter o Firebase somente leitura na homologação.

## Acesso necessário

A chave pública do frontend não cria tabelas, funções privilegiadas nem usuários. Para concluir a migração é necessário acesso autorizado ao SQL Editor do projeto `mqzaaelyiskwshqjwaxy`, conexão administrativa ou `service_role` usada somente localmente. A `service_role` nunca pode entrar no frontend ou GitHub.
