import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";
import { createCaptcha } from "./captcha.js";
import { initPortalAdmin } from "./portal-admin.js?v=20260825-password-8-1";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const moduleByHref = {
  "./modules/avaliacoes/": "avaliacoes",
  "./modules/gestao-avaliacoes/": "avaliacoes",
  "./modules/monitor/": "monitor",
  "./modules/os-semed/": "os_semed",
  "./modules/votacao/": "votacao",
  "https://semed-comunicacao.vercel.app/?portal=integra": "comunicacao",
};

const style = document.createElement("style");
style.textContent = `
  body.portal-auth-pending{overflow:hidden}body.portal-auth-pending .systems-section{visibility:hidden}
  .portal-auth{--auth-navy:#1d376f;--auth-navy-deep:#102653;--auth-blue:#3459aa;--auth-blue-hover:#294990;--auth-page:#f1f4fa;--auth-line:#d9e1ef;--auth-muted:#526481;position:fixed;inset:0;z-index:100;display:grid;grid-template-columns:minmax(520px,58.5fr) minmax(420px,41.5fr);gap:0;padding:16px 0 16px 16px;background:var(--auth-page);overflow:auto}
  .portal-auth[hidden]{display:none}.portal-auth-brand{position:relative;min-height:calc(100vh - 32px);display:flex;flex-direction:column;align-items:center;padding:48px clamp(32px,5vw,80px) 42px;overflow:hidden;border-radius:32px;background:linear-gradient(145deg,#203b77 0%,var(--auth-navy) 52%,var(--auth-navy-deep) 100%);color:#fff}
  .portal-auth-brand-head{display:flex;align-items:center;gap:14px}.portal-auth-brand-mark{width:50px;height:50px;display:grid;place-items:center;border-radius:15px;background:#eef3ff;color:var(--auth-navy);box-shadow:0 8px 24px #07173530}.portal-auth-brand-mark svg{width:28px;height:28px;fill:none;stroke:currentColor;stroke-width:1.8}.portal-auth-brand-name strong,.portal-auth-brand-name span{display:block}.portal-auth-brand-name strong{font-size:16px}.portal-auth-brand-name span{margin-top:3px;color:#b9c9eb;font-size:13px}
  .portal-auth-intro{width:min(660px,100%);margin:auto;text-align:center}.portal-auth-kicker{display:block;margin-bottom:26px;color:#a8c3ff;font-size:13px;font-weight:900;letter-spacing:.24em;text-transform:uppercase}.portal-auth-intro h1{margin:0;color:#fff;font:800 clamp(42px,4.2vw,65px)/1.28 Inter,"Segoe UI",sans-serif;letter-spacing:-.035em}.portal-auth-intro p{max-width:610px;margin:26px auto 0;color:#ccd7ef;font-size:clamp(16px,1.2vw,20px);line-height:1.65}.portal-auth-trust{color:#adc0e6;font-size:12px;text-align:center}
  .portal-auth-access{min-height:calc(100vh - 32px);display:grid;place-items:center;padding:40px clamp(28px,6vw,100px);background:var(--auth-page)}.portal-login{width:min(430px,100%);padding:36px 32px 30px;border:1px solid #fff;border-radius:28px;background:#fff;box-shadow:0 20px 55px #10265312;color:#101a33}
  .portal-login .auth-eyebrow{display:block;margin-bottom:14px;color:#244da7;font-size:12px;font-weight:800}.portal-login h2{margin:0 0 9px;color:#101a33;font-size:31px;letter-spacing:-.025em}.portal-login p{margin:0 0 26px;color:var(--auth-muted);font-size:13px;line-height:1.55}.portal-login label{display:grid;gap:8px;margin:17px 0;color:#101a33;font-weight:800;font-size:12px}.auth-password{position:relative}.auth-password input{padding-right:48px}.auth-password-toggle{position:absolute;right:7px;bottom:6px;width:36px;height:36px;display:grid;place-items:center;border:0;border-radius:8px;background:transparent;color:#607193;cursor:pointer}.auth-password-toggle:hover{background:#eef3fb}.auth-password-toggle svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8}
  .portal-login input{width:100%;min-height:48px;border:1px solid var(--auth-line);border-radius:13px;padding:11px 13px;background:#fff;color:#101a33;font:inherit;outline:none;transition:border-color .16s,box-shadow .16s}.portal-login input:focus{border-color:var(--auth-blue);box-shadow:0 0 0 3px #3459aa1c}.portal-login button[type="submit"]{width:100%;min-height:48px;margin-top:8px;border:0;border-radius:13px;background:var(--auth-blue);color:#fff;font-weight:900;cursor:pointer;transition:transform .16s,background .16s}.portal-login button[type="submit"]:hover,.portal-login button[type="submit"]:focus-visible{transform:translateY(-1px);background:var(--auth-blue-hover);outline:3px solid #aabbe1;outline-offset:2px}
  .portal-login .auth-link{display:block;margin:14px auto 0;border:0;background:transparent;color:#244da7;font-weight:800;cursor:pointer}.portal-login .captcha-slot{display:grid;place-items:center;min-height:8px;margin:13px 0}.portal-login[hidden]{display:none}.portal-login .auth-error{min-height:20px;margin-top:7px;color:#b9323b;font-weight:700;font-size:12px}.portal-login .auth-signature{display:block;margin-top:22px;padding-top:18px;border-top:1px solid var(--auth-line);color:#7786a1;font-size:11px;text-align:center}
  .portal-user{display:flex;align-items:center;gap:12px;color:#fff;font-size:12px}.portal-user button{border:1px solid #ffffff80;border-radius:16px;padding:8px 14px;background:#ffffff14;color:#fff;font-weight:800;cursor:pointer}
  .system-card[hidden]{display:none!important}.systems-grid.filtered .system-card:nth-child(n){grid-column:auto}.systems-grid.filtered{grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}
  @media(min-width:761px) and (max-width:1050px){.portal-auth{grid-template-columns:minmax(420px,1fr) minmax(380px,.82fr)}.portal-auth-brand{padding:36px 28px}.portal-auth-intro h1{font-size:clamp(38px,5vw,50px)}.portal-auth-intro p{font-size:15px}.portal-auth-access{padding:28px}.portal-login{padding:30px 26px}}
  @media(max-width:760px){.portal-auth{display:block;padding:0}.portal-auth-brand{min-height:390px;border-radius:0 0 28px 28px;padding:28px 24px 38px}.portal-auth-brand-head{align-self:flex-start}.portal-auth-intro{margin:auto}.portal-auth-kicker{margin-bottom:14px}.portal-auth-intro h1{font-size:clamp(31px,8vw,42px)}.portal-auth-intro p{margin-top:16px;font-size:14px}.portal-auth-trust{display:none}.portal-auth-access{min-height:0;padding:32px 18px 50px}.portal-login{padding:28px 23px;border-radius:22px}}
  @media(max-height:720px) and (min-width:901px){.portal-auth-brand{padding-top:28px;padding-bottom:26px}.portal-auth-intro h1{font-size:43px}.portal-auth-intro p{margin-top:14px;font-size:15px}.portal-login{padding:26px 28px}.portal-login label{margin:11px 0}.portal-login p{margin-bottom:16px}.portal-login .auth-signature{margin-top:14px;padding-top:13px}}
`;
document.head.append(style);
document.body.classList.add("portal-auth-pending");

const overlay = document.createElement("section");
overlay.className = "portal-auth";
overlay.innerHTML = `
  <section class="portal-auth-brand" aria-label="Identidade da Secretaria Municipal de Educação">
    <div class="portal-auth-brand-head"><span class="portal-auth-brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M7 9.5A10 10 0 0 1 24.5 16 10 10 0 0 1 10 25l-5 2 1.7-5.2A10 10 0 0 1 7 9.5Z"/></svg></span><span class="portal-auth-brand-name"><strong>SEMED Integra</strong><span>Portal de Sistemas Unificados</span></span></div>
    <div class="portal-auth-intro"><span class="portal-auth-kicker">Conecte. Acompanhe. Resolva.</span><h1>Gestão educacional integrada, segura e eficiente.</h1><p>Informações, serviços e decisões da Secretaria Municipal de Educação em um único ambiente protegido.</p></div>
    <small class="portal-auth-trust">Dados protegidos por controle de acesso e rastreabilidade.</small>
  </section>
  <section class="portal-auth-access" aria-label="Autenticação do portal">
    <form class="portal-login" data-auth-view="login">
      <span class="auth-eyebrow">SEMED Integrado</span><h2>Acesse sua conta</h2><p>Use seu e-mail institucional e sua senha.</p>
      <label>E-mail<input name="email" type="email" autocomplete="username" required></label>
      <label class="auth-password">Senha<input name="password" type="password" autocomplete="current-password" required><button class="auth-password-toggle" type="button" data-toggle-password aria-label="Mostrar senha" aria-pressed="false"><svg viewBox="0 0 24 24"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg></button></label>
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
      <label class="auth-password">Nova senha<input name="password" type="password" autocomplete="new-password" minlength="8" required><button class="auth-password-toggle" type="button" data-toggle-password aria-label="Mostrar senha" aria-pressed="false"><svg viewBox="0 0 24 24"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg></button></label>
      <label class="auth-password">Confirmar senha<input name="confirmation" type="password" autocomplete="new-password" minlength="8" required><button class="auth-password-toggle" type="button" data-toggle-password aria-label="Mostrar senha" aria-pressed="false"><svg viewBox="0 0 24 24"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg></button></label>
      <div class="auth-error" role="alert"></div><button type="submit">Atualizar senha</button>
      <small class="auth-signature">Prefeitura Municipal de Uberaba · Secretaria de Educação</small>
    </form>
  </section>`;
document.body.append(overlay);

overlay.querySelectorAll("[data-toggle-password]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = button.parentElement.querySelector("input");
    const reveal = input.type === "password";
    input.type = reveal ? "text" : "password";
    button.setAttribute("aria-pressed", String(reveal));
    button.setAttribute("aria-label", reveal ? "Ocultar senha" : "Mostrar senha");
  });
});

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

function preferredName(context, session) {
  const fullName = String(context?.user?.full_name || context?.user?.name || "").trim();
  if (fullName) return fullName.split(/\s+/).slice(0, 2).join(" ");
  return String(session?.user?.email || "usuário").split("@")[0];
}

function renderUser(session, context) {
  document.querySelector(".portal-user")?.remove();
  const area = document.createElement("div");
  area.className = "portal-user";
  area.innerHTML = `<span>${session.user.email}</span><button type="button">Sair</button>`;
  area.querySelector("button").addEventListener("click", async () => { await supabase.auth.signOut(); location.reload(); });
  document.querySelector(".topbar")?.append(area);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const name = preferredName(context, session);
  const profile = context?.user?.area || context?.user?.profile_name || "Perfil institucional autenticado";
  const greetingNode = document.querySelector("#portalGreeting");
  const welcomeNode = document.querySelector("#portalWelcome");
  const profileNode = document.querySelector("#portalProfile");
  if (greetingNode) greetingNode.textContent = `${greeting}, ${name}`;
  if (welcomeNode) welcomeNode.textContent = "Escolha onde deseja trabalhar";
  if (profileNode) profileNode.textContent = `${profile} · somente os aplicativos autorizados para seu perfil são exibidos.`;
}

function initPortalInteractions() {
  const cards = [...document.querySelectorAll(".system-card")];
  const search = document.querySelector("#systemSearch");
  const empty = document.querySelector("#systemsEmpty");

  const openCard = (card) => {
    const href = card.dataset.href || card.querySelector(".access")?.getAttribute("href");
    if (href) location.assign(href);
  };

  cards.forEach((card) => {
    if (card.dataset.portalInteractive === "1") return;
    card.dataset.portalInteractive = "1";
    card.addEventListener("click", (event) => {
      if (event.target.closest("a,button,input")) return;
      openCard(card);
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openCard(card);
    });
  });

  const filterCards = () => {
    const term = String(search?.value || "").trim().toLocaleLowerCase("pt-BR");
    let visible = 0;
    cards.forEach((card) => {
      const authorized = card.dataset.authorized === "true";
      const content = `${card.dataset.systemName || ""} ${card.textContent || ""}`.toLocaleLowerCase("pt-BR");
      card.hidden = !authorized || (term && !content.includes(term));
      if (!card.hidden) visible += 1;
    });
    if (empty) empty.hidden = visible > 0;
  };

  search?.addEventListener("input", filterCards);
  filterCards();
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
    card.dataset.authorized = String(codes.has(moduleByHref[href]));
    card.hidden = card.dataset.authorized !== "true";
  });
  document.querySelector(".systems-grid")?.classList.add("filtered");
  if (!codes.size) throw new Error("Seu perfil não possui módulos autorizados.");
  renderUser(session, context);
  initPortalInteractions();
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
