# CAPTCHA e proteção de senhas

## Cloudflare Turnstile

1. Crie um widget Turnstile para o domínio publicado do portal.
2. Copie somente a **Site Key** para `TURNSTILE_SITE_KEY` em
   `supabase-config.js`.
3. No Supabase, abra **Authentication > Attack Protection**.
4. Ative CAPTCHA, selecione Cloudflare Turnstile e informe a **Secret Key**.
5. Salve e teste login e recuperação no domínio publicado.

A Secret Key nunca deve ser colocada no GitHub ou no JavaScript do navegador.
Enquanto `TURNSTILE_SITE_KEY` estiver vazia, o widget fica desativado para não
bloquear o acesso antes da configuração do servidor.

## Senhas comprometidas

Em **Authentication > Sign In / Providers > Email**, ative a proteção contra
senhas vazadas e configure:

- mínimo de 8 caracteres;
- maiúscula, minúscula, número e símbolo;
- reautenticação para alteração de senha, quando disponível.

A proteção contra senhas vazadas exige plano Supabase Pro ou superior.
