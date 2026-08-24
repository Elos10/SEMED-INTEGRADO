import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";
import { createCaptcha } from "./captcha.js";
import { initPortalAdmin } from "./portal-admin.js?v=20260821-areas-1";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const moduleByHref = {
  "./modules/avaliacoes/": "avaliacoes",
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
  .portal-login input{min-height:46px;border:1px solid #bfd0eb;border-radius:9px;padding:11px;font:inherit}.portal-login button[type="submit"]{width:100%;min-height:46px;border:0;border-radius:9px;background:linear-gradient(90deg,#0052d7,#0872e6);color:#fff;font-weight:900;cursor:pointer}
  .portal-login .auth-link{display:block;margin:10px auto;border:0;background:transparent;color:#0757c9;font-weight:750;cursor:pointer}.portal-login .captcha-slot{display:grid;place-items:center;min-height:8px;margin:12px 0}.portal-login[hidden]{display:none}
  .portal-login .auth-error{min-height:20px;color:#b42318;font-weight:700;font-size:13px}.portal-user{display:flex;align-items:center;gap:12px;color:#fff;font-size:12px}.portal-user button{border:1px solid #ffffff80;border-radius:16px;padding:8px 14px;background:#ffffff14;color:#fff;font-weight:800;cursor:pointer}
  .system-card[hidden]{display:none!important}.systems-grid.filtered .system-card:nth-child(n){grid-column:auto}.systems-grid.filtered{grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}
`;
document.head.append(style);
document.body.classList.add("portal-auth-pending");

const overlay = document.createElement("section");
overlay.className = "portal-auth";
overlay.innerHTML = `
  <form class="portal-login" data-auth-view="login">
    <h2>Entrar no Portal SEMED</h2><p>Use seu e-mail institucional e sua senha.</p>
    <label>E-mail<input name="email" type="email" autocomplete="username" required></label>
    <label>Senha<input name="password" type="password" autocomplete="current-password" required></label>
    <div class="captcha-slot" data-captcha="login"></div><div class="auth-error" role="alert"></div>
    <button type="submit">Entrar</button><button class="auth-link" type="button" data-forgot>Esqueceu sua senha?</button>
  </form>
  <form class="portal-login" data-auth-view="recovery" hidden>
    <h2>Recuperar senha</h2><p>Enviaremos um link seguro para o e-mail cadastrado.</p>
    <label>E-mail<input name="email" type="email" autocomplete="email" required></label>
    <div class="captcha-slot" data-captcha="recovery"></div><div class="auth-error" role="alert"></div>
    <button type="submit">Enviar link</button><button class="auth-link" type="button" data-back-login>Voltar ao login</button>
  </form>
  <form class="portal-login" data-auth-view="update" hidden>
    <h2>Definir nova senha</h2><p>Use pelo menos 12 caracteres, com letras, número e símbolo.</p>
    <label>Nova senha<input name="password" type="password" autocomplete="new-password" minlength="12" required></label>
    <label>Confirmar senha<input name="confirmation" type="password" autocomplete="new-password" minlength="12" required></label>
    <div class="auth-error" role="alert"></div><button type="submit">Atualizar senha</button>
  </form>`;
document.body.append(overlay);

const loginForm = overlay.querySelector('[data-auth-view="login"]');
const recoveryForm = overlay.querySelector('[data-auth-view="recovery"]');
const updateForm = overlay.querySelector('[data-auth-view="update"]');
const loginCaptcha = await createCaptcha(overlay.querySelector('[data-captcha="login"]'));
const recoveryCaptcha = await createCaptcha(overlay.querySelector('[data-captcha="recovery"]'));

function showAuthView(name) {
  overlay.hidden = false;
  overlay.querySelectorAll("[data-auth-view]").forEach((form) => { form.hidden = form.dataset.authView !== name; });
}

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
  if (context.user?.must_change_password) {
    updateForm.querySelector("h2").textContent = "Troca obrigatória de senha";
    updateForm.querySelector("p").textContent = "Por segurança, substitua a senha temporária antes de acessar os sistemas.";
    showAuthView("update");
    return;
  }
  const codes = new Set((context.modules || []).filter((item) => item.permissions?.view).map((item) => item.code));
  document.querySelectorAll(".system-card").forEach((card) => {
    const href = card.querySelector(".access")?.getAttribute("href");
    card.hidden = !codes.has(moduleByHref[href]);
  });
  document.querySelector(".systems-grid")?.classList.add("filtered");
  if (!codes.size) throw new Error("Seu perfil não possui módulos autorizados.");
  renderUser(session);
  window.SEMED_ACCESS_CONTEXT = context;
  initPortalAdmin({ supabase, context });
  overlay.hidden = true;
  document.body.classList.remove("portal-auth-pending");

  const parameters = new URLSearchParams(location.search);
  const selectionRequested = parameters.get("select") === "1";
  const target = selectionRequested ? "" : parameters.get("return");
  if (target) {
    const decoded = decodeURIComponent(target);
    const moduleCode = Object.entries(moduleByHref).find(([href]) => decoded.includes(href.replace("./", "/")))?.[1];
    if (moduleCode && codes.has(moduleCode)) location.assign(decoded);
  }
  if (selectionRequested) {
    const cleanUrl = new URL(location.href);
    cleanUrl.searchParams.delete("select");
    cleanUrl.searchParams.delete("return");
    history.replaceState({}, "", cleanUrl);
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const errorBox = form.querySelector(".auth-error");
  errorBox.textContent = "";
  const values = new FormData(form);
  if (loginCaptcha.enabled && !loginCaptcha.token()) { errorBox.textContent = "Confirme que você não é um robô."; return; }
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(values.get("email") || "").trim().toLowerCase(),
    password: String(values.get("password") || ""),
    options: { captchaToken: loginCaptcha.token() },
  });
  loginCaptcha.reset();
  if (error || !data.session) { errorBox.textContent = "Não foi possível entrar. Confira suas credenciais e a confirmação de segurança."; return; }
  try { await revealPortal(data.session); } catch (accessError) { await supabase.auth.signOut(); errorBox.textContent = accessError.message || "Acesso indisponível."; }
});

loginForm.querySelector("[data-forgot]").addEventListener("click", () => {
  recoveryForm.elements.email.value = loginForm.elements.email.value;
  showAuthView("recovery");
});
recoveryForm.querySelector("[data-back-login]").addEventListener("click", () => showAuthView("login"));

recoveryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const errorBox = recoveryForm.querySelector(".auth-error");
  errorBox.textContent = "";
  if (recoveryCaptcha.enabled && !recoveryCaptcha.token()) { errorBox.textContent = "Confirme que você não é um robô."; return; }
  const email = String(new FormData(recoveryForm).get("email") || "").trim().toLowerCase();
  const redirectTo = new URL(location.pathname, location.href);
  redirectTo.searchParams.set("recovery", "1");
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo.toString(),
    captchaToken: recoveryCaptcha.token(),
  });
  recoveryCaptcha.reset();
  errorBox.textContent = error ? "Não foi possível enviar o link. Tente novamente." : "Se o e-mail estiver cadastrado, o link de recuperação será enviado.";
});

updateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const values = new FormData(updateForm);
  const password = String(values.get("password") || "");
  const confirmation = String(values.get("confirmation") || "");
  const errorBox = updateForm.querySelector(".auth-error");
  errorBox.textContent = "";
  if (password !== confirmation) { errorBox.textContent = "As senhas informadas são diferentes."; return; }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}/.test(password)) {
    errorBox.textContent = "Use 12 caracteres com maiúscula, minúscula, número e símbolo.";
    return;
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) { errorBox.textContent = error.message || "Não foi possível atualizar a senha."; return; }
  const { error: confirmationError } = await supabase.rpc("confirm_my_password_change");
  if (confirmationError) { errorBox.textContent = "A senha foi alterada, mas não foi possível concluir a confirmação do primeiro acesso."; return; }
  await supabase.auth.signOut();
  loginForm.reset();
  loginForm.querySelector(".auth-error").textContent = "Senha atualizada. Entre novamente.";
  showAuthView("login");
});

supabase.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") showAuthView("update");
});

const { data: { session } } = await supabase.auth.getSession();
if (session) {
  if (new URLSearchParams(location.search).get("recovery") === "1") showAuthView("update");
  else try { await revealPortal(session); } catch (error) { await supabase.auth.signOut(); loginForm.querySelector(".auth-error").textContent = error.message || "Acesso indisponível."; }
}
