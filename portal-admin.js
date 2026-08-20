const MODULE_ROLES = {
  avaliacoes: ["GESTOR SEMED", "GESTOR UNIDADE", "CONSULTA"],
  inscricoes: ["Gestor SEMED", "Gestor Unidade", "Professor", "Secretaria"],
  monitor: ["gabinete", "assessoria", "diretoria", "departamento", "secao", "servidor"],
  os_semed: ["Solicitante", "Responsável", "Gestor/Consulta"],
  votacao: ["MESARIO"],
};

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

export function initPortalAdmin({ supabase, context }) {
  if (!context?.portal_admin) return;
  const userArea = document.querySelector(".portal-user");
  if (!userArea || userArea.querySelector("[data-user-admin]")) return;

  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.dataset.userAdmin = "1";
  openButton.textContent = "Usuários e acessos";
  userArea.prepend(openButton);

  const style = document.createElement("style");
  style.textContent = `
    .access-admin{position:fixed;inset:0;z-index:200;background:#031a49cc;padding:24px;overflow:auto}.access-admin[hidden]{display:none}
    .access-admin-shell{width:min(1180px,100%);margin:auto;background:#f5f8fe;border-radius:20px;padding:24px;color:#092766;box-shadow:0 30px 90px #00113388}
    .access-admin-head{display:flex;justify-content:space-between;gap:16px;align-items:center}.access-admin-head h2{margin:0}.access-admin button{cursor:pointer}
    .access-admin-toolbar{display:flex;gap:10px;margin:20px 0}.access-admin-toolbar input{flex:1}.access-admin input,.access-admin select{min-height:42px;border:1px solid #c8d6ee;border-radius:8px;padding:9px;background:#fff}
    .access-admin table{width:100%;border-collapse:collapse;background:#fff}.access-admin th,.access-admin td{padding:11px;border-bottom:1px solid #dce5f4;text-align:left;font-size:13px}
    .access-admin-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:18px}.access-admin-form label{display:grid;gap:6px;font-size:12px;font-weight:800}
    .access-admin-wide{grid-column:1/-1}.profile-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.profile-option{display:flex!important;grid-template-columns:auto 1fr!important;align-items:start;padding:9px;border:1px solid #d6e1f2;border-radius:8px;background:#fff}
    .module-role-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.module-role{padding:10px;border:1px solid #d6e1f2;border-radius:9px;background:#fff}.module-role label{margin-top:7px}
    .access-actions{display:flex;justify-content:flex-end;gap:10px}.access-primary{border:0;border-radius:8px;padding:11px 16px;background:#0758d0;color:#fff;font-weight:800}.access-secondary{border:1px solid #aabbd8;border-radius:8px;padding:10px 15px;background:#fff;color:#092766;font-weight:800}
    .access-notice{min-height:22px;color:#9b1c1c;font-weight:700}.access-pill{padding:4px 8px;border-radius:12px;background:#e4eefc}.access-pill.pending{background:#fff0c7;color:#805900}
    @media(max-width:760px){.access-admin{padding:8px}.access-admin-form,.profile-grid,.module-role-grid{grid-template-columns:1fr}.access-admin table{display:block;overflow:auto}}
  `;
  document.head.append(style);

  const panel = document.createElement("section");
  panel.className = "access-admin";
  panel.hidden = true;
  panel.innerHTML = `<div class="access-admin-shell"><header class="access-admin-head"><div><h2>Usuários, perfis e acessos</h2><p>Administração exclusiva do usuário DETIC.</p></div><button class="access-secondary" type="button" data-close>Fechar</button></header><div data-content></div></div>`;
  document.body.append(panel);

  let catalog = null;
  let selectedUser = null;
  let search = "";

  async function invoke(body) {
    const { data, error } = await supabase.functions.invoke("manage-semed-user", { body });
    if (error) throw new Error(data?.error || error.message || "Falha no serviço de usuários.");
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async function load() {
    panel.querySelector("[data-content]").innerHTML = "<p>Carregando usuários e perfis…</p>";
    catalog = await invoke({ action: "list" });
    renderList();
  }

  function userProfiles(userId) {
    const profileIds = new Set((catalog.assignments || []).filter((item) => item.user_id === userId).map((item) => item.profile_id));
    return (catalog.profiles || []).filter((profile) => profileIds.has(profile.id));
  }

  function renderList() {
    const users = (catalog.users || []).filter((user) => !search || `${user.full_name} ${user.email}`.toLowerCase().includes(search));
    panel.querySelector("[data-content]").innerHTML = `
      <div class="access-admin-toolbar"><input type="search" data-search placeholder="Pesquisar usuário…" value="${esc(search)}"><button class="access-primary" type="button" data-new>Novo usuário</button></div>
      <div class="access-notice" data-notice></div>
      <table><thead><tr><th>Usuário</th><th>Perfis</th><th>Situação</th><th>Senha</th><th></th></tr></thead><tbody>
      ${users.map((user) => `<tr><td><strong>${esc(user.full_name)}</strong><br><small>${esc(user.email)}</small></td><td>${userProfiles(user.user_id).map((profile) => `<span class="access-pill">${esc(profile.name)}</span>`).join(" ") || "Sem perfil"}</td><td>${user.active ? "Ativo" : "Inativo"}</td><td>${user.must_change_password ? '<span class="access-pill pending">Troca obrigatória</span>' : "Regular"}</td><td><button class="access-secondary" type="button" data-edit="${user.user_id}">Editar</button></td></tr>`).join("")}
      </tbody></table>`;
    panel.querySelector("[data-search]").addEventListener("input", (event) => { search = event.target.value.trim().toLowerCase(); renderList(); });
    panel.querySelector("[data-new]").addEventListener("click", () => renderForm(null));
    panel.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => renderForm(catalog.users.find((user) => user.user_id === button.dataset.edit))));
  }

  function renderForm(user) {
    selectedUser = user;
    const assigned = new Set(user ? userProfiles(user.user_id).map((profile) => profile.code) : []);
    const roleByModule = new Map((catalog.moduleRoles || []).filter((item) => item.user_id === user?.user_id).map((item) => [item.module_id, item]));
    const isDetic = user?.email?.toLowerCase() === "detic@uberabadigital.com.br";
    panel.querySelector("[data-content]").innerHTML = `
      <form class="access-admin-form" data-form>
        <h3 class="access-admin-wide">${user ? "Editar usuário" : "Cadastrar usuário"}</h3>
        <label>Nome completo<input name="fullName" value="${esc(user?.full_name)}" required></label>
        <label>E-mail institucional<input name="email" type="email" value="${esc(user?.email)}" ${isDetic ? "readonly" : ""} required></label>
        <label>Senha temporária<input name="temporaryPassword" type="password" autocomplete="new-password" minlength="12" ${user ? 'placeholder="Deixe vazio para manter a senha"' : "required"}><small>Ao receber uma senha temporária, o usuário deverá trocá-la no primeiro acesso.</small></label>
        <label>Situação<select name="active" ${isDetic ? "disabled" : ""}><option value="true" ${user?.active !== false ? "selected" : ""}>Ativo</option><option value="false" ${user?.active === false ? "selected" : ""}>Inativo</option></select></label>
        <fieldset class="access-admin-wide"><legend>Perfis corporativos</legend><div class="profile-grid">
          ${(catalog.profiles || []).map((profile) => {
            const protectedAdmin = profile.code === "ADMIN_GERAL" && !isDetic;
            return `<label class="profile-option"><input type="checkbox" name="profiles" value="${profile.code}" ${assigned.has(profile.code) || (!user && false) ? "checked" : ""} ${protectedAdmin ? "disabled" : ""}><span><strong>${esc(profile.name)}</strong><br><small>${esc(profile.description)}</small></span></label>`;
          }).join("")}
        </div></fieldset>
        <fieldset class="access-admin-wide"><legend>Papel e campo de atuação em cada sistema</legend><div class="module-role-grid">
          ${(catalog.modules || []).map((module) => {
            const current = roleByModule.get(module.id);
            const roles = MODULE_ROLES[module.code] || [];
            const scopeValue = current?.scope?.unit_id || current?.scope?.unit_name || "";
            return `<div class="module-role"><strong>${esc(module.name)}</strong><label>Papel local<select name="role:${module.code}"><option value="">Automático/sem vínculo</option>${roles.map((role) => `<option value="${esc(role)}" ${current?.role_code === role ? "selected" : ""}>${esc(role)}</option>`).join("")}</select></label><label>Unidade/área de atuação<input name="scope:${module.code}" value="${esc(scopeValue)}" placeholder="Opcional"></label></div>`;
          }).join("")}
        </div></fieldset>
        <div class="access-notice access-admin-wide" data-notice></div>
        <div class="access-actions access-admin-wide"><button class="access-secondary" type="button" data-cancel>Cancelar</button><button class="access-primary" type="submit">Salvar usuário e acessos</button></div>
      </form>`;
    const form = panel.querySelector("[data-form]");
    form.querySelector("[data-cancel]").addEventListener("click", renderList);
    form.addEventListener("submit", save);
  }

  async function save(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const notice = form.querySelector("[data-notice]");
    const values = new FormData(form);
    const moduleRoles = {};
    for (const module of catalog.modules || []) {
      const roleCode = String(values.get(`role:${module.code}`) || "");
      const scopeValue = String(values.get(`scope:${module.code}`) || "").trim();
      if (roleCode) moduleRoles[module.code] = {
        roleCode,
        scope: module.code === "votacao" ? { unit_id: scopeValue || null }
          : module.code === "os_semed" ? { unit_name: scopeValue }
          : module.code === "avaliacoes" ? { unidade: scopeValue }
          : module.code === "inscricoes" ? { unit_id: scopeValue }
          : scopeValue ? { area: scopeValue } : {},
      };
    }
    const payload = {
      action: "save", uid: selectedUser?.user_id,
      fullName: String(values.get("fullName") || "").trim(),
      email: String(values.get("email") || "").trim().toLowerCase(),
      temporaryPassword: String(values.get("temporaryPassword") || ""),
      active: selectedUser?.email?.toLowerCase() === "detic@uberabadigital.com.br" ? true : values.get("active") === "true",
      profileCodes: values.getAll("profiles"),
      moduleRoles,
    };
    notice.textContent = "Salvando…";
    try {
      await invoke(payload);
      catalog = await invoke({ action: "list" });
      selectedUser = null;
      renderList();
      panel.querySelector("[data-notice]").textContent = "Usuário e acessos atualizados.";
    } catch (error) {
      notice.textContent = error.message || "Não foi possível salvar.";
    }
  }

  openButton.addEventListener("click", async () => {
    panel.hidden = false;
    try { await load(); } catch (error) { panel.querySelector("[data-content]").innerHTML = `<p class="access-notice">${esc(error.message)}</p>`; }
  });
  panel.querySelector("[data-close]").addEventListener("click", () => { panel.hidden = true; });
}
