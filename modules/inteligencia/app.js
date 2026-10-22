import { semedUi } from "/shared-runtime.js";

const access = await window.SEMED_MODULE_ACCESS;
if (!access) throw new Error("Acesso gerencial não autorizado.");

const { supabase, context, session } = access;
const state = { unit: "all", year: String(new Date().getFullYear()), view: "executive", data: null, decisions: [], sources: { communication: null, voting: null }, loadingSource: "" };

const icons = {
  executive: '<svg viewBox="0 0 24 24"><path d="M4 19V9m5 10V5m5 14v-7m5 7V3"/></svg>',
  alerts: '<svg viewBox="0 0 24 24"><path d="M12 3 2.8 19h18.4L12 3Z"/><path d="M12 9v4m0 3h.01"/></svg>',
  learning: '<svg viewBox="0 0 24 24"><path d="M3 6.5 12 3l9 3.5-9 3.7L3 6.5Z"/><path d="M6 9v5c3 2.4 9 2.4 12 0V9"/></svg>',
  risks: '<svg viewBox="0 0 24 24"><path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6l-8-3Z"/><path d="M12 8v5m0 3h.01"/></svg>',
  strategy: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="m14 10 6-6"/></svg>',
  decisions: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18H6z"/><path d="M9 8h6m-6 4h6m-6 4h4"/></svg>',
  voting: '<svg viewBox="0 0 24 24"><path d="M5 9h14l2 4v7H3v-7l2-4Z"/><path d="M8 9V4h8v5m-8 5h8"/></svg>',
};

const fmt = new Intl.NumberFormat("pt-BR");
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const date = (value) => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—";
const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const profileName = context?.user?.full_name || session.user.email;

document.querySelector("#app").innerHTML = `
  <div class="shell">
    <aside class="sidebar">
      <div class="brand"><span class="brand-mark">◎</span><div><strong>SEMED Integra</strong><span>Inteligência Gerencial</span></div></div>
      <nav class="nav" aria-label="Relatórios de gestão">
        ${[["executive","Visão Geral"],["learning","Gestão de Avaliações"],["strategy","Monitoramento"],["risks","Comunicação"],["voting","Urna Eletrônica"],["alerts","Alertas e Prioridades"],["decisions","Agenda de Decisões"]].map(([id,label], index) => `<button type="button" data-view="${id}" class="${index === 0 ? "active" : ""}">${icons[id]}<span>${label}</span></button>`).join("")}
      </nav>
      <div class="sidebar-note"><strong>${esc(profileName)}</strong><br>Indicadores respeitam seu perfil e o alcance autorizado em cada sistema.</div>
      <a class="portal-back" href="/?select=1">← Voltar ao Portal</a>
    </aside>
    <main class="main">
      <header class="topbar"><div><h1>Central de Inteligência Gerencial</h1><p>Informação confiável para orientar decisões da Secretaria de Educação</p></div><div class="top-actions"><span class="status-live">Dados atualizados</span><button class="icon-button" type="button" data-refresh>Atualizar</button><button class="icon-button" type="button" data-print>Imprimir</button></div></header>
      <section class="content"><div class="content-inner"><nav class="system-switcher" aria-label="Selecionar sistema">${[["executive","Visão Geral","Indicadores integrados"],["learning","Avaliações","Aprendizagem e participação"],["strategy","Monitoramento","Metas, prazos e recursos"],["risks","Comunicação","Proteção e incidentes"],["voting","Urna Eletrônica","Participação eleitoral"]].map(([id,label,detail]) => `<button type="button" data-system-view="${id}" aria-pressed="${id === "executive"}" class="${id === "executive" ? "active" : ""}>${icons[id]}<span><strong>${label}</strong><small>${detail}</small></span><i aria-hidden="true">→</i></button>`).join("")}</nav><div id="notice"></div><div id="views"></div></div></section>
    </main>
  </div>`;

document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => selectView(button.dataset.view)));
document.querySelectorAll("[data-system-view]").forEach((button) => button.addEventListener("click", () => selectView(button.dataset.systemView)));
document.querySelector("[data-refresh]").addEventListener("click", async () => { await load(true); if (state.view === "risks") state.sources.communication = null; if (state.view === "voting") state.sources.voting = null; await loadSystemSource(state.view); });
document.querySelector("[data-print]").addEventListener("click", () => window.print());

async function selectView(id, loadSource = true) {
  state.view = id;
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === id));
  document.querySelectorAll("[data-system-view]").forEach((button) => { const active = button.dataset.systemView === id; button.classList.toggle("active", active); button.setAttribute("aria-pressed", String(active)); });
  document.querySelectorAll(".view").forEach((view) => { view.hidden = view.dataset.view !== id; });
  if (loadSource && ["risks", "voting"].includes(id)) await loadSystemSource(id);
}

async function loadSystemSource(view, force = false) {
  const source = view === "risks" ? "communication" : view === "voting" ? "voting" : "";
  if (!source || (!force && state.sources[source]) || state.loadingSource === source) return;
  state.loadingSource = source;
  notify(`Carregando indicadores de ${source === "communication" ? "Comunicação" : "Urna Eletrônica"}…`, false, 0);
  if (source === "communication") {
    const [protectedCases, incidents] = await Promise.all([
      safeQuery(supabase.from("protected_cases").select("category,risk_level,occurred_at,unit_name,status,created_at"), { data: [], unavailable: true }),
      safeQuery(supabase.from("school_incidents").select("reporting_unit,occurred_at,occurrence_location_type,category,severity,physical_risk,direction_notified,family_contacted,status,created_at,closed_at"), { data: [], unavailable: true }),
    ]);
    state.sources.communication = { protectedCases: protectedCases.data || [], incidents: incidents.data || [], available: !protectedCases.unavailable || !incidents.unavailable, updatedAt: new Date() };
  } else {
    const rows = await safeQuery(supabase.from("votacao_state").select("key,data,updated_at").in("key", ["registry", "voting"]), { data: [], unavailable: true });
    state.sources.voting = { rows: rows.data || [], available: !rows.unavailable, updatedAt: new Date() };
  }
  state.loadingSource = "";
  render();
}

async function safeQuery(promise, fallback) {
  try { const result = await promise; return result.error ? fallback : result; } catch { return fallback; }
}

async function load(showNotice = false) {
  if (showNotice) notify("Atualizando os indicadores…");
  const year = Number(state.year);
  const [units, unitMetrics, classes, assessments, sheets, results, records, budgets, entries, decisions] = await Promise.all([
    safeQuery(supabase.from("avalia_educational_units").select("id,name,active").order("name"), { data: [] }),
    safeQuery(supabase.from("semed_intelligence_unit_metrics").select("unit_id,unit_name,unit_active,school_year,class_count,student_count").eq("school_year", year), { data: [] }),
    safeQuery(supabase.from("avalia_school_classes").select("id,unit_id,school_year,grade,time_mode").eq("school_year", year), { data: [] }),
    safeQuery(supabase.from("avalia_assessments").select("id,unit_id,class_id,number,year,grade,subject,time_mode,assessment_date,status").eq("year", year), { data: [] }),
    safeQuery(supabase.from("avalia_answer_sheets").select("id,assessment_id,student_id,created_at"), { data: [] }),
    safeQuery(supabase.from("avalia_results").select("id,sheet_id,percentage,score,finalized_at"), { data: [] }),
    safeQuery(supabase.from("monitor_records").select("collection,id,data,active,updated_at").eq("active", true), { data: [] }),
    safeQuery(supabase.from("monitor_financial_annual_budgets").select("planned_amount,fiscal_year,active").eq("fiscal_year", year).eq("active", true), { data: [] }),
    safeQuery(supabase.from("monitor_financial_entries").select("amount,entry_type,fiscal_year,active,occurred_on").eq("fiscal_year", year).eq("active", true), { data: [] }),
    safeQuery(supabase.from("semed_management_decisions").select("*").order("created_at", { ascending: false }), { data: [] }),
  ]);
  state.data = { units: units.data || [], unitMetrics: unitMetrics.data || [], classes: classes.data || [], assessments: assessments.data || [], sheets: sheets.data || [], results: results.data || [], records: records.data || [], budgets: budgets.data || [], entries: entries.data || [] };
  state.decisions = decisions.data || [];
  render();
  if (showNotice) notify("Indicadores atualizados com sucesso.", false, 2500);
}

function filtered() {
  const d = state.data;
  const totalStudents = d.unitMetrics.reduce((sum, item) => sum + Number(item.student_count || 0), 0);
  if (state.unit === "all") return { ...d, studentCount: totalStudents };
  const classIds = new Set(d.classes.filter((item) => item.unit_id === state.unit).map((item) => item.id));
  const assessmentIds = new Set(d.assessments.filter((item) => item.unit_id === state.unit || classIds.has(item.class_id)).map((item) => item.id));
  const sheetIds = new Set(d.sheets.filter((item) => assessmentIds.has(item.assessment_id)).map((item) => item.id));
  const selectedMetric = d.unitMetrics.find((item) => item.unit_id === state.unit);
  return { ...d, classes: d.classes.filter((item) => classIds.has(item.id)), studentCount: Number(selectedMetric?.student_count || 0), assessments: d.assessments.filter((item) => assessmentIds.has(item.id)), sheets: d.sheets.filter((item) => assessmentIds.has(item.assessment_id)), results: d.results.filter((item) => sheetIds.has(item.sheet_id)) };
}

function render() {
  const d = filtered();
  const communication = state.sources.communication;
  const selectedUnitName = state.unit === "all" ? "" : state.data.units.find((item) => item.id === state.unit)?.name || "";
  const protectedCases = (communication?.protectedCases || []).filter((item) => inSelectedYear(item.occurred_at || item.created_at) && (!selectedUnitName || sameText(item.unit_name, selectedUnitName)));
  const incidents = (communication?.incidents || []).filter((item) => inSelectedYear(item.occurred_at || item.created_at) && (!selectedUnitName || sameText(item.reporting_unit, selectedUnitName)));
  const openProtected = protectedCases.filter((item) => !["concluida","arquivada"].includes(item.status));
  const criticalProtected = protectedCases.filter((item) => ["imediato","alto"].includes(item.risk_level));
  const openIncidents = incidents.filter((item) => !["resolvido","encerrado","reclassificado_protegido"].includes(item.status));
  const criticalIncidents = incidents.filter((item) => ["alto","emergencial"].includes(item.severity) || item.physical_risk);
  const directionRate = incidents.length ? incidents.filter((item) => item.direction_notified).length / incidents.length * 100 : 0;
  const familyRate = incidents.length ? incidents.filter((item) => item.family_contacted).length / incidents.length * 100 : 0;
  const votingSource = state.sources.voting;
  const votingRows = votingSource?.rows || [];
  const registryData = votingRows.find((row) => row.key === "registry")?.data || {};
  const votingData = votingRows.find((row) => row.key === "voting")?.data || {};
  const electionUnits = registryData.units || [];
  const candidates = registryData.candidates || [];
  const votingSessions = votingData.votingSessions || [];
  const boothAssignments = votingData.boothAssignments || [];
  const votes = votingData.votes || [];
  const completedVoters = votingSessions.filter((item) => String(item.status).toLowerCase() === "votou").length;
  const turnout = votingSessions.length ? completedVoters / votingSessions.length * 100 : 0;
  const activeUnits = state.data.units.filter((item) => item.active);
  const completed = d.assessments.filter((item) => ["FINALIZADA","FINALIZADO","CONCLUIDA","CONCLUÍDA"].includes(String(item.status).toUpperCase()));
  const avg = d.results.length ? d.results.reduce((sum, item) => sum + Number(item.percentage || 0), 0) / d.results.length : null;
  const openDecisions = state.decisions.filter((item) => !["concluida","cancelada"].includes(item.status));
  const overdue = openDecisions.filter((item) => item.due_date && new Date(`${item.due_date}T23:59:59`) < new Date());
  const planned = d.budgets.reduce((sum, item) => sum + Number(item.planned_amount || 0), 0);
  const executed = d.entries.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const execution = planned ? Math.min(999, executed / planned * 100) : 0;
  const assessmentsWithoutSheets = d.assessments.filter((assessment) => !d.sheets.some((sheet) => sheet.assessment_id === assessment.id));
  const alerts = [
    ...overdue.map((item) => ({ tone: "#be3b49", title: `Decisão vencida: ${item.title}`, detail: `${item.responsible_name || "Sem responsável"} · prazo ${date(item.due_date)}`, label: "Crítico" })),
    ...assessmentsWithoutSheets.slice(0, 5).map((item) => ({ tone: "#c56d08", title: `Avaliação sem folhas geradas: ${item.number || item.subject}`, detail: `${item.grade || "—"}º ano · ${date(item.assessment_date)}`, label: "Atenção" })),
    ...(planned && execution > 100 ? [{ tone: "#be3b49", title: "Execução financeira acima do planejado", detail: `${execution.toFixed(1)}% do orçamento anual registrado`, label: "Crítico" }] : []),
  ];
  const unitStats = state.data.unitMetrics.map((item) => ({ name: item.unit_name, students: Number(item.student_count || 0) })).sort((a,b) => b.students - a.students).slice(0, 8);
  const maxStudents = Math.max(1, ...unitStats.map((item) => item.students));
  const options = `<option value="all">Toda a rede</option>${activeUnits.map((unit) => `<option value="${unit.id}" ${state.unit === unit.id ? "selected" : ""}>${esc(unit.name)}</option>`).join("")}`;
  const filters = `<div class="filters"><label>Ano<select data-year>${[yearNow()-1,yearNow(),yearNow()+1].map((year) => `<option ${String(year)===state.year?"selected":""}>${year}</option>`).join("")}</select></label><label>Unidade<select data-unit>${options}</select></label></div>`;

  document.querySelector("#views").innerHTML = `
    <section class="view" data-view="executive"><div class="intro"><div><h2>Painel Executivo da Educação</h2><p>Visão consolidada dos dados disponíveis para apoiar decisões, identificar prioridades e acompanhar resultados.</p></div>${filters}</div>
      <div class="metrics">${metric("Unidades ativas", activeUnits.length, "Cadastro compartilhado da rede", "#3157b7")}${metric("Alunos ativos", d.studentCount, `${d.classes.length} turma(s) no recorte`, "#16845b")}${metric("Avaliações", d.assessments.length, `${completed.length} concluída(s)`, "#7453c6")}${metric("Desempenho médio", avg === null ? "Sem dados" : `${avg.toFixed(1)}%`, avg === null ? "Resultados ainda não processados" : `${d.results.length} resultado(s)`, "#c56d08")}</div>
      <div class="grid-2"><article class="panel"><div class="panel-head"><div><h3>Prioridades para decisão</h3><p>Questões que exigem acompanhamento gerencial.</p></div><span class="spacer badge ${alerts.length ? "amber" : "green"}">${alerts.length} alerta(s)</span></div>${priorityList(alerts)}</article>
      <aside class="panel"><div class="panel-head"><div><h3>Agenda de decisões</h3><p>Acompanhamento dos compromissos gerenciais.</p></div></div><div class="metrics" style="grid-template-columns:repeat(2,1fr)">${metric("Em aberto", openDecisions.length, "decisões ativas", "#3157b7")}${metric("Vencidas", overdue.length, "exigem providência", "#be3b49")}</div><div class="quick-links" style="margin-top:14px"><a href="#" data-go="decisions">Abrir Agenda de Decisões <span>→</span></a><a href="#" data-go="alerts">Ver todos os alertas <span>→</span></a></div></aside></div>
      <div class="grid-2"><article class="panel"><div class="panel-head"><div><h3>Alunos por unidade</h3><p>Maiores quantitativos no cadastro atual.</p></div></div>${unitStats.length ? `<div class="bar-list">${unitStats.map((item)=>`<div class="bar-row"><span title="${esc(item.name)}">${esc(short(item.name,22))}</span><div class="bar-track"><div class="bar-fill" style="width:${item.students/maxStudents*100}%"></div></div><strong>${fmt.format(item.students)}</strong></div>`).join("")}</div>` : empty("Nenhum aluno disponível neste recorte.")}</article>
      <aside class="panel"><div class="panel-head"><div><h3>Execução estratégica</h3><p>Dados financeiros do Monitoramento.</p></div></div>${planned ? `<strong style="font-size:28px;color:var(--navy)">${execution.toFixed(1)}%</strong><p style="color:var(--muted)">${money.format(executed)} executados de ${money.format(planned)} planejados.</p><div class="bar-track"><div class="bar-fill" style="width:${Math.min(100,execution)}%"></div></div>` : empty("Ainda não há orçamento anual registrado para o período.")}</aside></div>
    </section>
    <section class="view" data-view="alerts" hidden><div class="intro"><div><h2>Alertas e Prioridades</h2><p>O que precisa de atenção, decisão ou encaminhamento agora.</p></div>${filters}</div><article class="panel">${priorityList(alerts, true)}</article></section>
    <section class="view" data-view="learning" hidden><div class="intro"><div><h2>Desempenho e Equidade Educacional</h2><p>Acompanhe participação, evolução e diferenças entre unidades sem criar rankings simplistas.</p></div>${filters}</div><div class="metrics">${metric("Folhas geradas", d.sheets.length, "participação preparada", "#3157b7")}${metric("Resultados processados", d.results.length, "leituras finalizadas", "#16845b")}${metric("Média da rede", avg === null ? "Sem dados" : `${avg.toFixed(1)}%`, "no recorte selecionado", "#7453c6")}${metric("Avaliações sem folhas", assessmentsWithoutSheets.length, "requerem conferência", "#c56d08")}</div><article class="panel" style="margin-top:16px">${d.results.length ? performanceTable(d) : empty("Os resultados ainda não foram processados. O painel será preenchido automaticamente quando a Gestão de Avaliações concluir as leituras.")}</article></section>
    <section class="view" data-view="risks" hidden><div class="intro"><div><h2>Comunicação</h2><p>Indicadores anonimizados da Comunicação Protegida e dos Incidentes Escolares. Identidades, descrições e anexos permanecem restritos ao sistema de origem.</p></div><span class="source-update">${sourceStatus(communication, "Comunicação")}</span></div>${communication?.available ? `<div class="metrics">${metric("Comunicações protegidas", protectedCases.length, `${openProtected.length} em acompanhamento`, "#be3b49")}${metric("Risco alto ou imediato", criticalProtected.length, "prioridade de proteção", "#c56d08")}${metric("Incidentes escolares", incidents.length, `${openIncidents.length} em andamento`, "#3157b7")}${metric("Incidentes críticos", criticalIncidents.length, "alto, emergencial ou risco físico", "#7453c6")}</div><div class="grid-2"><article class="panel"><div class="panel-head"><div><h3>Incidentes por tipo</h3><p>Distribuição agregada, sem identificação das pessoas envolvidas.</p></div></div>${categoryTable(incidents, "category")}</article><aside class="panel"><div class="panel-head"><div><h3>Adoção do fluxo institucional</h3><p>Comunicações essenciais registradas no atendimento.</p></div></div><div class="flow-stats"><div><strong>${directionRate.toFixed(1)}%</strong><span>Direção comunicada</span></div><div><strong>${familyRate.toFixed(1)}%</strong><span>Família acionada</span></div></div></aside></div><div class="grid-2"><article class="panel"><div class="panel-head"><div><h3>Comunicação Protegida por risco</h3><p>Visão gerencial sem nomes, relatos ou documentos.</p></div></div>${categoryTable(protectedCases, "risk_level")}</article><aside class="panel"><div class="panel-head"><div><h3>Acesso ao sistema de origem</h3><p>Detalhes seguem as permissões específicas da Comunicação.</p></div></div><div class="quick-links"><a href="/comunicacao/?view=incidentes">Abrir Incidentes Escolares <span>→</span></a><a href="/comunicacao/?view=protegida">Abrir Comunicação Protegida <span>→</span></a></div></aside></div>` : sourceUnavailable("Comunicação", "/comunicacao/")}</section>
    <section class="view" data-view="strategy" hidden><div class="intro"><div><h2>Execução Estratégica</h2><p>Relação entre planejamento, execução física e aplicação dos recursos.</p></div>${filters}</div><div class="metrics">${metric("Objetos monitorados", countObjects(d.records), "registros estratégicos", "#3157b7")}${metric("Orçamento planejado", money.format(planned), `exercício ${state.year}`, "#7453c6")}${metric("Execução registrada", money.format(executed), `${execution.toFixed(1)}% do planejado`, "#16845b")}${metric("Decisões abertas", openDecisions.length, `${overdue.length} vencida(s)`, "#c56d08")}</div><article class="panel" style="margin-top:16px"><div class="panel-head"><div><h3>Matriz de acompanhamento</h3><p>Interpretação automática dos dados financeiros disponíveis.</p></div></div>${strategyMatrix(planned, executed)}</article></section>
    <section class="view" data-view="voting" hidden><div class="intro"><div><h2>Urna Eletrônica</h2><p>Acompanhamento operacional e participação nos processos eleitorais, sem exposição de votos individuais.</p></div><span class="source-update">${sourceStatus(votingSource, "Urna Eletrônica")}</span></div>${votingSource?.available ? `<div class="metrics">${metric("Unidades habilitadas", electionUnits.length, "unidades cadastradas", "#3157b7")}${metric("Candidaturas", candidates.length, "registros eleitorais", "#7453c6")}${metric("Participação", `${turnout.toFixed(1)}%`, `${completedVoters} de ${votingSessions.length} eleitores liberados`, "#16845b")}${metric("Urnas em operação", boothAssignments.length, `${votes.length} voto(s) registrado(s)`, "#c56d08")}</div><div class="grid-2"><article class="panel"><div class="panel-head"><div><h3>Situação da participação</h3><p>Consolidado operacional dos eleitores habilitados.</p></div></div>${categoryTable(votingSessions, "status")}</article><aside class="panel"><div class="panel-head"><div><h3>Princípios de divulgação</h3><p>A Inteligência Gerencial preserva o sigilo eleitoral.</p></div></div><div class="source-state"><div class="source"><strong>Dados agregados</strong><small>Somente quantitativos e percentuais são apresentados.</small></div><div class="source"><strong>Sem voto individual</strong><small>Não há associação entre eleitor e escolha realizada.</small></div><div class="source"><strong>Resultado oficial</strong><small>Deve ser consultado após a liberação no sistema eleitoral.</small></div></div><div class="quick-links" style="margin-top:16px"><a href="/votacao/">Abrir Urna Eletrônica <span>→</span></a></div></aside></div>` : sourceUnavailable("Urna Eletrônica", "/votacao/")}</section>
    <section class="view" data-view="decisions" hidden><div class="intro"><div><h2>Agenda de Decisões</h2><p>Registre o problema, a evidência, a decisão, o responsável e a data de reavaliação.</p></div><div class="actions"><button class="secondary" data-export>Exportar CSV</button></div></div><article class="panel"><form class="decision-form" data-decision-form><div class="field"><label>Título da decisão<input name="title" required maxlength="160"></label></div><div class="field"><label>Origem<select name="source_module"><option>Portal</option><option>Gestão de Avaliações</option><option>Monitoramento</option><option>Comunicação</option><option>Urna Eletrônica</option></select></label></div><div class="field wide"><label>Problema analisado<textarea name="problem" required></textarea></label></div><div class="field wide"><label>Evidências utilizadas<textarea name="evidence" required></textarea></label></div><div class="field wide"><label>Decisão adotada<textarea name="decision" required></textarea></label></div><div class="field"><label>Responsável<input name="responsible_name" required></label></div><div class="field"><label>Prioridade<select name="priority"><option value="alta">Alta</option><option value="media" selected>Média</option><option value="baixa">Baixa</option></select></label></div><div class="field"><label>Prazo<input name="due_date" type="date" required></label></div><div class="field"><label>Data de reavaliação<input name="review_date" type="date"></label></div><div class="field wide actions"><button class="primary" type="submit">Registrar decisão</button></div></form></article><article class="panel" style="margin-top:16px"><div class="panel-head"><div><h3>Decisões registradas</h3><p>Histórico institucional e acompanhamento dos responsáveis.</p></div></div>${decisionTable()}</article></section>`;

  bindFilters();
  void selectView(state.view, false);
  document.querySelectorAll("[data-go]").forEach((link) => link.addEventListener("click", (event) => { event.preventDefault(); selectView(link.dataset.go); }));
  document.querySelector("[data-decision-form]")?.addEventListener("submit", saveDecision);
  document.querySelector("[data-export]")?.addEventListener("click", exportDecisions);
  document.querySelectorAll("[data-decision-status]").forEach((select) => select.addEventListener("change", updateDecision));
}

function yearNow(){ return new Date().getFullYear(); }
function inSelectedYear(value){ return !value || String(new Date(value).getFullYear()) === state.year; }
function sameText(left,right){ return String(left||"").trim().localeCompare(String(right||"").trim(),"pt-BR",{sensitivity:"base"})===0; }
function metric(label, value, detail, tone){ return `<article class="metric" style="--tone:${tone}"><span class="metric-label"><i></i>${label}</span><strong>${typeof value === "number" ? fmt.format(value) : esc(value)}</strong><small>${detail}</small></article>`; }
function empty(text){ return `<div class="empty">${esc(text)}</div>`; }
function short(value, max){ const text=String(value||""); return text.length>max?`${text.slice(0,max-1)}…`:text; }
function labelValue(value){ const labels={violencia_fisica:"Violência física",violencia_sexual:"Violência sexual",violencia_psicologica:"Violência psicológica",negligencia:"Negligência",ameaca:"Ameaça",discriminacao:"Discriminação",violencia_institucional:"Violência institucional",conflito_interpessoal:"Conflito interpessoal",indisciplina:"Indisciplina",agressao_verbal:"Agressão verbal",agressao_fisica:"Agressão física",discriminacao_intimidacao:"Discriminação ou intimidação",dano_patrimonio:"Dano ao patrimônio",acidente:"Acidente",alimentacao:"Alimentação",animal_dependencias:"Animal nas dependências",seguranca_unidade:"Segurança da unidade",transporte_escolar:"Transporte escolar",conduta_servidor:"Conduta de servidor",saude:"Saúde",imediato:"Imediato",alto:"Alto",moderado:"Moderado",acompanhamento:"Acompanhamento",aguardando:"Aguardando",votou:"Votou"}; const key=String(value||"não informado").toLowerCase(); return labels[key]||key.replaceAll("_"," ").replace(/^./,char=>char.toUpperCase()); }
function categoryTable(rows, key){ if(!rows.length)return empty("Ainda não há registros disponíveis neste recorte."); const counts=rows.reduce((map,item)=>map.set(item[key]||"não informado",(map.get(item[key]||"não informado")||0)+1),new Map()); const ordered=[...counts.entries()].sort((a,b)=>b[1]-a[1]); return `<div class="table-wrap"><table><thead><tr><th>Classificação</th><th>Quantidade</th><th>Participação</th></tr></thead><tbody>${ordered.map(([label,count])=>`<tr><td>${esc(labelValue(label))}</td><td>${fmt.format(count)}</td><td>${(count/rows.length*100).toFixed(1)}%</td></tr>`).join("")}</tbody></table></div>`; }
function sourceStatus(source, label){ if(!source)return `Carregando ${label}…`; if(!source.available)return "Fonte indisponível neste acesso"; return `Atualizado às ${source.updatedAt.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}`; }
function sourceUnavailable(label,href){ return `<article class="panel"><div class="source-unavailable"><strong>Os indicadores de ${esc(label)} não estão disponíveis neste acesso.</strong><p>Isso pode ocorrer quando o sistema usa outra base de dados ou quando o seu perfil não possui permissão para consultar os registros consolidados.</p><a href="${href}">Abrir o sistema de origem <span>→</span></a></div></article>`; }
function priorityList(items, expanded=false){ if(!items.length) return empty("Nenhuma prioridade crítica foi identificada com os dados disponíveis."); return `<div class="priority-list">${items.slice(0,expanded?50:6).map((item)=>`<div class="priority"><span class="priority-dot" style="--priority:${item.tone}"></span><div><strong>${esc(item.title)}</strong><p>${esc(item.detail)}</p></div><span class="badge ${item.label === "Crítico" ? "red" : "amber"}">${item.label}</span></div>`).join("")}</div>`; }
function countObjects(records){ return records.filter((item)=>["objects","objetos"].includes(String(item.collection).toLowerCase())).length; }
function performanceTable(d){ const values=d.results.map((item)=>Number(item.percentage||0)); const ranges=[["Abaixo de 50%",values.filter(v=>v<50).length],["50% a 69,9%",values.filter(v=>v>=50&&v<70).length],["70% a 84,9%",values.filter(v=>v>=70&&v<85).length],["85% ou mais",values.filter(v=>v>=85).length]]; return `<div class="table-wrap"><table><thead><tr><th>Faixa de desempenho</th><th>Resultados</th><th>Participação</th></tr></thead><tbody>${ranges.map(([label,count])=>`<tr><td>${label}</td><td>${fmt.format(count)}</td><td>${values.length?(count/values.length*100).toFixed(1):"0,0"}%</td></tr>`).join("")}</tbody></table></div>`; }
function strategyMatrix(planned,executed){ const ratio=planned?executed/planned*100:0; const status=!planned?["Sem dados","Registre o orçamento anual para iniciar o acompanhamento.","blue"]:ratio>100?["Crítica","Execução acima do valor planejado. Conferir lançamentos e autorização.","red"]:ratio>=70?["Adequada","Execução compatível com o planejamento registrado.","green"]:ratio>=35?["Atenção","Acompanhar entregas, prazos e ritmo de execução.","amber"]:["Atenção","Execução baixa para o período. Verificar impedimentos e cronograma.","amber"]; return `<div class="table-wrap"><table><thead><tr><th>Situação</th><th>Planejado</th><th>Executado</th><th>Interpretação</th></tr></thead><tbody><tr><td><span class="badge ${status[2]}">${status[0]}</span></td><td>${money.format(planned)}</td><td>${money.format(executed)}</td><td>${status[1]}</td></tr></tbody></table></div>`; }
function decisionTable(){ if(!state.decisions.length)return empty("Nenhuma decisão foi registrada. Use o formulário acima para iniciar a agenda gerencial."); return `<div class="table-wrap"><table><thead><tr><th>Decisão</th><th>Origem</th><th>Responsável</th><th>Prazo</th><th>Prioridade</th><th>Situação</th></tr></thead><tbody>${state.decisions.map((item)=>`<tr><td><strong>${esc(item.title)}</strong><br><small>${esc(short(item.decision,90))}</small></td><td>${esc(item.source_module)}</td><td>${esc(item.responsible_name)}</td><td>${date(item.due_date)}</td><td><span class="badge ${item.priority==="alta"?"red":item.priority==="media"?"amber":"blue"}">${esc(item.priority)}</span></td><td><select data-decision-status="${item.id}"><option value="aberta" ${item.status==="aberta"?"selected":""}>Aberta</option><option value="em_execucao" ${item.status==="em_execucao"?"selected":""}>Em execução</option><option value="concluida" ${item.status==="concluida"?"selected":""}>Concluída</option><option value="cancelada" ${item.status==="cancelada"?"selected":""}>Cancelada</option></select></td></tr>`).join("")}</tbody></table></div>`; }

function bindFilters(){ document.querySelectorAll("[data-year]").forEach((select)=>select.addEventListener("change",async()=>{state.year=select.value;await load();})); document.querySelectorAll("[data-unit]").forEach((select)=>select.addEventListener("change",()=>{state.unit=select.value;render();})); }
async function saveDecision(event){ event.preventDefault(); const form=event.currentTarget; const payload=Object.fromEntries(new FormData(form)); payload.created_by=session.user.id; const {error}=await supabase.from("semed_management_decisions").insert(payload); if(error){notify(`Não foi possível registrar: ${error.message}`,true);return;} form.reset(); notify("Decisão registrada com sucesso."); await load(); selectView("decisions"); }
async function updateDecision(event){ const id=event.currentTarget.dataset.decisionStatus; const {error}=await supabase.from("semed_management_decisions").update({status:event.currentTarget.value,updated_at:new Date().toISOString()}).eq("id",id); if(error)notify(`Não foi possível atualizar: ${error.message}`,true); else notify("Situação atualizada.",false,2000); }
function exportDecisions(){ const cols=["Título","Origem","Problema","Evidências","Decisão","Responsável","Prazo","Reavaliação","Prioridade","Situação"]; const rows=state.decisions.map((item)=>[item.title,item.source_module,item.problem,item.evidence,item.decision,item.responsible_name,item.due_date,item.review_date,item.priority,item.status]); const csv=[cols,...rows].map((row)=>row.map((value)=>`"${String(value??"").replaceAll('"','""')}"`).join(";")).join("\r\n"); const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url;a.download=`agenda-decisoes-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url); }
function notify(message,error=false,timeout=4500){ const node=document.querySelector("#notice"); node.innerHTML=`<div class="notice ${error?"error":""}">${esc(message)}</div>`; if(timeout)setTimeout(()=>{node.innerHTML="";},timeout); }

try { await load(); semedUi.clear(); } catch (error) { semedUi.error(`Não foi possível carregar a Central de Inteligência: ${error.message}`, "/?select=1"); }
