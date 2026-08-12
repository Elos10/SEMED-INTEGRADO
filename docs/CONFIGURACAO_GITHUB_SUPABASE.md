# Configuração do portal no GitHub Pages com Supabase

## Arquivos

- `index.html`: portal, login Supabase Auth e cards de módulos autorizados.
- `supabase-config.js`: somente URL e chave pública publishable/anon.
- `.nojekyll`: entrega os arquivos diretamente pelo GitHub Pages.

## Configuração

1. No projeto Supabase central, copie a URL e a chave **Publishable**.
2. Substitua os placeholders em `supabase-config.js`.
3. Nunca use `service_role`, senha do banco ou connection string no GitHub Pages.
4. Ative Auth por e-mail/senha e configure as URLs permitidas do site.
5. Implemente a RPC autenticada `get_my_modules` em uma migration versionada.

## Contrato da RPC

`get_my_modules()` não recebe ID de usuário do navegador. Ela deve usar `auth.uid()`, verificar usuário/perfil ativo e retornar apenas módulos com permissão `view`:

| Campo | Tipo | Uso |
|---|---|---|
| `codigo` | texto | Identificador estável do módulo |
| `nome` | texto | Nome exibido |
| `descricao` | texto | Texto do card |
| `icone` | texto | Ícone opcional |
| `rota` | texto | URL/rota autorizada |
| `ordem` | número | Ordenação dos cards |

Não deve haver fallback público com a lista dos cinco módulos. A RPC e as RLS são responsáveis pela segurança; esconder cards no HTML é apenas uma camada de apresentação.

## Publicação

No GitHub, selecione **Settings → Pages → Deploy from a branch** e publique a branch/pasta que contém `index.html`. Antes de produção, valide login, logout, sessão persistida, usuário sem permissões e tentativa de chamada direta à RPC.
