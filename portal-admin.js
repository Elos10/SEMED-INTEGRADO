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
    .access-admin-shell{width:min(1280px,100%);margin:auto;background:#f5f8fe;border-radius:20px;padding:24px;color:#092766;box-shadow:0 30px 90px #00113388}
    .access-admin-head{display:flex;justify-content:space-between;gap:16px;align-items:center}.access-admin-head h2{margin:0}.access-admin button{cursor:pointer}
    .access-admin-head{position:sticky;top:-24px;z-index:5;background:#f5f8fe;padding:24px 0 14px}.access-admin-toolbar{display:grid;grid-template-columns:minmax(280px,1fr) 190px 180px auto;gap:10px;margin:16px 0}.access-admin input,.access-admin select{min-height:42px;border:1px solid #c8d6ee;border-radius:8px;padding:9px;background:#fff}
    .access-metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:10px 0 16px}.access-metric{padding:13px 15px;border:1px solid #d5e0f1;border-radius:12px;background:#fff;text-align:left;color:#092766}.access-metric:hover,.access-metric.active{border-color:#315bb4;box-shadow:0 5px 16px #173d8918;transform:translateY(-1px)}.access-metric strong{display:block;font-size:22px}.access-metric span{font-size:12px;color:#52698f}.access-metric.attention{background:#fff8e3;border-color:#f2d98b}.access-metric.danger{background:#fff0f0;border-color:#efc2c2}
    .access-table-wrap{overflow:auto;border:1px solid #d8e2f2;border-radius:12px;background:#fff}.access-admin table{width:100%;border-collapse:collapse;background:#fff}.access-admin th,.access-admin td{padding:12px;border-bottom:1px solid #e1e8f4;text-align:left;font-size:13px;vertical-align:middle}.access-admin th{position:sticky;top:0;background:#eaf0fb;z-index:2}.access-sort{border:0;background:transparent;color:#102b68;font:inherit;font-weight:800;padding:0}.access-user{min-width:210px}.access-user strong{font-size:13px}.access-user small{color:#52698f}.access-incomplete{display:inline-flex;margin-top:5px;padding:3px 7px;border-radius:999px;background:#fff2d8;color:#805b00;font-size:10px;font-weight:800}.access-profiles{display:flex;align-items:center;gap:5px;flex-wrap:wrap;max-width:390px}.access-profile-group{display:inline-flex;padding:5px 8px;border-radius:999px;background:#e8effc;color:#244887;font-size:11px;white-space:nowrap}.access-count{background:#173d89;color:#fff}.access-security{min-width:145px}.access-status{display:inline-flex;padding:5px 9px;border-radius:999px;background:#e6f5ed;color:#17623d;font-weight:800}.access-status.warning{background:#fff2d2;color:#805900}.access-status.danger{background:#fde7e7;color:#9c2626}.access-detail td{background:#f6f9fe;padding:14px 20px}.access-detail-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.access-detail-grid span{display:block;color:#617393;font-size:11px}.access-detail-grid strong{display:block;margin-top:3px}.access-pager{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px}.access-pager-actions{display:flex;gap:8px}.access-empty{text-align:center;padding:36px!important;color:#607294}
    .access-admin-form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:18px}.access-admin-form label{display:grid;gap:6px;font-size:12px;font-weight:800}
    .access-admin-wide{grid-column:1/-1}.profile-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.profile-option{display:flex!important;grid-template-columns:auto 1fr!important;align-items:start;padding:9px;border:1px solid #d6e1f2;border-radius:8px;background:#fff}
    .module-role-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.module-role{padding:10px;border:1px solid #d6e1f2;border-radius:9px;background:#fff}.module-role label{margin-top:7px}
    .permission-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:10px}.permission-option{display:flex!important;grid-template-columns:auto 1fr!important;align-items:center!important;gap:7px!important;padding:7px;border:1px solid #e0e7f3;border-radius:7px;font-weight:700!important}.permission-option input{min-height:auto!important}.access-expiry{margin-top:9px!important}
    .access-actions{display:flex;justify-content:flex-end;gap:10px}.access-primary{border:0;border-radius:8px;padding:11px 16px;background:#0758d0;color:#fff;font-weight:800}.access-secondary{border:1px solid #aabbd8;border-radius:8px;padding:10px 15px;background:#fff;color:#092766;font-weight:800}
    .access-notice{min-height:22px;color:#9b1c1c;font-weight:700}.access-pill{padding:4px 8px;border-radius:12px;background:#e4eefc}.access-pill.pending{background:#fff0c7;color:#805900}
    .access-summary{border:1px solid #b9c9e7;border-radius:12px;background:#eaf1fd;padding:14px}.access-summary h4{margin:0 0 8px}.access-summary ul{margin:0;padding-left:20px}.access-origin{display:block;margin-top:8px;color:#53698e;font-weight:500}.access-danger{background:#fde8e8!important;color:#8d1717!important}
    @media(max-width:900px){.access-admin{padding:8px}.access-admin-shell{padding:16px}.access-admin-head{top:-16px}.access-admin-toolbar{grid-template-columns:1fr 1fr}.access-admin-toolbar [data-search],.access-admin-toolbar [data-new]{grid-column:1/-1}.access-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.access-admin-form,.profile-grid,.module-role-grid{grid-template-columns:1fr}.permission-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.access-detail-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:600px){.access-admin-toolbar{grid-template-columns:1fr}.access-admin-toolbar>*{grid-column:1!important}.access-metrics{grid-template-columns:1fr 1fr}.access-admin table,.access-admin thead,.access-admin tbody{display:block}.access-admin thead{display:none}.access-admin tr[data-user-row]{display:grid;grid-template-columns:1fr auto;padding:12px;border-bottom:1px solid #dfe7f4}.access-admin tr[data-user-row] td{display:block;border:0;padding:5px 2px}.access-admin tr[data-user-row] td:nth-child(2),.access-admin tr[data-user-row] td:nth-child(3),.access-admin tr[data-user-row] td:nth-child(4){grid-column:1}.access-admin tr[data-user-row] td:last-child{grid-column:2;grid-row:1/4}.access-detail{display:block}.access-detail td{display:block}.access-detail-grid{grid-template-columns:1fr}.access-pager{align-items:flex-start;flex-direction:column}}
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
  let statusFilter = "ALL";
  let profileFilter = "ALL";
  let sortKey = "full_name";
  let sortDirection = 1;
  let page = 1;
  const pageSize = 8;

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

  function accountState(user) {
    const today = new Date().toISOString().slice(0, 10);
    const inThirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    if (user.account_status === "SUSPENDED") return { key: "SUSPENDED", label: "Suspenso", tone: "warning" };
    if (user.account_status === "INACTIVE" || user.active === false) return { key: "INACTIVE", label: "Inativo", tone: "danger" };
    if (user.access_ends_at && user.access_ends_at < today) return { key: "EXPIRED", label: "Vencido", tone: "danger" };
    if (user.access_ends_at && user.access_ends_at <= inThirtyDays) return { key: "EXPIRING", label: "Vence em breve", tone: "warning" };
    return { key: "ACTIVE", label: "Ativo", tone: "" };
  }

  function profileGroups(userId) {
    const groups = new Map();
    userProfiles(userId).forEach((profile) => {
      const group = String(profile.name || "Perfil").split(" — ")[0];
      groups.set(group, (groups.get(group) || 0) + 1);
    });
    return [...groups.entries()];
  }

  function renderList() {
    const allUsers = catalog.users || [];
    const profiles = catalog.profiles || [];
    const metrics = allUsers.reduce((result, user) => { const state = accountState(user); result[state.key] = (result[state.key] || 0) + 1; if (user.must_change_password) result.PASSWORD += 1; return result; }, { ACTIVE: 0, SUSPENDED: 0, INACTIVE: 0, EXPIRED: 0, EXPIRING: 0, PASSWORD: 0 });
    const valueFor = (user) => sortKey === "security" ? accountState(user).label : sortKey === "profiles" ? userProfiles(user.user_id).map((item) => item.name).join(" ") : sortKey === "link" ? `${user.job_title || ""} ${user.unit_name || user.area || ""}` : user[sortKey] || "";
    const users = allUsers.filter((user) => {
      const haystack = `${user.full_name} ${user.email} ${user.area || ""} ${user.unit_name || ""} ${user.job_title || ""}`.toLowerCase();
      const state = accountState(user).key;
      const statusMatches = statusFilter === "ALL" || state === statusFilter || statusFilter === "ATTENTION" && ["SUSPENDED","EXPIRING"].includes(state) || statusFilter === "BLOCKED" && ["INACTIVE","EXPIRED"].includes(state) || statusFilter === "PASSWORD" && user.must_change_password;
      return (!search || haystack.includes(search)) && statusMatches && (profileFilter === "ALL" || userProfiles(user.user_id).some((item) => item.code === profileFilter));
    }).sort((a, b) => String(valueFor(a)).localeCompare(String(valueFor(b)), "pt-BR", { sensitivity: "base" }) * sortDirection);
    const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
    page = Math.min(page, totalPages);
    const visibleUsers = users.slice((page - 1) * pageSize, page * pageSize);
    const sortButton = (key, label) => `<button class="access-sort" type="button" data-sort="${key}">${label}${sortKey === key ? (sortDirection === 1 ? " ↑" : " ↓") : " ↕"}</button>`;
    panel.querySelector("[data-content]").innerHTML = `
      <section class="access-metrics" aria-label="Indicadores de usuários"><button type="button" data-metric="ALL" class="access-metric ${statusFilter==="ALL"?"active":""}"><strong>${allUsers.length}</strong><span>Total de usuários</span></button><button type="button" data-metric="ACTIVE" class="access-metric ${statusFilter==="ACTIVE"?"active":""}"><strong>${metrics.ACTIVE}</strong><span>Ativos e vigentes</span></button><button type="button" data-metric="ATTENTION" class="access-metric attention ${statusFilter==="ATTENTION"?"active":""}"><strong>${metrics.SUSPENDED + metrics.EXPIRING}</strong><span>Suspensos ou vencendo</span></button><button type="button" data-metric="BLOCKED" class="access-metric danger ${statusFilter==="BLOCKED"?"active":""}"><strong>${metrics.INACTIVE + metrics.EXPIRED}</strong><span>Inativos ou vencidos</span></button><button type="button" data-metric="PASSWORD" class="access-metric attention ${statusFilter==="PASSWORD"?"active":""}"><strong>${metrics.PASSWORD}</strong><span>Troca de senha pendente</span></button></section>
      <div class="access-admin-toolbar"><input type="search" data-search placeholder="Pesquisar por nome, e-mail, área, unidade ou função…" value="${esc(search)}"><select data-status aria-label="Filtrar situação"><option value="ALL">Todas as situações</option>${[["ACTIVE","Ativos"],["ATTENTION","Suspensos ou vencendo"],["BLOCKED","Inativos ou vencidos"],["PASSWORD","Troca de senha pendente"],["SUSPENDED","Somente suspensos"],["EXPIRING","Somente vencendo"],["EXPIRED","Somente vencidos"],["INACTIVE","Somente inativos"]].map(([value,label])=>`<option value="${value}" ${statusFilter===value?"selected":""}>${label}</option>`).join("")}</select><select data-profile aria-label="Filtrar perfil"><option value="ALL">Todos os perfis</option>${profiles.map((profile)=>`<option value="${esc(profile.code)}" ${profileFilter===profile.code?"selected":""}>${esc(profile.name)}</option>`).join("")}</select><button class="access-primary" type="button" data-new>Novo usuário</button></div>
      <div class="access-notice" data-notice></div>
      <div class="access-table-wrap"><table><thead><tr><th>${sortButton("full_name","Usuário")}</th><th>${sortButton("link","Vínculo institucional")}</th><th>${sortButton("profiles","Acessos")}</th><th>${sortButton("security","Segurança")}</th><th>Ações</th></tr></thead><tbody>
      ${visibleUsers.length ? visibleUsers.map((user) => { const state = accountState(user); const groups = profileGroups(user.user_id); const incomplete = !user.job_title || !(user.unit_name || user.area); return `<tr data-user-row="${user.user_id}"><td class="access-user"><strong>${esc(user.full_name)}</strong><br><small>${esc(user.email)}</small>${incomplete?'<br><span class="access-incomplete">CADASTRO INCOMPLETO</span>':""}</td><td><strong>${esc(user.job_title || "Não informado")}</strong><br><small>${esc(user.unit_name || user.area || "Vínculo não informado")}</small></td><td><div class="access-profiles">${groups.slice(0,3).map(([name,count])=>`<span class="access-profile-group">${esc(name)}${count>1?` · ${count}`:""}</span>`).join("") || '<span class="access-incomplete">SEM PERFIL</span>'}${groups.length>3?`<span class="access-profile-group access-count">+${groups.length-3}</span>`:""}</div></td><td class="access-security"><span class="access-status ${state.tone}">${state.label}</span><br><small>${user.access_ends_at?`até ${esc(new Date(`${user.access_ends_at}T12:00:00`).toLocaleDateString("pt-BR"))}`:"sem expiração"}</small><br><small>${user.must_change_password?"Senha: troca pendente":"Senha: regular"}</small></td><td><button class="access-secondary" type="button" data-expand="${user.user_id}" aria-expanded="false">Detalhes</button></td></tr><tr class="access-detail" data-detail="${user.user_id}" hidden><td colspan="5"><div class="access-detail-grid"><div><span>Diretoria</span><strong>${esc(user.directorate || "Não informada")}</strong></div><div><span>Área</span><strong>${esc(user.area || "Não informada")}</strong></div><div><span>Gestor imediato</span><strong>${esc(user.manager_name || "Não informado")}</strong></div><div><span>Perfis atribuídos</span><strong>${esc(userProfiles(user.user_id).map((item)=>item.name).join(", ") || "Nenhum")}</strong></div></div><div class="access-actions"><button class="access-primary" type="button" data-edit="${user.user_id}">Editar usuário e acessos</button></div></td></tr>`; }).join("") : '<tr><td class="access-empty" colspan="5">Nenhum usuário corresponde aos filtros selecionados.</td></tr>'}
      </tbody></table></div><footer class="access-pager"><span>Exibindo ${users.length ? (page-1)*pageSize+1 : 0}–${Math.min(page*pageSize,users.length)} de ${users.length} usuários</span><div class="access-pager-actions"><button class="access-secondary" type="button" data-page="prev" ${page===1?"disabled":""}>Anterior</button><button class="access-secondary" type="button" data-page="next" ${page===totalPages?"disabled":""}>Próxima</button></div></footer>`;
    panel.querySelector("[data-search]").addEventListener("input", (event) => { search = event.target.value.trim().toLowerCase(); page=1; renderList(); const input=panel.querySelector("[data-search]"); input.focus(); input.setSelectionRange(input.value.length,input.value.length); });
    panel.querySelector("[data-status]").addEventListener("change", (event) => { statusFilter=event.target.value; page=1; renderList(); });
    panel.querySelectorAll("[data-metric]").forEach((button)=>button.addEventListener("click",()=>{ statusFilter=button.dataset.metric; page=1; renderList(); }));
    panel.querySelector("[data-profile]").addEventListener("change", (event) => { profileFilter=event.target.value; page=1; renderList(); });
    panel.querySelectorAll("[data-sort]").forEach((button)=>button.addEventListener("click",()=>{ if(sortKey===button.dataset.sort) sortDirection*=-1; else {sortKey=button.dataset.sort;sortDirection=1;} renderList(); }));
    panel.querySelectorAll("[data-page]").forEach((button)=>button.addEventListener("click",()=>{ page += button.dataset.page==="next"?1:-1; renderList(); }));
    panel.querySelectorAll("[data-expand]").forEach((button)=>button.addEventListener("click",()=>{ const detail=panel.querySelector(`[data-detail="${button.dataset.expand}"]`); detail.hidden=!detail.hidden; button.setAttribute("aria-expanded",String(!detail.hidden)); button.textContent=detail.hidden?"Detalhes":"Recolher"; }));
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
