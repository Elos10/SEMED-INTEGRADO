import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const moduleByHref = {
  "./modules/avaliacoes/": "avaliacoes",
  "./modules/inscricoes/": "inscricoes",
  "./modules/monitor/": "monitor",
  "./modules/os-semed/": "os_semed",
  "./modules/votacao/": "votacao",
};

const style = document.createElement("style");
style.textContent = `
  body.portal-auth-pending .systems-section{visibility:hidden}
  .portal-auth{position:fixed;inset:0;z-index:100;background:linear-gradient(120deg,#002164,#075bd3);display:grid;place-items:center;padding:24px}
  .portal-auth[hidden]{display:none}.portal-login{width:min(430px,100%);background:#fff;border-radius:20px;padding:30px;box-shadow:0 28px 80px #00164080;color:#062b78}
  .portal-login h2{margin:0 0 8px;font-size:28px}.portal-login p{margin:0 0 22px;color:#526b9b}.portal-login label{display:grid;gap:7px;margin:14px 0;font-weight:800;font-size:13px}
  .portal-login input{min-height:46px;border:1px solid #bfd0eb;border-radius:9px;padding:11px;font:inherit}.portal-login button{width:100%;min-height:46px;border:0;border-radius:9px;background:linear-gradient(90deg,#0052d7,#0872e6);color:#fff;font-weight:900;cursor:pointer}
  .portal-login .auth-error{min-height:20px;color:#b42318;font-weight:700;font-size:13px}.portal-user{display:flex;align-items:center;gap:12px;color:#fff;font-size:12px}.portal-user button{border:1px solid #ffffff80;border-radius:16px;padding:8px 14px;background:#ffffff14;color:#fff;font-weight:800;cursor:pointer}
  .system-card[hidden]{display:none!important}.systems-grid.filtered .system-card:nth-child(n){grid-column:auto}.systems-grid.filtered{grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}
`;
document.head.append(style);
document.body.classList.add("portal-auth-pending");

const overlay = document.createElement("section");
overlay.className = "portal-auth";
overlay.innerHTML = `<form class="portal-login"><h2>Entrar no Portal SEMED</h2><p>Use seu e-mail institucional e sua senha.</p><label>E-mail<input name="email" type="email" autocomplete="username" value="detic@uberabadigital.com.br" required></label><label>Senha<input name="password" type="password" autocomplete="current-password" required></label><div class="auth-error" role="alert"></div><button type="submit">Entrar</button></form>`;
document.body.append(overlay);

async function accessContext() {
  const { data, error } = await supabase.rpc("get_my_access_context");
  if (error) throw error;
  if (!data?.user?.active) throw new Error("Usuário corporativo inativo.");
  return data;
}

function renderUser(session) {
  document.querySelector(".portal-user")?.remove();
  const area = document.createElement("div");
  area.className = "portal-user";
  area.innerHTML = `<span>${session.user.email}</span><button type="button">Sair</button>`;
  area.querySelector("button").addEventListener("click", async () => { await supabase.auth.signOut(); location.reload(); });
  document.querySelector(".topbar")?.append(area);
}

async function revealPortal(session) {
  const context = await accessContext();
  const codes = new Set((context.modules || []).filter((item) => item.permissions?.view).map((item) => item.code));
  document.querySelectorAll(".system-card").forEach((card) => {
    const href = card.querySelector(".access")?.getAttribute("href");
    card.hidden = !codes.has(moduleByHref[href]);
  });
  document.querySelector(".systems-grid")?.classList.add("filtered");
  if (!codes.size) throw new Error("Seu perfil não possui módulos autorizados.");
  renderUser(session);
  window.SEMED_ACCESS_CONTEXT = context;
  overlay.hidden = true;
  document.body.classList.remove("portal-auth-pending");

  const target = new URLSearchParams(location.search).get("return");
  if (target) {
    const decoded = decodeURIComponent(target);
    const moduleCode = Object.entries(moduleByHref).find(([href]) => decoded.includes(href.replace("./", "/")))?.[1];
    if (moduleCode && codes.has(moduleCode)) location.assign(decoded);
  }
}

overlay.querySelector("form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const errorBox = form.querySelector(".auth-error");
  errorBox.textContent = "";
  const values = new FormData(form);
  const { data, error } = await supabase.auth.signInWithPassword({ email: String(values.get("email") || "").trim().toLowerCase(), password: String(values.get("password") || "") });
  if (error || !data.session) { errorBox.textContent = "E-mail ou senha inválidos."; return; }
  try { await revealPortal(data.session); } catch (accessError) { await supabase.auth.signOut(); errorBox.textContent = accessError.message || "Acesso indisponível."; }
});

const { data: { session } } = await supabase.auth.getSession();
if (session) {
  try { await revealPortal(session); } catch (error) { await supabase.auth.signOut(); overlay.querySelector(".auth-error").textContent = error.message || "Acesso indisponível."; }
}
