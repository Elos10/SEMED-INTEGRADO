import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const path = location.pathname.toLowerCase();
const code = path.includes("/avaliacoes/") ? "avaliacoes" : path.includes("/inscricoes/") ? "inscricoes" : path.includes("/monitor/") ? "monitor" : path.includes("/os-semed/") ? "os_semed" : path.includes("/votacao/") ? "votacao" : "";
const portalUrl = new URL("../../", location.href);
portalUrl.searchParams.set("return", location.pathname + location.search);

window.SEMED_MODULE_ACCESS = (async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { location.replace(portalUrl); return null; }
  const { data, error } = await supabase.rpc("get_my_modules");
  const allowed = !error && (data || []).some((item) => item.codigo === code);
  if (!allowed) { location.replace(portalUrl); return null; }
  document.documentElement.classList.remove("semed-auth-check");
  if (document.body) document.body.style.visibility = "visible";
  return { session, code, supabase };
})();
