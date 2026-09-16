import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";
import { createCaptcha } from "./captcha.js";
import { initPortalAdmin } from "./portal-admin.js?v=20260825-password-8-1";

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
  .portal-auth{--auth-cream:var(--semed-ivory-100);--auth-cream-deep:#eee6d4;--auth-green:var(--semed-green-950);--auth-green-soft:#18332b;--auth-action:var(--semed-green-700);--auth-navy:var(--semed-navy-900);--auth-gold:var(--semed-gold-600);position:fixed;inset:0;z-index:100;display:grid;grid-template-columns:minmax(0,57.5fr) minmax(400px,42.5fr);padding:0;background:var(--auth-green);overflow:auto}
  .portal-auth[hidden]{display:none}.portal-auth-brand{position:relative;min-height:100vh;display:flex;flex-direction:column;justify-content:space-between;padding:clamp(34px,5vh,66px) clamp(28px,4vw,70px) clamp(32px,5vh,60px);overflow:hidden;background:radial-gradient(circle at 0 0,var(--auth-cream-deep),transparent 40%),#fff}.portal-auth-brand::after{content:"";position:absolute;left:0;bottom:0;width:9px;height:34%;background:var(--auth-green)}
  .portal-auth-logo-panel{flex:0 0 auto;width:min(790px,86%);height:clamp(240px,48vh,490px);min-height:0;display:grid;place-items:center;padding:clamp(20px,3vw,42px);background:#f7f7f7}.portal-auth-logo-panel img{display:block;width:auto;height:auto;max-width:100%;max-height:100%;object-fit:contain}
  .portal-auth-intro{max-width:690px}.portal-auth-kicker{display:block;margin-bottom:18px;color:#0c5147;font-size:12px;font-weight:900;letter-spacing:.25em;text-transform:uppercase}.portal-auth-intro h1{max-width:680px;margin:0;color:var(--auth-navy);font:800 clamp(38px,4vw,64px)/1.28 Inter,"Segoe UI",sans-serif;letter-spacing:-.025em}.portal-auth-intro p{margin:22px 0 0;color:#806a5d;font-size:clamp(15px,1.15vw,19px);line-height:1.6}
  .portal-auth-access{min-height:100vh;display:grid;place-items:center;padding:40px;background:radial-gradient(circle at 50% 50%,var(--auth-green-soft),transparent 56%),var(--auth-green)}.portal-login{width:min(450px,100%);padding:34px 32px 30px;border:1px solid #fff4;border-radius:var(--semed-radius-lg);background:var(--auth-cream);box-shadow:var(--semed-shadow-dialog);color:var(--semed-color-text)}
  .portal-login .auth-eyebrow{display:block;margin-bottom:14px;color:#175747;font-size:11px;font-weight:900;letter-spacing:.2em;text-transform:uppercase}.portal-login h2{margin:0 0 9px;color:#061e1a;font-size:29px;letter-spacing:-.02em}.portal-login p{margin:0 0 24px;color:#866e5e;font-size:13px;line-height:1.5}.portal-login label{display:grid;gap:8px;margin:16px 0;color:#071d19;font-weight:800;font-size:12px}
  .portal-login input{width:100%;min-height:48px;border:1px solid #d2d0c9;border-radius:10px;padding:11px 13px;background:#fff;color:#10211d;font:inherit;outline:none;transition:border-color .16s,box-shadow .16s}.portal-login input:focus{border-color:var(--auth-action);box-shadow:0 0 0 3px #28694f1f}.portal-login button[type="submit"]{width:100%;min-height:46px;margin-top:8px;border:0;border-radius:10px;background:var(--auth-action);color:#fff;font-weight:900;cursor:pointer;transition:transform .16s,filter .16s}.portal-login button[type="submit"]:hover,.portal-login button[type="submit"]:focus-visible{transform:translateY(-1px);filter:brightness(1.08);outline:3px solid #9abdaf;outline-offset:2px}
  .portal-login .auth-link{display:block;margin:12px auto 0;border:0;background:transparent;color:#28694f;font-weight:800;cursor:pointer}.portal-login .captcha-slot{display:grid;place-items:center;min-height:8px;margin:13px 0}.portal-login[hidden]{display:none}.portal-login .auth-error{min-height:20px;margin-top:7px;color:#9f2f2f;font-weight:700;font-size:12px}.portal-login .auth-signature{display:block;margin-top:22px;padding-top:18px;border-top:1px solid #d9d3c5;color:#9a8678;font-size:11px;text-align:center}
  .portal-user{display:flex;align-items:center;gap:12px;color:#fff;font-size:12px}.portal-user button{border:1px solid #ffffff80;border-radius:16px;padding:8px 14px;background:#ffffff14;color:#fff;font-weight:800;cursor:pointer}
  .system-card[hidden]{display:none!important}.systems-grid.filtered .system-card:nth-child(n){grid-column:auto}.systems-grid.filtered{grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}
  @media(min-width:761px) and (max-width:1050px){.portal-auth-brand{padding:32px 28px}.portal-auth-logo-panel{width:94%;height:min(38vh,360px)}.portal-auth-intro h1{font-size:clamp(34px,5vw,48px)}.portal-auth-intro p{margin-top:14px;font-size:15px}.portal-auth-access{padding:28px}.portal-login{padding:28px 24px}}
  @media(max-width:760px){.portal-auth{display:block}.portal-auth-brand{min-height:0;padding:28px 24px 32px}.portal-auth-logo-panel{width:100%;height:210px}.portal-auth-intro{margin-top:28px}.portal-auth-intro h1{font-size:clamp(30px,8vw,38px)}.portal-auth-access{min-height:0;padding:38px 20px 54px}.portal-login{padding:28px 24px}}
  @media(max-height:720px) and (min-width:901px){.portal-auth-brand{padding-top:30px;padding-bottom:28px}.portal-auth-logo-panel{min-height:270px;max-height:46vh}.portal-auth-intro h1{font-size:42px}.portal-auth-intro p{margin-top:12px}.portal-login{padding:25px 28px}.portal-login label{margin:11px 0}.portal-login p{margin-bottom:16px}.portal-login .auth-signature{margin-top:14px;padding-top:13px}}
`;
document.head.append(style);
document.body.classList.add("portal-auth-pending");

const overlay = document.createElement("section");
overlay.className = "portal-auth";
overlay.innerHTML = `
  <section class="portal-auth-brand" aria-label="Identidade da Secretaria Municipal de Educação">
    <div class="portal-auth-logo-panel"><img src="./modules/votacao/assets/logo-municipal.png" alt="Secretaria de Educação · Uberaba Governo Municipal"></div>
    <div class="portal-auth-intro"><span class="portal-auth-kicker">Secretaria de Educação</span><h1>Portal de Sistemas Unificados.</h1><p>Acesse, de forma segura e integrada, os sistemas institucionais da Secretaria Municipal de Educação de Uberaba.</p></div>
  </section>
  <section class="portal-auth-access" aria-label="Autenticação do portal">
    <form class="portal-login" data-auth-view="login">
      <span class="auth-eyebrow">SEMED Integrado</span><h2>Acesse sua conta</h2><p>Use seu e-mail institucional e sua senha.</p>
      <label>E-mail<input name="email" type="email" autocomplete="username" required></label>
      <label>Senha<input name="password" type="password" autocomplete="current-password" required></label>
      <div class="captcha-slot" data-captcha="login"></div><div class="auth-error" role="alert"></div>
      <button type="submit">Entrar</button><button class="auth-link" type="button" data-forgot>Esqueceu sua senha?</button>
      <small class="auth-signature">Prefeitura Municipal de Uberaba · Secretaria de Educação</small>
    </form>
    <form class="portal-login" data-auth-view="recovery" hidden>
      <span class="auth-eyebrow">Segurança da conta</span><h2>Recuperar senha</h2><p>Enviaremos um link seguro para o e-mail cadastrado.</p>
      <label>E-mail<input name="email" type="email" autocomplete="email" required></label>
      <div class="captcha-slot" data-captcha="recovery"></div><div class="auth-error" role="alert"></div>
      <button type="submit">Enviar link</button><button class="auth-link" type="button" data-back-login>Voltar ao login</button>
      <small class="auth-signature">Prefeitura Municipal de Uberaba · Secretaria de Educação</small>
    </form>
    <form class="portal-login" data-auth-view="update" hidden>
      <span class="auth-eyebrow">Segurança da conta</span><h2>Definir nova senha</h2><p>Use pelo menos 8 caracteres, com letras, número e símbolo.</p>
      <label>Nova senha<input name="password" type="password" autocomplete="new-password" minlength="8" required></label>
      <label>Confirmar senha<input name="confirmation" type="password" autocomplete="new-password" minlength="8" required></label>
      <div class="auth-error" role="alert"></div><button type="submit">Atualizar senha</button>
      <small class="auth-signature">Prefeitura Municipal de Uberaba · Secretaria de Educação</small>
    </form>
  </section>`;
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
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}/.test(password)) {
    errorBox.textContent = "Use 8 caracteres com maiúscula, minúscula, número e símbolo.";
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
