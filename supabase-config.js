// Configuração pública do aplicativo Web. A chave publishable/anon pode estar no
// frontend, desde que RLS esteja habilitada e nenhuma service_role seja usada.
export const SUPABASE_URL = "https://mqzaaelyiskwshqjwaxy.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_qz1ZoagSgKJSwBbRarSOMQ_hapL8htu";

// Chave pública do widget Cloudflare Turnstile. Nunca coloque a Secret Key no frontend.
// O CAPTCHA só é exigido pelo cliente depois que esta chave e a proteção no Auth estiverem configuradas.
export const TURNSTILE_SITE_KEY = "";
