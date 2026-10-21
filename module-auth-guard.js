import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";
import { semedUi } from "./shared-runtime.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const ACCESS_CACHE_KEY = "semed.access-context.v2";
const ACCESS_CACHE_TTL = 30_000;
const path = location.pathname.toLowerCase();
const modulePath = path.match(/(?:^|\/)modules\/([^/]+)(?:\/|$)/)?.[1] || "";
const code = ({ avaliacoes: "avaliacoes", monitor: "monitor", votacao: "votacao", inteligencia: "inteligencia" })[modulePath] || "";
const portalUrl = new URL("../../", location.href);
portalUrl.searchParams.set("return", location.pathname + location.search);
const portalHomeUrl = new URL("../../", location.href);
portalHomeUrl.searchParams.set("select", "1");
const moduleHomeUrl = new URL("./", location.href);
let moduleSwitchEnabled = false;
window.SEMED_AUTH_SIGN_OUT = async () => { await supabase.auth.signOut(); };

function installPortalButton(root = document) {
  root.querySelectorAll?.(".semed-entry .entry-top").forEach((header) => {
    const entry = header.closest(".semed-entry");
    if (entry && !entry.querySelector(":scope > .entry-portal-intro")) {
      const intro = document.createElement("section");
      intro.className = "entry-portal-intro";
      intro.setAttribute("aria-label", "Apresentação do Portal de Sistemas Unificados");
      intro.innerHTML = '<div><span>Bem-vindo ao</span><h1>Portal de Sistemas<br>Unificados</h1><p>Acesse de forma integrada os principais sistemas<br>da Secretaria de Educação de Uberaba.</p><i aria-hidden="true"></i></div>';
      header.insertAdjacentElement("afterend", intro);
      entry.classList.add("entry-portal-layout");
      entry.style.setProperty("grid-template-rows", "72px auto minmax(0, 1fr) 72px", "important");
      entry.style.setProperty("overflow", "auto", "important");
    }
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

function installModulePortalButton(root = document) {
  if (!moduleSwitchEnabled || root.querySelector?.("[data-module-portal-switch]")) return;
  const placements = [
    [".top .top-actions", "prepend"],
    [".app-shell .sidebar", "before-logout"],
    [".shell .sidebar .nav", "append"],
    [".brand-header .brand-header-inner", "before-logout"],
    [".admin-header", "prepend"],
    [".urna-topbar", "prepend"],
  ];
  const match = placements.map(([selector, mode]) => [root.querySelector?.(selector), mode]).find(([target]) => target);
  if (!match) return;
  const [target, mode] = match;
  const link = document.createElement("a");
  link.className = "module-portal-switch";
  link.dataset.modulePortalSwitch = "1";
  link.dataset.moduleHome = "1";
  link.href = moduleHomeUrl.href;
  link.innerHTML = '<span aria-hidden="true">←</span><span>Voltar</span>';
  const logout = target.querySelector?.("#logout,[data-action='logout'],.topbar-logout");
  if (mode === "prepend") target.prepend(link);
  else if (mode === "before-logout" && logout) logout.insertAdjacentElement("beforebegin", link);
  else target.append(link);
}

installPortalButton();
new MutationObserver(() => { installPortalButton(); installModulePortalButton(); }).observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener("click", (event) => {
  const moduleHomeLink = event.target.closest?.("[data-module-home]");
  if (moduleHomeLink) {
    event.preventDefault();
    location.assign(moduleHomeUrl.href);
    return;
  }
  const portalLink = event.target.closest?.("[data-portal-home]");
  if (portalLink) {
    event.preventDefault();
    location.assign(portalHomeUrl.href);
    return;
  }
  const recoveryLink = event.target.closest?.(".entry-forgot");
  if (!recoveryLink) return;
  event.preventDefault();
  const recoveryUrl = new URL("../../", location.href);
  recoveryUrl.searchParams.set("recovery", "1");
  location.assign(recoveryUrl);
});

document.addEventListener("click", (event) => {
  const logout = event.target.closest?.("#logout,[data-action='logout'],.topbar-logout,.sidebar-logout");
  if (!logout || logout.closest?.(".semed-entry")) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  location.assign(portalHomeUrl.href);
}, true);

window.SEMED_MODULE_ACCESS = (async () => {
  semedUi.loading("Validando acesso ao módulo…");
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { location.replace(portalUrl); return null; }
  let data;
  let error;
  let staleContext;
  try {
    const cached = JSON.parse(sessionStorage.getItem(ACCESS_CACHE_KEY) || "null");
    if (cached?.userId === session.user.id) {
      staleContext = cached.context;
      if (Date.now() - cached.storedAt < ACCESS_CACHE_TTL) data = cached.context;
    }
  } catch {}
  if (!data) {
    let result = await supabase.rpc("get_my_access_context");
    if (result.error || !result.data?.user?.active) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      result = await supabase.rpc("get_my_access_context");
    }
    data = result.data || staleContext;
    error = data ? null : result.error;
    if (!error && data) {
      try { sessionStorage.setItem(ACCESS_CACHE_KEY, JSON.stringify({ userId: session.user.id, storedAt: Date.now(), context: data })); } catch {}
    }
  }
  if (!error && data?.user?.must_change_password) {
    portalUrl.searchParams.set("first_access", "1");
    location.replace(portalUrl);
    return null;
  }
  const moduleAccess = !error && data?.user?.active ? (data.modules || []).find((item) => item.code === code) : null;
  const allowed = Boolean(moduleAccess?.permissions?.view || data?.portal_admin);
  if (!allowed) { location.replace(portalUrl); return null; }
  moduleSwitchEnabled = (data.modules || []).filter((item) => item.permissions?.view).length > 1;
  installModulePortalButton();
  document.documentElement.classList.remove("semed-auth-check");
  if (document.body) document.body.style.visibility = "visible";
  semedUi.clear();
  window.SEMED_CAN = (operation = "view") => Boolean(data?.portal_admin || moduleAccess?.permissions?.[operation]);
  supabase.from("semed_audit").insert({ user_id: session.user.id, module_code: code, action: "MODULE_OPEN" }).then(() => {});
  return { session, code, moduleAccess, context: data, supabase };
})();
