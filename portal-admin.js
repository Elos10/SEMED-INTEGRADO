const MODULE_ROLES = {
  avaliacoes: ["ADMINISTRADOR", "GESTOR DA REDE", "GESTOR DE UNIDADE", "PROFESSOR", "OPERADOR", "CONSULTA"],
  monitor: ["administrador", "gabinete", "assessoria", "diretoria", "departamento", "secao", "servidor"],
  comunicacao: ["administrador", "gestor", "emissor", "destinatario", "auditoria", "publicador"],
  incidentes: ["REGISTRADOR", "GESTOR DE UNIDADE", "GESTÃO CENTRAL", "ADMINISTRADOR"],
  votacao: ["MESARIO"],
};

const SCOPE_MODES = [
  ["ALL", "Todo o sistema"], ["DIRECTORATE", "Somente a diretoria"], ["AREA", "Somente a área"],
  ["UNIT", "Somente a unidade"], ["TEAM", "Minha equipe"], ["OWN", "Somente registros próprios"],
  ["ASSIGNED", "Somente itens direcionados"], ["READ_ONLY", "Consulta no escopo informado"],
];

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const STRONG_PASSWORD = /(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}/;
const INSTITUTIONAL_STRUCTURE = {
  "Gabinete": ["GABINETE DO(A) SECRETÁRIO(A)", "SECRETÁRIO(A) ADJUNTO(A)", "ASSESSORIA DE COMUNICAÇÃO", "ASSESSORIA JURÍDICA", "NÚCLEOS DE TRABALHO"],
  "Diretoria de Ensino": ["DIRETORIA DE ENSINO", "DEPARTAMENTO DE EDUCAÇÃO FÍSICA ESCOLAR", "DEPARTAMENTO DE EDUCAÇÃO INFANTIL", "DEPARTAMENTO DE EDUCAÇÃO TECNOLÓGICA", "DEPARTAMENTO DE ENSINO FUNDAMENTAL", "DEPARTAMENTO DE INSPEÇÃO ESCOLAR", "DEPARTAMENTO DE FORMAÇÃO PROFISSIONAL", "SEÇÃO DE MANUTENÇÃO DE COMPUTADORES", "SEÇÃO DE PARADESPORTO EDUCACIONAL", "CASA DO EDUCADOR", "POLO UAB"],
  "Diretoria de Apoio à Educação Básica": ["DIRETORIA DE APOIO À EDUCAÇÃO BÁSICA", "DEPARTAMENTO DE ARTE E CULTURA", "DEPARTAMENTO DE BIBLIOTECAS", "DEPARTAMENTO DE EDUCAÇÃO INCLUSIVA", "CEMEA ABADIA", "CEU DAS ARTES", "SEÇÃO DE ASSISTÊNCIA AO EDUCANDO", "SEÇÃO DE ATENDIMENTO ESPECIALIZADO", "SEÇÃO DE BIBLIOTECAS ESCOLARES", "SEÇÃO DE REFERÊNCIA, PROCESSAMENTO TÉCNICO E DESENVOLVIMENTO DE ACERVOS"],
  "Diretoria de Logística": ["DIRETORIA DE LOGÍSTICA", "DEPARTAMENTO DE GESTÃO DE PESSOAL", "DEPARTAMENTO DE MANUTENÇÃO E INFRAESTRUTURA ESCOLAR", "DEPARTAMENTO DE TRANSPORTE", "SEÇÃO DE ALIMENTAÇÃO ESCOLAR", "SEÇÃO DE PATRIMÔNIO", "SEÇÃO DE PROVIMENTO DE PESSOAL", "SEÇÃO DE ACOMPANHAMENTO E SUPORTE DE PESSOAL", "SEÇÃO DE TRANSPORTE ESCOLAR URBANO"],
  "Diretoria de Planejamento, Gestão e Finanças": ["DIRETORIA DE PLANEJAMENTO, GESTÃO E FINANÇAS", "DEPARTAMENTO DE PLANEJAMENTO, GESTÃO, PROJETOS E CONVÊNIOS", "DEPARTAMENTO DE PROJETOS ESPECIAIS", "SEÇÃO DE CONTROLE DE CONTRATOS", "SEÇÃO DE CONVÊNIOS E RECURSOS", "SEÇÃO DE PLANEJAMENTO FINANCEIRO E ORÇAMENTÁRIO", "SEÇÃO DE MONITORAMENTO DE PROCESSOS LICITATÓRIOS"],
};
const USER_AREAS = Object.keys(INSTITUTIONAL_STRUCTURE);
const JOB_TITLES = ["Secretário(a)", "Secretário(a) Adjunto(a)", "Assessor(a)", "Diretor(a) de Diretoria", "Chefe de Departamento", "Chefe de Seção", "Diretor(a) de Unidade", "Vice-Diretor(a) de Unidade", "Coordenador(a) Pedagógico(a)", "Administrativo"];
const LEGACY_AREA_MAP = { "Gestão SEMED": "Gabinete", "Arte e Cultura": "Diretoria de Apoio à Educação Básica", "Formação - Casa do Educador": "Diretoria de Ensino", "Formação - Polo UAB": "Diretoria de Ensino", "Inclusão": "Diretoria de Apoio à Educação Básica", "Infraestrutura": "Diretoria de Logística", "Planejamento Financeiro": "Diretoria de Planejamento, Gestão e Finanças", "Tecnologia": "Diretoria de Ensino", "Transporte": "Diretoria de Logística", "Diretoria de Planejamento Gestão e Finanças": "Diretoria de Planejamento, Gestão e Finanças" };
const normalizedArea = (value) => USER_AREAS.includes(value) ? value : LEGACY_AREA_MAP[value] || "";
const ACCESS_KITS = [
  { code: "PROFESSOR_UNIDADE", name: "Professor de unidade", description: "Avaliações somente no contexto da unidade vinculada.", profiles: ["AVALIACOES_PROFESSOR"], roles: { avaliacoes: "PROFESSOR" }, scope: "UNIT" },
  { code: "GESTOR_UNIDADE", name: "Gestor de unidade", description: "Avaliações e Monitoramento limitados à unidade de lotação.", profiles: ["AVALIACOES_GESTOR_UNIDADE", "MONITOR_GESTOR_AREA"], roles: { avaliacoes: "GESTOR DE UNIDADE", monitor: "diretoria" }, scope: "UNIT" },
  { code: "RESPONSAVEL_ETAPAS", name: "Responsável por etapas", description: "Movimenta somente itens que estejam sob sua responsabilidade.", profiles: ["MONITOR_RESPONSAVEL"], roles: { monitor: "servidor" }, scope: "ASSIGNED" },
  { code: "FINANCEIRO", name: "Execução financeira", description: "Consulta e registra informações financeiras autorizadas.", profiles: ["MONITOR_FINANCEIRO"], roles: { monitor: "assessoria" }, scope: "AREA" },
  { code: "COMUNICADOR", name: "Comunicador institucional", description: "Cria, encaminha e acompanha comunicações da área.", profiles: ["COMUNICACAO_EMISSOR"], roles: { comunicacao: "emissor" }, scope: "AREA" },
  { code: "PUBLICADOR", name: "Publicador institucional", description: "Revisa, aprova e publica comunicações autorizadas.", profiles: ["COMUNICACAO_PUBLICADOR"], roles: { comunicacao: "publicador" }, scope: "ALL" },
  { code: "AUDITOR", name: "Auditoria", description: "Consulta histórico e exporta dados sem alterar registros.", profiles: ["COMUNICACAO_AUDITOR"], roles: { comunicacao: "auditoria" }, scope: "READ_ONLY" },
  { code: "INCIDENTE_UNIDADE", name: "Incidentes da unidade", description: "Registra, encaminha e acompanha incidentes da unidade vinculada.", profiles: ["INCIDENTE_UNIDADE"], roles: { incidentes: "GESTOR DE UNIDADE" }, scope: "UNIT" },
  { code: "INCIDENTE_CENTRAL", name: "Gestão central de incidentes", description: "Acompanha todas as unidades, relatórios e reclassificações protegidas.", profiles: ["INCIDENTE_CENTRAL"], roles: { incidentes: "GESTÃO CENTRAL" }, scope: "ALL" },
  { code: "TEMPORARIO", name: "Acesso temporário", description: "Modelo sem sistemas pré-liberados e com vigência obrigatória.", profiles: [], roles: {}, scope: "OWN", temporary: true },
];

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
    .access-admin-form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:18px}.access-admin-form label{display:grid;gap:6px;font-size:12px;font-weight:800}.access-admin-form label small{color:#607294;font-weight:600;line-height:1.35}.access-admin-form input[list]{padding-right:34px}.access-field-valid{color:#17623d!important}.access-field-invalid{color:#9b1c1c!important}
    .access-admin-wide{grid-column:1/-1}.profile-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.profile-option{display:flex!important;grid-template-columns:auto 1fr!important;align-items:start;padding:9px;border:1px solid #d6e1f2;border-radius:8px;background:#fff}
    .module-role-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.module-role{padding:10px;border:1px solid #d6e1f2;border-radius:9px;background:#fff}.module-role label{margin-top:7px}
    .permission-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:10px}.permission-option{display:flex!important;grid-template-columns:auto 1fr!important;align-items:center!important;gap:7px!important;padding:7px;border:1px solid #e0e7f3;border-radius:7px;font-weight:700!important}.permission-option input{min-height:auto!important}.access-expiry{margin-top:9px!important}
    .access-actions{display:flex;justify-content:flex-end;gap:10px}.access-primary{border:0;border-radius:8px;padding:11px 16px;background:#0758d0;color:#fff;font-weight:800}.access-secondary{border:1px solid #aabbd8;border-radius:8px;padding:10px 15px;background:#fff;color:#092766;font-weight:800}
    .access-notice{min-height:22px;color:#9b1c1c;font-weight:700}.access-pill{padding:4px 8px;border-radius:12px;background:#e4eefc}.access-pill.pending{background:#fff0c7;color:#805900}
    .access-summary{border:1px solid #b9c9e7;border-radius:12px;background:#eaf1fd;padding:14px}.access-summary h4{margin:0 0 8px}.access-summary ul{margin:0;padding-left:20px}.access-origin{display:block;margin-top:8px;color:#53698e;font-weight:500}.access-danger{background:#fde8e8!important;color:#8d1717!important}
    .access-progress-copy{grid-column:1/-1;color:#334d78;font-size:12px;font-weight:800}.access-wizard{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:-4px 0 7px}.access-step{display:flex;align-items:center;gap:9px;min-width:0;border:0;border-radius:999px;background:#edf1f7;padding:10px 14px;text-align:left;color:#5d687b;font-weight:800;transition:.16s}.access-step span{flex:0 0 auto;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#f8faff;color:#59667d;font-size:11px}.access-step:hover{background:#e3e9f3}.access-step.active{background:#e6ebfb;color:#1e3a8a;box-shadow:inset 0 0 0 1px #cad5f7}.access-step.active span,.access-step.done span{background:#263f91;color:#fff}.access-step.done span{font-size:0}.access-step.done span:after{content:'✓';font-size:12px}.access-step-panel{display:none;grid-column:1/-1;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;animation:access-step-in .18s ease}.access-step-panel.active{display:grid}@keyframes access-step-in{from{opacity:.35;transform:translateY(4px)}}.access-section-intro{grid-column:1/-1;margin:0;padding:15px 17px;border:1px solid #dbe4f3;border-radius:15px;background:#fff}.access-section-intro h3{margin:0 0 4px}.access-section-intro p{margin:0;color:#52698f;font-size:13px}.access-kit-grid{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.access-kit{border:1px solid #d4deef;border-radius:15px;background:#fff;padding:14px;text-align:left;color:#17346e}.access-kit:hover,.access-kit.selected{border-color:#315bb4;background:#edf3ff;box-shadow:0 5px 15px #173d8918}.access-kit strong{display:block}.access-kit small{display:block;margin-top:5px;color:#607294;line-height:1.4}.access-kit-note{grid-column:1/-1;padding:11px 13px;border-radius:10px;background:#fff7dc;color:#715400;font-size:12px}.access-module-title{display:flex;align-items:center;justify-content:space-between;gap:8px}.access-module-state{padding:4px 8px;border-radius:999px;background:#e8f5ed;color:#17623d;font-size:10px}.access-advanced{margin-top:10px;border-top:1px solid #e1e8f4;padding-top:9px}.access-advanced summary{cursor:pointer;color:#31549a;font-size:12px;font-weight:800}.access-wizard-actions{position:sticky;bottom:-24px;z-index:4;grid-column:1/-1;display:flex;justify-content:space-between;gap:10px;margin:4px -24px -24px;padding:15px 24px 24px;border-top:1px solid #dbe4f2;background:linear-gradient(180deg,#f5f8fef2,#f5f8fe 24%);box-shadow:0 -12px 24px #173d890d}.access-risk-warning{grid-column:1/-1;padding:12px;border:1px solid #f0c8c8;border-radius:10px;background:#fff1f1;color:#8f2424;font-size:12px;font-weight:700}.access-confirmation{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.access-confirmation article{padding:12px;border:1px solid #d8e2f2;border-radius:14px;background:#fff}.access-confirmation span{display:block;color:#617393;font-size:11px}.access-confirmation strong{display:block;margin-top:4px}
    @media(max-width:900px){.access-admin{padding:8px}.access-admin-shell{padding:16px}.access-admin-head{top:-16px}.access-admin-toolbar{grid-template-columns:1fr 1fr}.access-admin-toolbar [data-search],.access-admin-toolbar [data-new]{grid-column:1/-1}.access-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.access-admin-form,.profile-grid,.module-role-grid,.access-step-panel{grid-template-columns:1fr}.access-kit-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.permission-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.access-detail-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:600px){.access-wizard{display:flex;overflow-x:auto;padding-bottom:4px;scroll-snap-type:x proximity}.access-step{flex:0 0 auto;min-width:170px;scroll-snap-align:start}.access-wizard-actions{bottom:-16px;margin:4px -16px -16px;padding:13px 16px 16px}.access-kit-grid,.access-confirmation{grid-template-columns:1fr}.access-admin-toolbar{grid-template-columns:1fr}.access-admin-toolbar>*{grid-column:1!important}.access-metrics{grid-template-columns:1fr 1fr}.access-admin table,.access-admin thead,.access-admin tbody{display:block}.access-admin thead{display:none}.access-admin tr[data-user-row]{display:grid;grid-template-columns:1fr auto;padding:12px;border-bottom:1px solid #dfe7f4}.access-admin tr[data-user-row] td{display:block;border:0;padding:5px 2px}.access-admin tr[data-user-row] td:nth-child(2),.access-admin tr[data-user-row] td:nth-child(3),.access-admin tr[data-user-row] td:nth-child(4){grid-column:1}.access-admin tr[data-user-row] td:last-child{grid-column:2;grid-row:1/4}.access-detail{display:block}.access-detail td{display:block}.access-detail-grid{grid-template-columns:1fr}.access-pager{align-items:flex-start;flex-direction:column}}
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
    const currentArea = normalizedArea(user?.area) || normalizedArea(user?.directorate);
    const currentDirectorate = normalizedArea(user?.directorate) || currentArea;
    const currentJobTitle = user?.job_title === "Coordenador(a) Administrativo(a)" ? "Administrativo" : user?.job_title || "";
    panel.querySelector("[data-content]").innerHTML = `
      <form class="access-admin-form" data-form>
        <div class="access-progress-copy" data-progress-copy>Etapa 1 de 4 · Identificação</div><div class="access-wizard"><button type="button" class="access-step active" data-go-step="1"><span>1</span>Identificação</button><button type="button" class="access-step" data-go-step="2"><span>2</span>Kit e sistemas</button><button type="button" class="access-step" data-go-step="3"><span>3</span>Alcance e regras</button><button type="button" class="access-step" data-go-step="4"><span>4</span>Conferência</button></div>
        <section class="access-step-panel active" data-step-panel="1">
        <div class="access-section-intro"><h3>${user ? "Editar identificação" : "Cadastrar usuário"}</h3><p>Informe o vínculo institucional. Os acessos serão configurados nas próximas etapas.</p></div>
        <label>Nome completo<input name="fullName" value="${esc(user?.full_name)}" required></label>
        <label>E-mail institucional<input name="email" type="email" value="${esc(user?.email)}" ${isDetic ? "readonly" : ""} required></label>
        <label>Área de atuação<select name="area" required><option value="">Selecione a área</option>${USER_AREAS.map((area) => `<option value="${esc(area)}" ${currentArea === area ? "selected" : ""}>${esc(area)}</option>`).join("")}</select><small>Define o primeiro nível do vínculo e o alcance sugerido dos sistemas.</small></label>
        <label>Diretoria<select name="directorate" required><option value="">Selecione a diretoria</option>${USER_AREAS.map((area) => `<option value="${esc(area)}" ${currentDirectorate === area ? "selected" : ""}>${esc(area)}</option>`).join("")}</select><small>Sincronizada com a área para impedir vínculos incompatíveis.</small></label>
        <label>Unidade/estabelecimento<input name="unitName" list="institutional-unit-options" value="${esc(user?.unit_name)}" placeholder="Digite para pesquisar a unidade" autocomplete="off" required><datalist id="institutional-unit-options"></datalist><small data-unit-help>Selecione primeiro a área institucional.</small></label>
        <label>Cargo ou função<select name="jobTitle" required><option value="">Selecione o cargo ou função</option>${JOB_TITLES.map((title) => `<option value="${esc(title)}" ${currentJobTitle === title ? "selected" : ""}>${esc(title)}</option>`).join("")}${currentJobTitle && !JOB_TITLES.includes(currentJobTitle) ? `<option value="${esc(currentJobTitle)}" selected>${esc(currentJobTitle)} (legado)</option>` : ""}</select></label>
        <label>Gestor imediato<input name="managerName" value="${esc(user?.manager_name)}" placeholder="Digite o nome do gestor imediato" autocomplete="off"><small>Preenchimento livre com o nome da pessoa responsável.</small></label>
        <label>Senha temporária<input name="temporaryPassword" type="password" autocomplete="new-password" minlength="8" pattern="(?=.*[A-Za-z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}" title="Use no mínimo 8 caracteres, com letra, número e símbolo." ${user ? 'placeholder="Deixe vazio para manter a senha"' : "required"}><small>Mínimo de 8 caracteres, com letra, número e símbolo. O usuário deverá trocá-la no primeiro acesso.</small></label>
        <label>Situação da conta<select name="accountStatus" ${isDetic ? "disabled" : ""}><option value="ACTIVE" ${!user || user?.account_status === "ACTIVE" || (!user?.account_status && user?.active) ? "selected" : ""}>Ativa</option><option value="SUSPENDED" ${user?.account_status === "SUSPENDED" ? "selected" : ""}>Suspensa temporariamente</option><option value="INACTIVE" ${user?.account_status === "INACTIVE" || user?.active === false ? "selected" : ""}>Inativa</option></select></label>
        <label>Início da vigência<input name="accessStartsAt" type="date" value="${esc(user?.access_starts_at || "")}"></label>
        <label>Fim da vigência<input name="accessEndsAt" type="date" value="${esc(user?.access_ends_at || "")}"><small>Ao vencer, o portal bloqueia os sistemas automaticamente.</small></label>
        </section>
        <section class="access-step-panel" data-step-panel="2">
        <div class="access-section-intro"><h3>Escolha um kit de acesso</h3><p>Use uma configuração pronta e ajuste somente quando necessário.</p></div>
        <div class="access-kit-grid">${ACCESS_KITS.map((kit) => `<button type="button" class="access-kit" data-access-kit="${kit.code}"><strong>${esc(kit.name)}</strong><small>${esc(kit.description)}</small></button>`).join("")}</div>
        <p class="access-kit-note">Comunicação Protegida exige um perfil nominal próprio. Use “Comunicação Protegida — Acesso” para participantes e “Comunicação Protegida — Gestor” somente para quem deve acompanhar todos os casos e relatórios.</p>
        <fieldset class="access-admin-wide"><legend>Perfis corporativos</legend><div class="profile-grid">
          ${(catalog.profiles || []).map((profile) => {
            const protectedAdmin = profile.code === "ADMIN_GERAL" && !isDetic;
            return `<label class="profile-option"><input type="checkbox" name="profiles" value="${profile.code}" ${assigned.has(profile.code) || (!user && false) ? "checked" : ""} ${protectedAdmin ? "disabled" : ""}><span><strong>${esc(profile.name)}</strong><br><small>${esc(profile.description)}</small></span></label>`;
          }).join("")}
        </div></fieldset>
        </section>
        <section class="access-step-panel" data-step-panel="3">
        <div class="access-section-intro"><h3>Defina o alcance em cada sistema</h3><p>O perfil determina o que a pessoa faz; o alcance determina onde ela pode atuar.</p></div>
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
            const sensitiveLabel = module.code === "comunicacao" ? "Acessar Comunicação Protegida" : "Ver dados sensíveis";
            const permissionOptions = [["can_view","Acessar"],["can_create","Criar"],["can_edit","Editar"],["can_delete","Excluir"],["can_approve","Aprovar/publicar"],["can_assign","Direcionar"],["can_export","Exportar"],["can_view_sensitive",sensitiveLabel],["can_admin","Administrar"]];
            const expiry = override?.expires_at ? String(override.expires_at).slice(0,10) : "";
            const profileNames = baseline.map((permission) => catalog.profiles.find((profile) => profile.id === permission.profile_id)?.name).filter(Boolean).join(", ");
            const governance = module.code === "votacao" ? '<p class="access-kit-note">As regras existentes da Urna Eletrônica foram preservadas. O vínculo continua obrigatório por unidade e processo eleitoral.</p>' : `<details class="access-advanced"><summary>Ajustes avançados de permissões</summary><div class="permission-grid">${permissionOptions.map(([key,label]) => `<label class="permission-option"><input type="checkbox" name="access:${module.code}:${key}" ${allowed(key)?"checked":""}><span>${label}</span></label>`).join("")}</div><label class="access-expiry">Expiração específica do sistema<input type="date" name="expires:${module.code}" value="${esc(expiry)}"><small>Opcional para acessos temporários.</small></label><small class="access-origin">Origem atual: ${esc(profileNames || "nenhum perfil com acesso")}${override ? " + ajuste individual" : ""}.</small></details>`;
            return `<div class="module-role" data-module-card="${esc(module.code)}"><div class="access-module-title"><strong>${esc(module.name)}</strong><span class="access-module-state" data-module-state>Configuração do perfil</span></div><label>Papel funcional<select name="role:${module.code}"><option value="">Automático/sem vínculo</option>${roles.map((role) => `<option value="${esc(role)}" ${current?.role_code === role ? "selected" : ""}>${esc(role)}</option>`).join("")}</select></label><label>Alcance dos dados<select name="scopeMode:${module.code}">${SCOPE_MODES.map(([value,label]) => `<option value="${value}" ${scopeMode === value ? "selected" : ""}>${label}</option>`).join("")}</select></label><label>Referência do alcance<input name="scope:${module.code}" value="${esc(scopeValue)}" placeholder="Diretoria, área ou unidade vinculada"></label>${governance}</div>`;
          }).join("")}
        </div></fieldset>
        </section>
        <section class="access-step-panel" data-step-panel="4">
        <div class="access-section-intro"><h3>Conferência antes de salvar</h3><p>Revise em linguagem simples exatamente o que será liberado.</p></div>
        <div class="access-confirmation"><article><span>Usuário</span><strong data-confirm-name>—</strong></article><article><span>Vínculo</span><strong data-confirm-link>—</strong></article><article><span>Vigência</span><strong data-confirm-expiry>Sem expiração</strong></article></div>
        <section class="access-summary access-admin-wide" data-access-summary><h4>Resumo efetivo do acesso</h4><p>Selecione os perfis e permissões para visualizar a conferência.</p></section>
        <div class="access-risk-warning" data-risk-warning hidden></div>
        <div class="access-notice access-admin-wide" data-notice></div>
        </section>
        <div class="access-wizard-actions"><button class="access-secondary" type="button" data-cancel>Cancelar</button><div><button class="access-secondary" type="button" data-previous hidden>Voltar</button> <button class="access-primary" type="button" data-next>Continuar</button><button class="access-primary" type="submit" data-submit hidden>Salvar usuário e acessos</button></div></div>
      </form>`;
    const form = panel.querySelector("[data-form]");
    const refreshInstitutionalUnits = ({ clear = false } = {}) => {
      const area = form.elements.area.value;
      const directorate = form.elements.directorate.value;
      const units = area && area === directorate ? INSTITUTIONAL_STRUCTURE[area] || [] : [];
      const list = form.querySelector("#institutional-unit-options");
      list.innerHTML = units.map((unit) => `<option value="${esc(unit)}"></option>`).join("");
      if (clear && !units.includes(form.elements.unitName.value)) form.elements.unitName.value = "";
      const help = form.querySelector("[data-unit-help]");
      help.textContent = !area ? "Selecione primeiro a área institucional." : area !== directorate ? "Área e Diretoria precisam ser iguais." : `${units.length} unidades disponíveis nesta diretoria. Digite para pesquisar.`;
      help.className = area && area === directorate ? "access-field-valid" : "access-field-invalid";
    };
    form.elements.area.addEventListener("change", () => { form.elements.directorate.value = form.elements.area.value; refreshInstitutionalUnits({ clear:true }); updateAccessSummary(form); });
    form.elements.directorate.addEventListener("change", () => { form.elements.area.value = form.elements.directorate.value; refreshInstitutionalUnits({ clear:true }); updateAccessSummary(form); });
    refreshInstitutionalUnits();
    let currentStep = 1;
    const showStep = (step) => {
      currentStep = Math.max(1, Math.min(4, Number(step)));
      const stepLabels = ["Identificação", "Kit e sistemas", "Alcance e regras", "Conferência"];
      form.querySelector("[data-progress-copy]").textContent = `Etapa ${currentStep} de 4 · ${stepLabels[currentStep - 1]}`;
      form.querySelectorAll("[data-step-panel]").forEach((item) => item.classList.toggle("active", Number(item.dataset.stepPanel) === currentStep));
      form.querySelectorAll("[data-go-step]").forEach((item) => { const value = Number(item.dataset.goStep); item.classList.toggle("active", value === currentStep); item.classList.toggle("done", value < currentStep); item.setAttribute("aria-current", value === currentStep ? "step" : "false"); });
      form.querySelector("[data-previous]").hidden = currentStep === 1;
      form.querySelector("[data-next]").hidden = currentStep === 4;
      form.querySelector("[data-submit]").hidden = currentStep !== 4;
      if (currentStep === 4) updateAccessSummary(form);
      panel.scrollTo({ top: 0, behavior: "smooth" });
    };
    const applyKit = (kit) => {
      form.querySelectorAll('[name="profiles"]').forEach((input) => { if (input.value !== "ADMIN_GERAL" || !input.disabled) input.checked = kit.profiles.includes(input.value); });
      form.querySelectorAll("[data-access-kit]").forEach((button) => button.classList.toggle("selected", button.dataset.accessKit === kit.code));
      for (const module of catalog.modules || []) {
        const role = form.elements[`role:${module.code}`];
        const scopeMode = form.elements[`scopeMode:${module.code}`];
        const scopeValue = form.elements[`scope:${module.code}`];
        if (role && kit.roles[module.code]) role.value = kit.roles[module.code];
        if (scopeMode && module.code !== "votacao") scopeMode.value = kit.scope;
        if (scopeValue && ["UNIT","AREA","DIRECTORATE"].includes(kit.scope)) scopeValue.value = kit.scope === "UNIT" ? form.elements.unitName.value : kit.scope === "AREA" ? form.elements.area.value : form.elements.directorate.value;
        const selectedProfileIds = new Set((catalog.profiles || []).filter((profile) => kit.profiles.includes(profile.code)).map((profile) => profile.id));
        const grants = (catalog.profilePermissions || []).filter((permission) => permission.module_id === module.id && selectedProfileIds.has(permission.profile_id));
        ["can_view","can_create","can_edit","can_delete","can_approve","can_assign","can_export","can_view_sensitive","can_admin"].forEach((key) => { const input = form.elements[`access:${module.code}:${key}`]; if (input) input.checked = grants.some((grant) => grant[key]); });
      }
      if (kit.temporary && !form.elements.accessEndsAt.value) { const date = new Date(); date.setDate(date.getDate() + 30); form.elements.accessEndsAt.value = date.toISOString().slice(0, 10); }
      updateAccessSummary(form);
    };
    const syncPermissionsFromProfiles = () => {
      const selectedCodes = new Set([...form.querySelectorAll('[name="profiles"]:checked')].map((input) => input.value));
      const selectedIds = new Set((catalog.profiles || []).filter((profile) => selectedCodes.has(profile.code)).map((profile) => profile.id));
      for (const module of catalog.modules || []) {
        if (module.code === "votacao") continue;
        const grants = (catalog.profilePermissions || []).filter((permission) => permission.module_id === module.id && selectedIds.has(permission.profile_id));
        ["can_view","can_create","can_edit","can_delete","can_approve","can_assign","can_export","can_view_sensitive","can_admin"].forEach((key) => { const input = form.elements[`access:${module.code}:${key}`]; if (input) input.checked = grants.some((grant) => grant[key]); });
        const state = form.querySelector(`[data-module-card="${module.code}"] [data-module-state]`);
        if (state) state.textContent = grants.some((grant) => grant.can_view) ? "Sistema liberado" : "Sem acesso";
      }
    };
    form.querySelector("[data-cancel]").addEventListener("click", renderList);
    form.querySelector("[data-next]").addEventListener("click", () => { if (currentStep === 1 && !form.reportValidity()) return; showStep(currentStep + 1); });
    form.querySelector("[data-previous]").addEventListener("click", () => showStep(currentStep - 1));
    form.querySelectorAll("[data-go-step]").forEach((button) => button.addEventListener("click", () => { if (Number(button.dataset.goStep) === 1 || form.reportValidity()) showStep(button.dataset.goStep); }));
    form.querySelectorAll("[data-access-kit]").forEach((button) => button.addEventListener("click", () => applyKit(ACCESS_KITS.find((kit) => kit.code === button.dataset.accessKit))));
    form.addEventListener("change", (event) => {
      if (event.target.name === "profiles") {
        syncPermissionsFromProfiles();
        if (event.target.value === "URNA_MESARIO" && !event.target.checked) {
          const votingRole = form.elements["role:votacao"];
          if (votingRole) votingRole.value = "";
        }
      }
      updateAccessSummary(form);
    });
    updateAccessSummary(form);
    form.addEventListener("submit", save);
  }

  function updateAccessSummary(form) {
    const items = (catalog.modules || []).filter((module) => form.elements[`access:${module.code}:can_view`]?.checked || module.code === "votacao" && form.elements[`role:${module.code}`]?.value).map((module) => {
      const permissions = [["can_create","criar"],["can_edit","editar"],["can_delete","excluir"],["can_approve","aprovar/publicar"],["can_assign","direcionar"],["can_export","exportar"],["can_view_sensitive",module.code === "comunicacao" ? "acessar Comunicação Protegida" : "ver dados sensíveis"],["can_admin","administrar"]].filter(([key]) => form.elements[`access:${module.code}:${key}`]?.checked).map(([,label]) => label);
      const scopeLabel = SCOPE_MODES.find(([value]) => value === form.elements[`scopeMode:${module.code}`]?.value)?.[1] || "escopo próprio";
      return `<li><strong>${esc(module.name)}</strong>: ${esc(permissions.length ? permissions.join(", ") : "somente consultar")} · ${esc(scopeLabel.toLowerCase())}</li>`;
    });
    form.querySelector("[data-access-summary]").innerHTML = `<h4>Resumo efetivo do acesso</h4>${items.length ? `<ul>${items.join("")}</ul>` : "<p>Nenhum sistema foi liberado pelas opções atuais.</p>"}`;
    const name = form.elements.fullName?.value.trim() || "Usuário não informado";
    const link = [form.elements.jobTitle?.value.trim(), form.elements.unitName?.value.trim() || form.elements.area?.value].filter(Boolean).join(" · ") || "Vínculo ainda não informado";
    const expiry = form.elements.accessEndsAt?.value ? `Até ${new Date(`${form.elements.accessEndsAt.value}T12:00:00`).toLocaleDateString("pt-BR")}` : "Sem expiração";
    if (form.querySelector("[data-confirm-name]")) form.querySelector("[data-confirm-name]").textContent = name;
    if (form.querySelector("[data-confirm-link]")) form.querySelector("[data-confirm-link]").textContent = link;
    if (form.querySelector("[data-confirm-expiry]")) form.querySelector("[data-confirm-expiry]").textContent = expiry;
    const risks = [];
    for (const module of catalog.modules || []) {
      if (form.elements[`access:${module.code}:can_admin`]?.checked) risks.push(`${module.name}: administração completa`);
      if (form.elements[`access:${module.code}:can_delete`]?.checked) risks.push(`${module.name}: permissão para excluir`);
      if (form.elements[`access:${module.code}:can_view_sensitive`]?.checked) risks.push(module.code === "comunicacao" ? `${module.name}: acesso à Comunicação Protegida` : `${module.name}: visualização de dados sensíveis`);
      if (form.elements[`scopeMode:${module.code}`]?.value === "ALL" && form.elements[`access:${module.code}:can_view`]?.checked) risks.push(`${module.name}: alcance em todo o sistema`);
    }
    const warning = form.querySelector("[data-risk-warning]");
    if (warning) { warning.hidden = !risks.length; warning.innerHTML = risks.length ? `<strong>Atenção às permissões ampliadas:</strong><br>${risks.map(esc).join("<br>")}` : ""; }
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
    if (payload.moduleRoles.votacao?.roleCode && !payload.profileCodes.includes("URNA_MESARIO")) {
      notice.textContent = "Urna Eletrônica: marque o perfil “Urna — Mesário” para liberar este sistema.";
      return;
    }
    if ((!selectedUser || payload.temporaryPassword) && !STRONG_PASSWORD.test(payload.temporaryPassword)) {
      notice.textContent = "A senha temporária deve ter ao menos 8 caracteres, incluindo letra, número e símbolo.";
      return;
    }
    if (payload.accessStartsAt && payload.accessEndsAt && payload.accessEndsAt < payload.accessStartsAt) {
      notice.textContent = "A data final da vigência não pode ser anterior à data inicial.";
      return;
    }
    if (!USER_AREAS.includes(payload.area) || payload.directorate !== payload.area) {
      notice.textContent = "Área de atuação e Diretoria devem representar o mesmo vínculo institucional.";
      return;
    }
    if (!(INSTITUTIONAL_STRUCTURE[payload.directorate] || []).includes(payload.unitName)) {
      notice.textContent = "Selecione uma Unidade/Estabelecimento pertencente à diretoria informada.";
      return;
    }
    if (!JOB_TITLES.includes(payload.jobTitle) && !selectedUser) {
      notice.textContent = "Selecione um Cargo ou função válido.";
      return;
    }
    for (const module of catalog.modules || []) {
      const access = accessOverrides[module.code];
      if (access) {
        const elevated = ["can_create","can_edit","can_delete","can_approve","can_assign","can_export","can_view_sensitive","can_admin"].some((key) => access[key]);
        if (elevated && !access.can_view) { notice.textContent = `${module.name}: libere “Acessar” antes das demais operações.`; return; }
        if (access.can_view && ["DIRECTORATE","AREA","UNIT"].includes(access.scope.mode) && !access.scope.value) { notice.textContent = `${module.name}: informe a referência do alcance selecionado.`; return; }
      }
      if (module.code === "votacao" && moduleRoles.votacao?.roleCode && !moduleRoles.votacao.scope?.unit_id) { notice.textContent = "Urna Eletrônica: informe a unidade vinculada ao mesário."; return; }
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
