const MODULE_ROLES = {
  avaliacoes: ["ADMINISTRADOR", "GESTOR DA REDE", "GESTOR DE UNIDADE", "PROFESSOR", "OPERADOR", "CONSULTA"],
  monitor: ["administrador", "gabinete", "assessoria", "diretoria", "departamento", "secao", "servidor"],
  comunicacao: ["administrador", "gestor", "emissor", "destinatario", "auditoria", "publicador"],
  votacao: ["MESARIO"],
};

const SCOPE_MODES = [
  ["ALL", "Todo o sistema"], ["DIRECTORATE", "Somente a diretoria"], ["AREA", "Somente a área"],
  ["UNIT", "Somente a unidade"], ["TEAM", "Minha equipe"], ["OWN", "Somente registros próprios"],
  ["ASSIGNED", "Somente itens direcionados"], ["READ_ONLY", "Consulta no escopo informado"],
];

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const STRONG_PASSWORD = /(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}/;
const USER_AREAS = ["Gestão SEMED", "Diretoria de Ensino", "Diretoria de Apoio à Educação Básica", "Diretoria de Logística", "Diretoria de Planejamento Gestão e Finanças", "Arte e Cultura", "Formação - Casa do Educador", "Formação - Polo UAB", "Inclusão", "Infraestrutura", "Planejamento Financeiro", "Tecnologia", "Transporte"];

async function functionErrorMessage(error, data) {
  if (data?.error) return data.error;
  const response = error?.context;
  if (response && typeof response.clone === "function") {
    try {
      const body = await response.clone().json();
      if (body?.error) return body.error;
    } catch {
      try {
        const body = await response.clone().text();
        if (body) return body;
      } catch { /* resposta sem corpo legível */ }
    }
  }
  return error?.message || "Falha no serviço de usuários.";
}

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
    .access-admin-form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:18px}.access-admin-form label{display:grid;gap:6px;font-size:12px;font-weight:800}
    .access-admin-wide{grid-column:1/-1}.profile-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.profile-option{display:flex!important;grid-template-columns:auto 1fr!important;align-items:start;padding:9px;border:1px solid #d6e1f2;border-radius:8px;background:#fff}
    .module-role-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.module-role{padding:10px;border:1px solid #d6e1f2;border-radius:9px;background:#fff}.module-role label{margin-top:7px}
    .permission-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:10px}.permission-option{display:flex!important;grid-template-columns:auto 1fr!important;align-items:center!important;gap:7px!important;padding:7px;border:1px solid #e0e7f3;border-radius:7px;font-weight:700!important}.permission-option input{min-height:auto!important}.access-expiry{margin-top:9px!important}
    .access-actions{display:flex;justify-content:flex-end;gap:10px}.access-primary{border:0;border-radius:8px;padding:11px 16px;background:#0758d0;color:#fff;font-weight:800}.access-secondary{border:1px solid #aabbd8;border-radius:8px;padding:10px 15px;background:#fff;color:#092766;font-weight:800}
    .access-notice{min-height:22px;color:#9b1c1c;font-weight:700}.access-pill{padding:4px 8px;border-radius:12px;background:#e4eefc}.access-pill.pending{background:#fff0c7;color:#805900}
    .access-summary{border:1px solid #b9c9e7;border-radius:12px;background:#eaf1fd;padding:14px}.access-summary h4{margin:0 0 8px}.access-summary ul{margin:0;padding-left:20px}.access-origin{display:block;margin-top:8px;color:#53698e;font-weight:500}.access-danger{background:#fde8e8!important;color:#8d1717!important}
    @media(max-width:760px){.access-admin{padding:8px}.access-admin-form,.profile-grid,.module-role-grid{grid-template-columns:1fr}.permission-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.access-admin table{display:block;overflow:auto}}
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
    if (error) throw new Error(await functionErrorMessage(error, data));
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
    const users = (catalog.users || []).filter((user) => !search || `${user.full_name} ${user.email} ${user.area || ""}`.toLowerCase().includes(search));
    panel.querySelector("[data-content]").innerHTML = `
      <div class="access-admin-toolbar"><input type="search" data-search placeholder="Pesquisar usuário…" value="${esc(search)}"><button class="access-primary" type="button" data-new>Novo usuário</button></div>
      <div class="access-notice" data-notice></div>
      <table><thead><tr><th>Usuário</th><th>Vínculo</th><th>Perfis</th><th>Situação/Vigência</th><th>Senha</th><th></th></tr></thead><tbody>
      ${users.map((user) => `<tr><td><strong>${esc(user.full_name)}</strong><br><small>${esc(user.email)}</small></td><td>${esc(user.job_title || "Função não informada")}<br><small>${esc(user.unit_name || user.area || "Vínculo não informado")}</small></td><td>${userProfiles(user.user_id).map((profile) => `<span class="access-pill">${esc(profile.name)}</span>`).join(" ") || "Sem perfil"}</td><td><span class="access-pill ${user.account_status !== "ACTIVE" ? "access-danger" : ""}">${esc(({ACTIVE:"Ativo",SUSPENDED:"Suspenso",INACTIVE:"Inativo"})[user.account_status] || (user.active ? "Ativo" : "Inativo"))}</span><br><small>${user.access_ends_at ? `até ${esc(new Date(`${user.access_ends_at}T12:00:00`).toLocaleDateString("pt-BR"))}` : "sem expiração global"}</small></td><td>${user.must_change_password ? '<span class="access-pill pending">Troca obrigatória</span>' : "Regular"}</td><td><button class="access-secondary" type="button" data-edit="${user.user_id}">Editar</button></td></tr>`).join("")}
      </tbody></table>`;
    panel.querySelector("[data-search]").addEventListener("input", (event) => { search = event.target.value.trim().toLowerCase(); renderList(); });
    panel.querySelector("[data-new]").addEventListener("click", () => renderForm(null));
    panel.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => renderForm(catalog.users.find((user) => user.user_id === button.dataset.edit))));
  }

  function renderForm(user) {
    selectedUser = user;
    const assigned = new Set(user ? userProfiles(user.user_id).map((profile) => profile.code) : []);
    const assignedProfileIds = new Set(user ? userProfiles(user.user_id).map((profile) => profile.id) : []);
    const roleByModule = new Map((catalog.moduleRoles || []).filter((item) => item.user_id === user?.user_id).map((item) => [item.module_id, item]));
    const overrideByModule = new Map((catalog.accessOverrides || []).filter((item) => item.user_id === user?.user_id).map((item) => [item.module_id, item]));
    const isDetic = user?.email?.toLowerCase() === "detic@uberabadigital.com.br";
    panel.querySelector("[data-content]").innerHTML = `
      <form class="access-admin-form" data-form>
        <h3 class="access-admin-wide">${user ? "Editar usuário" : "Cadastrar usuário"}</h3>
        <label>Nome completo<input name="fullName" value="${esc(user?.full_name)}" required></label>
        <label>E-mail institucional<input name="email" type="email" value="${esc(user?.email)}" ${isDetic ? "readonly" : ""} required></label>
        <label>Área de atuação<select name="area" required><option value="">Selecione a área</option>${USER_AREAS.map((area) => `<option value="${esc(area)}" ${user?.area === area ? "selected" : ""}>${esc(area)}</option>`).join("")}</select><small>Área institucional utilizada também no módulo Monitoramento.</small></label>
        <label>Diretoria<input name="directorate" value="${esc(user?.directorate)}" placeholder="Diretoria responsável"></label>
        <label>Unidade/estabelecimento<input name="unitName" value="${esc(user?.unit_name)}" placeholder="Unidade de lotação"></label>
        <label>Cargo ou função<input name="jobTitle" value="${esc(user?.job_title)}" placeholder="Função exercida"></label>
        <label>Gestor imediato<input name="managerName" value="${esc(user?.manager_name)}" placeholder="Responsável pela equipe"></label>
        <label>Senha temporária<input name="temporaryPassword" type="password" autocomplete="new-password" minlength="8" pattern="(?=.*[A-Za-z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}" title="Use no mínimo 8 caracteres, com letra, número e símbolo." ${user ? 'placeholder="Deixe vazio para manter a senha"' : "required"}><small>Mínimo de 8 caracteres, com letra, número e símbolo. O usuário deverá trocá-la no primeiro acesso.</small></label>
        <label>Situação da conta<select name="accountStatus" ${isDetic ? "disabled" : ""}><option value="ACTIVE" ${!user || user?.account_status === "ACTIVE" || (!user?.account_status && user?.active) ? "selected" : ""}>Ativa</option><option value="SUSPENDED" ${user?.account_status === "SUSPENDED" ? "selected" : ""}>Suspensa temporariamente</option><option value="INACTIVE" ${user?.account_status === "INACTIVE" || user?.active === false ? "selected" : ""}>Inativa</option></select></label>
        <label>Início da vigência<input name="accessStartsAt" type="date" value="${esc(user?.access_starts_at || "")}"></label>
        <label>Fim da vigência<input name="accessEndsAt" type="date" value="${esc(user?.access_ends_at || "")}"><small>Ao vencer, o portal bloqueia os sistemas automaticamente.</small></label>
        <fieldset class="access-admin-wide"><legend>Perfis corporativos</legend><div class="profile-grid">
          ${(catalog.profiles || []).map((profile) => {
            const protectedAdmin = profile.code === "ADMIN_GERAL" && !isDetic;
            return `<label class="profile-option"><input type="checkbox" name="profiles" value="${profile.code}" ${assigned.has(profile.code) || (!user && false) ? "checked" : ""} ${protectedAdmin ? "disabled" : ""}><span><strong>${esc(profile.name)}</strong><br><small>${esc(profile.description)}</small></span></label>`;
          }).join("")}
        </div></fieldset>
        <fieldset class="access-admin-wide"><legend>Papel e campo de atuação em cada sistema</legend><div class="module-role-grid">
          ${(catalog.modules || []).map((module) => {
            const current = roleByModule.get(module.id);
            const override = overrideByModule.get(module.id);
            const roles = MODULE_ROLES[module.code] || [];
            const scope = override?.scope || current?.scope || {};
            const scopeValue = scope.value || scope.unit_id || scope.unidade || scope.area || "";
            const scopeMode = scope.mode || (scope.unit_id || scope.unidade ? "UNIT" : scope.area ? "AREA" : "ALL");
            const baseline = (catalog.profilePermissions || []).filter((permission) => permission.module_id === module.id && assignedProfileIds.has(permission.profile_id));
            const allowed = (key) => override && typeof override[key] === "boolean" ? override[key] : baseline.some((permission) => permission[key]);
            const permissionOptions = [["can_view","Acessar"],["can_create","Criar"],["can_edit","Editar"],["can_delete","Excluir"],["can_approve","Aprovar/publicar"],["can_assign","Direcionar"],["can_export","Exportar"],["can_view_sensitive","Ver dados sensíveis"],["can_admin","Administrar"]];
            const expiry = override?.expires_at ? String(override.expires_at).slice(0,10) : "";
            const profileNames = baseline.map((permission) => catalog.profiles.find((profile) => profile.id === permission.profile_id)?.name).filter(Boolean).join(", ");
            const governance = module.code === "votacao" ? '<small>As regras existentes da Urna Eletrônica foram preservadas.</small>' : `<div class="permission-grid">${permissionOptions.map(([key,label]) => `<label class="permission-option"><input type="checkbox" name="access:${module.code}:${key}" ${allowed(key)?"checked":""}><span>${label}</span></label>`).join("")}</div><label class="access-expiry">Expiração do acesso<input type="date" name="expires:${module.code}" value="${esc(expiry)}"><small>Opcional para acessos temporários.</small></label><small class="access-origin">Origem atual: ${esc(profileNames || "nenhum perfil com acesso")}${override ? " + ajuste individual" : ""}.</small>`;
            return `<div class="module-role" data-module-card="${esc(module.code)}"><strong>${esc(module.name)}</strong><label>Papel funcional<select name="role:${module.code}"><option value="">Automático/sem vínculo</option>${roles.map((role) => `<option value="${esc(role)}" ${current?.role_code === role ? "selected" : ""}>${esc(role)}</option>`).join("")}</select></label><label>Alcance dos dados<select name="scopeMode:${module.code}">${SCOPE_MODES.map(([value,label]) => `<option value="${value}" ${scopeMode === value ? "selected" : ""}>${label}</option>`).join("")}</select></label><label>Referência do alcance<input name="scope:${module.code}" value="${esc(scopeValue)}" placeholder="Nome da diretoria, área ou unidade"></label>${governance}</div>`;
          }).join("")}
        </div></fieldset>
        <section class="access-summary access-admin-wide" data-access-summary><h4>Resumo efetivo do acesso</h4><p>Selecione os perfis e permissões para visualizar a conferência.</p></section>
        <div class="access-notice access-admin-wide" data-notice></div>
        <div class="access-actions access-admin-wide"><button class="access-secondary" type="button" data-cancel>Cancelar</button><button class="access-primary" type="submit">Salvar usuário e acessos</button></div>
      </form>`;
    const form = panel.querySelector("[data-form]");
    form.querySelector("[data-cancel]").addEventListener("click", renderList);
    form.addEventListener("change", () => updateAccessSummary(form));
    updateAccessSummary(form);
    form.addEventListener("submit", save);
  }

  function updateAccessSummary(form) {
    const items = (catalog.modules || []).filter((module) => form.elements[`access:${module.code}:can_view`]?.checked || module.code === "votacao" && form.elements[`role:${module.code}`]?.value).map((module) => {
      const permissions = [["can_create","criar"],["can_edit","editar"],["can_delete","excluir"],["can_approve","aprovar/publicar"],["can_assign","direcionar"],["can_export","exportar"],["can_view_sensitive","ver dados sensíveis"],["can_admin","administrar"]].filter(([key]) => form.elements[`access:${module.code}:${key}`]?.checked).map(([,label]) => label);
      const scopeLabel = SCOPE_MODES.find(([value]) => value === form.elements[`scopeMode:${module.code}`]?.value)?.[1] || "escopo próprio";
      return `<li><strong>${esc(module.name)}</strong>: ${esc(permissions.length ? permissions.join(", ") : "somente consultar")} · ${esc(scopeLabel.toLowerCase())}</li>`;
    });
    form.querySelector("[data-access-summary]").innerHTML = `<h4>Resumo efetivo do acesso</h4>${items.length ? `<ul>${items.join("")}</ul>` : "<p>Nenhum sistema foi liberado pelas opções atuais.</p>"}`;
  }

  async function save(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const notice = form.querySelector("[data-notice]");
    const values = new FormData(form);
    const moduleRoles = {};
    const accessOverrides = {};
    for (const module of catalog.modules || []) {
      const roleCode = String(values.get(`role:${module.code}`) || "");
      const scopeValue = String(values.get(`scope:${module.code}`) || "").trim();
      const scopeMode = String(values.get(`scopeMode:${module.code}`) || "ALL");
      const scope = { mode: scopeMode, value: scopeValue || null };
      if (roleCode) moduleRoles[module.code] = {
        roleCode,
        scope: module.code === "votacao" ? { unit_id: scopeValue || null } : scope,
      };
      if (module.code !== "votacao") accessOverrides[module.code] = {
        can_view: values.get(`access:${module.code}:can_view`) === "on",
        can_create: values.get(`access:${module.code}:can_create`) === "on",
        can_edit: values.get(`access:${module.code}:can_edit`) === "on",
        can_delete: values.get(`access:${module.code}:can_delete`) === "on",
        can_approve: values.get(`access:${module.code}:can_approve`) === "on",
        can_assign: values.get(`access:${module.code}:can_assign`) === "on",
        can_export: values.get(`access:${module.code}:can_export`) === "on",
        can_view_sensitive: values.get(`access:${module.code}:can_view_sensitive`) === "on",
        can_admin: values.get(`access:${module.code}:can_admin`) === "on",
        scope,
        expiresAt: String(values.get(`expires:${module.code}`) || "") || null,
      };
    }
    const payload = {
      action: "save", uid: selectedUser?.user_id,
      fullName: String(values.get("fullName") || "").trim(),
      email: String(values.get("email") || "").trim().toLowerCase(),
      area: String(values.get("area") || "").trim(),
      directorate: String(values.get("directorate") || "").trim(),
      unitName: String(values.get("unitName") || "").trim(),
      jobTitle: String(values.get("jobTitle") || "").trim(),
      managerName: String(values.get("managerName") || "").trim(),
      accountStatus: selectedUser?.email?.toLowerCase() === "detic@uberabadigital.com.br" ? "ACTIVE" : String(values.get("accountStatus") || "ACTIVE"),
      accessStartsAt: String(values.get("accessStartsAt") || "") || null,
      accessEndsAt: String(values.get("accessEndsAt") || "") || null,
      temporaryPassword: String(values.get("temporaryPassword") || ""),
      active: selectedUser?.email?.toLowerCase() === "detic@uberabadigital.com.br" ? true : values.get("accountStatus") === "ACTIVE",
      profileCodes: values.getAll("profiles"),
      moduleRoles,
      accessOverrides,
    };
    if (!payload.profileCodes.length) {
      notice.textContent = "Selecione ao menos um perfil corporativo.";
      return;
    }
    if ((!selectedUser || payload.temporaryPassword) && !STRONG_PASSWORD.test(payload.temporaryPassword)) {
      notice.textContent = "A senha temporária deve ter ao menos 8 caracteres, incluindo letra, número e símbolo.";
      return;
    }
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    notice.textContent = "Salvando…";
    try {
      await invoke(payload);
      catalog = await invoke({ action: "list" });
      selectedUser = null;
      renderList();
      panel.querySelector("[data-notice]").textContent = "Usuário e acessos atualizados.";
    } catch (error) {
      notice.textContent = error.message || "Não foi possível salvar.";
    } finally {
      submitButton.disabled = false;
    }
  }

  openButton.addEventListener("click", async () => {
    panel.hidden = false;
    try { await load(); } catch (error) { panel.querySelector("[data-content]").innerHTML = `<p class="access-notice">${esc(error.message)}</p>`; }
  });
  panel.querySelector("[data-close]").addEventListener("click", () => { panel.hidden = true; });
}
