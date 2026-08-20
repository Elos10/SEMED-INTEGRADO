import { TURNSTILE_SITE_KEY } from "./supabase-config.js";

let loader;
function loadTurnstile() {
  if (!TURNSTILE_SITE_KEY) return Promise.resolve(null);
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!loader) loader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => reject(new Error("Não foi possível carregar a confirmação de segurança."));
    document.head.append(script);
  });
  return loader;
}

export async function createCaptcha(container) {
  let token = "";
  let widgetId;
  const api = await loadTurnstile();
  if (!api || !container) return { enabled: false, token: () => undefined, reset() {} };
  widgetId = api.render(container, {
    sitekey: TURNSTILE_SITE_KEY,
    theme: "light",
    callback: (value) => { token = value; },
    "expired-callback": () => { token = ""; },
    "error-callback": () => { token = ""; },
  });
  return {
    enabled: true,
    token: () => token || undefined,
    reset() { token = ""; api.reset(widgetId); },
  };
}
