import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";
import { semedUi } from "./shared-runtime.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const path = location.pathname.toLowerCase();
const code = path.includes("/avaliacoes/") ? "avaliacoes" : path.includes("/monitor/") ? "monitor" : path.includes("/os-semed/") ? "os_semed" : path.includes("/votacao/") ? "votacao" : "";
const portalUrl = new URL("../../", location.href);
portalUrl.searchParams.set("return", location.pathname + location.search);
const portalHomeUrl = new URL("../../", location.href);
window.SEMED_AUTH_SIGN_OUT = async () => { await supabase.auth.signOut(); };

function installPortalButton(root = document) {
  root.querySelectorAll?.(".semed-entry .entry-top").forEach((header) => {
    if (header.querySelector("[data-portal-home]")) return;
    header.classList.add("has-entry-actions");
    let actions = header.querySelector(".entry-top-actions");
    if (!actions) {
      actions = document.createElement("nav");
      actions.className = "entry-top-actions";
      actions.setAttribute("aria-label", "Navegação da tela inicial");
      const help = header.querySelector(".entry-help");
      if (help) actions.append(help);
      else {
        const helpLabel = document.createElement("span");
        helpLabel.className = "entry-help";
        helpLabel.innerHTML = '<span aria-hidden="true">?</span> Ajuda';
        actions.append(helpLabel);
      }
      header.append(actions);
    }
    const link = document.createElement("a");
    link.className = "entry-portal-back";
    link.dataset.portalHome = "1";
    link.href = portalHomeUrl.href;
    link.innerHTML = '<span aria-hidden="true">←</span><span>Voltar ao Portal</span>';
    actions.prepend(link);
  });
}

installPortalButton();
new MutationObserver(() => installPortalButton()).observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener("click", (event) => {
  const recoveryLink = event.target.closest?.(".entry-forgot");
  if (!recoveryLink) return;
  event.preventDefault();
  const recoveryUrl = new URL("../../", location.href);
  recoveryUrl.searchParams.set("recovery", "1");
  location.assign(recoveryUrl);
});

window.SEMED_MODULE_ACCESS = (async () => {
  semedUi.loading("Validando acesso ao módulo…");
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { location.replace(portalUrl); return null; }
  const { data, error } = await supabase.rpc("get_my_access_context");
  if (!error && data?.user?.must_change_password) {
    portalUrl.searchParams.set("first_access", "1");
    location.replace(portalUrl);
    return null;
  }
  const moduleAccess = !error && data?.user?.active ? (data.modules || []).find((item) => item.code === code) : null;
  const allowed = Boolean(moduleAccess?.permissions?.view);
  if (!allowed) { location.replace(portalUrl); return null; }
  document.documentElement.classList.remove("semed-auth-check");
  if (document.body) document.body.style.visibility = "visible";
  semedUi.clear();
  window.SEMED_CAN = (operation = "view") => Boolean(moduleAccess.permissions?.[operation]);
  supabase.from("semed_audit").insert({ user_id: session.user.id, module_code: code, action: "MODULE_OPEN" }).then(() => {});
  return { session, code, moduleAccess, context: data, supabase };
})();
