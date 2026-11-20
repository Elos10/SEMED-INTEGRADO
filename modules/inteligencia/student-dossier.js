export const dossierSources = { learning:"Avaliações", active_search:"Busca Ativa", sae:"Atendimentos SAE", incidents:"Incidentes Escolares", protected:"Comunicação Protegida" };
export const escapeDossier = value => String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const esc=escapeDossier;
const display=value=>value===null||value===undefined||value===""?"Não informado":String(value);
export function dossierDateKey(value) {
 if(!value)return "";if(/^\d{4}-\d{2}-\d{2}$/.test(String(value)))return String(value);
 const parsed=new Date(value);if(Number.isNaN(parsed.getTime()))return "";
 const parts=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(parsed).map(p=>[p.type,p.value]));
 return `${parts.year}-${parts.month}-${parts.day}`;
}
const date=value=>{const key=dossierDateKey(value);return key?key.split("-").reverse().join("/"):"Não informada";};
export function dossierTimeline(dossier,records) {
 const assessments=(dossier.evaluations||[]).map(r=>({id:r.id,module:"learning",title:dossierSources.learning,protocol:r.number,date:r.date,unit:r.unit_name,status:r.percentage===null?"Sem resultado":"Resultado disponível",summary:String(r.subject),details:{"Aproveitamento":r.percentage===null?"Não informado":`${r.percentage}%`,"Nota":r.score,"Acertos":r.correct,"Total de questões":r.total},href:"/avaliacoes/"}));
 return [...assessments,...records.map(r=>r.module==="protected"?{...r,summary:"****",details:{"Pessoa protegida":"****","Descrição":"****","Providências":"****"}}:r)].sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
}
export function dossierRecordsHtml(records,canUnlink=false) {
 return records.map(row=>{const r=row.module==="protected"?{...row,summary:"****",details:{"Pessoa protegida":"****","Descrição":"****","Providências":"****"}}:row;return `<article class="dossier-event"><div class="dossier-event-head"><span class="badge blue">${esc(dossierSources[r.module]||r.title)}</span><time>${esc(date(r.date))}</time><strong>${esc(display(r.protocol))}</strong><span>${esc(display(r.status).replaceAll("_"," "))}</span></div><p><strong>Unidade:</strong> ${esc(display(r.unit))}</p><p>${esc(display(r.summary))}</p><details><summary>Consultar informações do registro</summary><dl>${Object.entries(r.details||{}).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(display(v))}</dd></div>`).join("")}</dl></details>${canUnlink && r.module!=="learning"?`<button class="secondary" data-unlink-source="${esc(r.module)}" data-unlink-record="${esc(r.id)}">Desvincular do prontuário</button> `:""}<a class="secondary" href="${r.module==="learning"?"/avaliacoes/":"/crei-sae/"}" target="_blank" rel="noopener">Abrir sistema de origem</a><small>Use o protocolo acima para localizar o registro completo. A edição é feita na origem.</small></article>`;}).join("")||'<p class="empty">Nenhum registro vinculado e disponível neste recorte. Isso não significa ausência de acompanhamentos.</p>';
}
export function dossierEnrollmentHtml(rows=[]) {
 return `<h3>Histórico de lotação escolar</h3><p class="dossier-help">O registro inicial retrata o cadastro na implantação do prontuário. Não representa a data de ingresso do aluno. Alterações futuras de turma ou situação serão preservadas.</p><div class="table-wrap"><table><thead><tr><th>Observado em</th><th>Unidade</th><th>Turma / ano letivo</th><th>Origem</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(date(r.observed_at))}</td><td>${esc(r.unit_name)}</td><td>${esc(r.class_name)} · ${esc(r.school_year)}</td><td>${r.origin==="initial_snapshot"?"Retrato inicial do cadastro":"Atualização escolar"}</td></tr>`).join("")}</tbody></table></div>`;
}
export function authorizedDossierModules(data) {
 return ["learning",...["sae","active_search","incidents","protected"].filter(k=>data.sources?.[k]===true)];
}
export function filterDossierRecords(records,{module="all",start="",end="",unitMode="current",unitLabel=""}={}) {
 const normal=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().replace(/\s+/g," ").toLowerCase();
 return records.filter(r=>{const day=dossierDateKey(r.date);return (module==="all"||r.module===module)&&(!start||day>=start)&&(!end||(day&&day<=end))&&(unitMode!=="record"||!unitLabel||normal(r.unit)===normal(unitLabel));});
}
export function dossierModuleReportHtml(records,modules,canUnlink=false) {
 const schemas={
  learning:{headers:["Data","Avaliação","Disciplina","Resultado"],values:r=>[date(r.date),r.protocol,r.summary,r.details?.Aproveitamento]},
  sae:{headers:["Data","Protocolo","Unidade","Situação apresentada","Situação"],values:r=>[date(r.date),r.protocol,r.unit,r.summary,r.status]},
  active_search:{headers:["Data do registro","Unidade","Faltas / atestados","Situação"],values:r=>[date(r.date),r.unit,r.summary,r.status]},
  incidents:{headers:["Data","Protocolo","Unidade","Tipo","Situação"],values:r=>[date(r.date),r.protocol,r.unit,r.summary,r.status]},
  protected:{headers:["Data","Protocolo","Unidade","Situação"],values:r=>[date(r.date),r.protocol,r.unit,r.status]},
 };
 return modules.filter(k=>Object.hasOwn(schemas,k)).map(k=>{
  const rows=records.filter(r=>r.module===k),schema=schemas[k];
  return `<section class="dossier-module" data-report-module="${k}"><header><h3>${dossierSources[k]}</h3><span>${rows.length} registro(s)</span></header>${rows.length?`<div class="table-wrap"><table><thead><tr>${schema.headers.map(h=>`<th>${h}</th>`).join("")}<th class="report-controls">Consulta</th></tr></thead>${rows.map(row=>{
   const r=k==="protected"?{...row,summary:"****",details:{"Pessoa protegida":"****","Descrição":"****","Providências":"****"}}:row;
   return `<tbody><tr>${schema.values(r).map(v=>`<td>${esc(display(v).replaceAll("_"," "))}</td>`).join("")}<td class="report-controls"><a href="${k==="learning"?"/avaliacoes/":"/crei-sae/"}" target="_blank" rel="noopener">Abrir origem</a>${canUnlink && k!=="learning"?`<button type="button" class="secondary" data-unlink-source="${k}" data-unlink-record="${esc(r.id)}">Desvincular</button>`:""}</td></tr><tr class="dossier-row-detail"><td colspan="${schema.headers.length+1}"><details><summary>Ver detalhes · ${esc(display(r.protocol))}</summary><dl>${Object.entries(r.details||{}).map(([label,v])=>`<div><dt>${esc(label)}</dt><dd>${esc(display(v))}</dd></div>`).join("")}</dl>${k==="learning"?`<p><strong>Unidade da avaliação:</strong> ${esc(display(r.unit))}</p>`:""}</details></td></tr></tbody>`;
  }).join("")}</table></div>`:'<p class="dossier-empty">Nenhum registro vinculado disponível neste período.</p>'}</section>`;
 }).join("");
}
export function dossierPrintHtml(dossier,records,options={}) {
 const s=dossier.student;
 return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de Acompanhamento do Aluno</title><style>@page{size:A4 portrait;margin:10mm;@bottom-right{content:"Página " counter(page) " de " counter(pages)}}body{font:10pt Calibri,Arial,sans-serif;color:#000;background:#fff}h1{font-size:15pt}h2{font-size:11pt;background:#eef1f5;padding:4px}p{margin:4px 0}.dossier-event{border-bottom:1px solid #ccc;padding:8px 0;break-inside:avoid}.dossier-event-head{display:flex;gap:12px;flex-wrap:wrap}dl{display:grid;grid-template-columns:1fr 1fr;gap:8px}dt{font-weight:bold}dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}a,summary,.dossier-event>small,.report-controls{display:none}details{display:block}.dossier-module>header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ccc;margin-top:12px}h3{font-size:11pt}.dossier-row-detail td{border-top:0}tbody{break-inside:avoid}dd{overflow-wrap:anywhere}table{width:100%;border-collapse:collapse}th,td{padding:4px;border-bottom:1px solid #ddd;text-align:left}thead{display:table-header-group}tr{break-inside:avoid}small{font-size:8pt}.print-toolbar{margin-bottom:10px}@media print{.print-toolbar{display:none}}</style></head><body><div class="print-toolbar"><button id="print-dossier">Imprimir / Salvar PDF</button></div><h1>SEMED Integra · Relatório de Acompanhamento do Aluno</h1><p><strong>${esc(s.name)}</strong> · Matrícula ${esc(s.registration)}</p><p>${esc(s.unit_name)} · ${esc(s.class_name)} · Ano letivo ${esc(s.school_year)}</p><p><strong>Acesso restrito.</strong> Recorte das fontes autorizadas e vinculadas. Máscaras preservadas. Não constitui declaração de inexistência de outros registros.</p>${dossierEnrollmentHtml(dossier.enrollments)}<p class="report-period">${esc(options.filterSummary||"Todos os períodos · módulos autorizados")}</p><h2>Informações por módulo</h2>${dossierModuleReportHtml(records,options.modules||(dossier.sources?authorizedDossierModules(dossier):[...new Set(records.map(r=>r.module))])).replaceAll("<details>","<details open>")}<footer><p>Preparado em ${esc(new Date(dossier.emitted_at).toLocaleString("pt-BR"))} · Responsável: ${esc(dossier.issuer)}</p><small>Emissão registrada na auditoria. Não equivale a assinatura digital. Anexos não incluídos.</small></footer></body></html>`;
}

export function mountStudentDossier(node,{supabase}) {
 let data=null,records=[],offset=0,searchTerm="",sequence=0,tab="all",start="",end="",candidates=[],source="sae",requestBusy=false,units=[],unitId="",unitMode="current",layout="modules";
 node.innerHTML=`<div class="intro"><div><span class="badge blue">INTELIGÊNCIA GERENCIAL · ALUNO</span><h2>Relatório de Acompanhamento do Aluno</h2><p>Consulta individual com informações organizadas por módulo, respeitando o sigilo e o alcance de acesso.</p></div></div><article class="panel dossier-filter-panel"><form class="dossier-search"><label>Unidade<select name="unit"><option value="">Carregando unidades autorizadas…</option></select></label><label>Considerar a unidade<select name="unitMode"><option value="current">Atual do aluno</option><option value="record">Onde o registro aconteceu</option></select></label><label class="dossier-search-name">Pesquisar aluno por nome ou matrícula<div class="dossier-name-search"><input name="search" maxlength="120" autocomplete="off" placeholder="Nome ou matrícula"><button type="button" class="secondary" data-find-students>Localizar</button></div></label><label class="dossier-student-choice">Aluno<select name="student" required disabled><option value="">Selecione uma unidade ou pesquise um aluno</option></select><small data-student-page></small></label><label>Módulo<select data-source-filter disabled><option value="all">Todos os autorizados</option></select></label><label>Data inicial<input type="date" data-start></label><label>Data final<input type="date" data-end></label><div class="dossier-search-actions"><button class="primary" type="submit">Consultar</button><button class="secondary" type="button" data-clear-report>Limpar filtros</button><button class="primary" type="button" data-report-print disabled>Imprimir / Salvar PDF</button></div></form><p class="dossier-help" data-unit-help>A unidade atual seleciona os alunos; os registros preservam a unidade onde aconteceram.</p><div class="dossier-message" role="status" aria-live="polite"></div><div class="dossier-results"></div></article><div class="dossier-content"></div>`;
 const message=(text,error=false)=>{const m=node.querySelector(".dossier-message");m.textContent=text;m.className=`dossier-message notice${error?" error":""}`;};
 const rpc=async(name,args)=>{const {data,error}=await supabase.rpc(name,args);if(error)throw new Error(error.message);return data;};
 const sourceCall=async(action,extra={},studentId=data?.student.id)=>{
  const {data:auth,error}=await supabase.auth.getSession();if(error||!auth.session)throw new Error("Entre novamente no Portal.");
  const response=await fetch("https://mqzaaelyiskwshqjwaxy.supabase.co/functions/v1/student-dossier-sources",{method:"POST",headers:{Authorization:`Bearer ${auth.session.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({action,student_id:studentId,...extra}),signal:AbortSignal.timeout(45000)});
  const result=await response.json();if(!response.ok)throw new Error(result.error||"Fonte indisponível.");return result;
 };
 const reportFilters=()=>({module:tab,start,end,unitMode,unitLabel:units.find(u=>u.id===unitId)?.name||""});
 const filtered=()=>filterDossierRecords(dossierTimeline(data,records),reportFilters());
 const filterSummary=()=>`${unitMode==="record"?"Unidade do registro":"Unidade atual"}: ${reportFilters().unitLabel||"Todas as autorizadas"} · Módulo: ${dossierSources[tab]||"Todos os autorizados"} · Período: ${start?date(start):"início não limitado"} a ${end?date(end):"fim não limitado"}`;
 const clearContent=()=>{++sequence;data=null;records=[];node.querySelector(".dossier-content").innerHTML="";node.querySelector("[data-report-print]").disabled=true;};
 async function search() {
  searchTerm=node.querySelector('[name="search"]').value.trim();unitId=node.querySelector('[name="unit"]').value;unitMode=node.querySelector('[name="unitMode"]').value;
  clearContent();const request=sequence;node.querySelector(".dossier-results").innerHTML="";
  const choice=node.querySelector('[name="student"]');choice.disabled=true;choice.innerHTML='<option value="">Carregando alunos…</option>';
  if((!unitId||unitMode==="record") && searchTerm.length<3){choice.innerHTML='<option value="">Pesquise pelo menos 3 caracteres do nome ou matrícula</option>';message("Selecione a unidade atual ou informe pelo menos 3 caracteres para localizar o aluno.");return;}
  message("Localizando alunos no alcance autorizado…");
  try {
   const rows=await rpc("search_student_report",{p_unit:unitMode==="current"?unitId||null:null,p_search:searchTerm,p_offset:offset});if(request!==sequence)return;
   const page=rows.slice(0,25);
   choice.innerHTML='<option value="">Selecione o aluno</option>'+page.map(s=>`<option value="${esc(s.id)}">${esc(s.name)} · Matrícula ${esc(s.registration)} · ${esc(s.class_name)}${unitMode==="record"?` · ${esc(s.unit_name)}`:""}</option>`).join("");choice.disabled=!page.length;
   node.querySelector("[data-student-page]").textContent=page.length?`Página ${offset/25+1} · ${page.length} alunos nesta página. Refine por nome ou matrícula.`:"Nenhum aluno disponível neste alcance.";
   node.querySelector(".dossier-results").innerHTML=(offset>0||rows.length>25)?`<div class="actions"><button type="button" class="secondary" data-prev ${offset===0?"disabled":""}>Alunos anteriores</button><button type="button" class="secondary" data-next ${rows.length<=25?"disabled":""}>Próximos alunos</button></div>`:"";
   const prev=node.querySelector("[data-prev]"),next=node.querySelector("[data-next]");if(prev)prev.onclick=()=>{offset-=25;search();};if(next)next.onclick=()=>{offset+=25;search();};
   message("Selecione o aluno pela matrícula e unidade. Alunos com nomes iguais não são unificados.");
  } catch(e){if(request===sequence)message(e.message,true);}
 }
 async function open(id) {
  const request=++sequence;data=null;records=[];node.querySelector(".dossier-content").innerHTML="";message("Carregando prontuário…");
  try {
   const fresh=await rpc("get_student_dossier",{p_student:id});if(request!==sequence)return;data=fresh;if(tab!=="all"&&!authorizedDossierModules(data).includes(tab))tab="all";render();node.querySelector("[data-report-print]").disabled=true;
   try {const result=await sourceCall("read",{},id);if(request!==sequence)return;records=result.records||[];render();message(result.unavailable?.length?"Algumas fontes estão indisponíveis. A consulta não está completa.":"Relatório consultado. Registros antigos exigem vínculo confirmado; não são unidos pelo nome.");}catch(e){if(request===sequence)message(`Consulta parcial: ${e.message}`,true);}
  } catch(e){if(request===sequence)message(e.message,true);}
 }
 function render() {
  if(!data)return;const s=data.student;const allModules=authorizedDossierModules(data);const visibleSources=allModules.filter(k=>k!=="learning");const visibleModules=allModules.filter(k=>tab==="all"||k===tab);
  const sourceFilter=node.querySelector("[data-source-filter]");sourceFilter.disabled=false;sourceFilter.innerHTML='<option value="all">Todos os autorizados</option>'+allModules.map(k=>`<option value="${k}" ${tab===k?"selected":""}>${dossierSources[k]}</option>`).join("");
  node.querySelector("[data-report-print]").disabled=!data.can_print;
  if(start&&end&&start>end){message("A data inicial não pode ser posterior à data final.",true);node.querySelector(".dossier-content").innerHTML="";node.querySelector("[data-report-print]").disabled=true;return;}
  node.querySelector(".dossier-content").innerHTML=`<article class="panel dossier-identification"><div class="panel-head"><div><span class="badge blue">IDENTIFICAÇÃO DO ALUNO</span><h2>${esc(s.name)}</h2><p>Matrícula ${esc(s.registration)} · ${s.active?"Ativo":"Inativo"}</p></div><button type="button" class="secondary" data-reload>Atualizar consulta</button></div><p><strong>${esc(s.unit_name)}</strong> · ${esc(s.class_name)} · Ano letivo ${esc(s.school_year)}</p><small>Unidade atual do aluno. Cada registro abaixo mantém a unidade onde aconteceu.</small></article><article class="panel dossier-report"><div class="panel-head"><div><h3>Informações do aluno por módulo</h3><p>${esc(filterSummary())}</p></div><div class="actions dossier-layout"><button type="button" class="${layout==="modules"?"primary":"secondary"}" data-report-layout="modules" aria-pressed="${layout==="modules"}">Por módulo</button><button type="button" class="${layout==="timeline"?"primary":"secondary"}" data-report-layout="timeline" aria-pressed="${layout==="timeline"}">Ver linha do tempo</button></div></div>${layout==="modules"?dossierModuleReportHtml(filtered(),visibleModules,data.can_link):dossierRecordsHtml(filtered(),data.can_link)}</article><details class="panel dossier-enrollment"><summary>Histórico de lotação escolar</summary>${dossierEnrollmentHtml(data.enrollments)}</details>${data.can_link?`<article class="panel dossier-link"><h3>Vincular registro existente</h3><p class="dossier-help">Pesquise e confira a identidade antes de confirmar. Esta ação não cria, transfere nem altera o atendimento original.</p><form data-link-search class="dossier-filters"><label>Sistema<select name="source">${visibleSources.map(k=>`<option value="${k}" ${source===k?"selected":""}>${dossierSources[k]}</option>`).join("")}</select></label><label>Nome na origem ou protocolo CP<input name="term" maxlength="120" minlength="3" required value="${esc(source==="protected"?"":s.name)}"></label><button class="secondary" ${visibleSources.length?"":"disabled"}>Localizar registros</button></form><div data-candidates></div></article>`:""}`;
  node.querySelectorAll(".dossier-event details").forEach(d=>d.open=false);
  node.querySelector("[data-reload]").onclick=()=>open(s.id);
  node.querySelectorAll("[data-report-layout]").forEach(b=>b.onclick=()=>{layout=b.dataset.reportLayout;render();});
  const sourceSelect=node.querySelector('[data-link-search] [name="source"]');
  if(sourceSelect)sourceSelect.onchange=()=>{source=sourceSelect.value;node.querySelector('[data-link-search] [name="term"]').value=source==="protected"?"":s.name;};
  node.querySelectorAll("[data-unlink-record]").forEach(b=>b.onclick=async()=>{
   if(!window.confirm("Desvincular este registro do prontuário? O registro original será preservado e a alteração ficará na auditoria."))return;
   b.disabled=true;
   try{await sourceCall("unlink",{source:b.dataset.unlinkSource,record_id:b.dataset.unlinkRecord},s.id);await open(s.id);}catch(e){message(e.message,true);b.disabled=false;}
  });
  node.querySelector("[data-link-search]")?.addEventListener("submit",async e=>{
   e.preventDefault();if(requestBusy)return;requestBusy=true;const studentId=s.id;const request=sequence;
   const f=new FormData(e.currentTarget);source=f.get("source");const out=node.querySelector("[data-candidates]");out.textContent="Pesquisando na fonte autorizada…";
   try {const result=await sourceCall("candidates",{source,search:f.get("term")},studentId);if(request!==sequence)return;candidates=result.candidates;
    out.innerHTML=candidates.map((r,i)=>`<div class="dossier-candidate"><strong>${esc(r.name)}</strong><span>${esc(r.protocol||r.id)} · ${esc(r.unit)} · ${date(r.date)}${r.birth_date?` · Nascimento: ${date(r.birth_date)}`:""}</span><label><input type="checkbox" data-confirm="${i}"> Conferi a identidade e confirmo que este registro pertence ao aluno da matrícula ${esc(s.registration)}.</label><button class="secondary" data-link="${i}">Confirmar vínculo</button></div>`).join("")||'<p>Nenhum registro disponível. Para Comunicação Protegida, informe o protocolo completo.</p>';
    out.querySelectorAll("[data-link]").forEach(b=>b.onclick=async()=>{const i=Number(b.dataset.link);if(!out.querySelector(`[data-confirm="${i}"]`).checked){message("Confirme a identidade antes de vincular.",true);return;}b.disabled=true;try{await sourceCall("link",{source,record_id:candidates[i].id,person_id:candidates[i].person_id,confirmed:true},studentId);await open(studentId);}catch(e){message(e.message,true);b.disabled=false;}});
   }catch(e){if(request===sequence)out.textContent=e.message;}finally{requestBusy=false;}
  });
 }
 async function print() {
  const studentId=data.student.id;const filtersSnapshot={...reportFilters()},summarySnapshot=filterSummary();const popup=window.open("","_blank");if(!popup){message("Permita abrir a prévia de impressão.",true);return;}popup.opener=null;popup.document.body.textContent="Preparando prontuário atualizado…";
  try {const fresh=await rpc("get_student_dossier",{p_student:studentId,p_action:"PRINT"});const result=await sourceCall("read",{},studentId);if(result.unavailable?.length)throw new Error("Há fontes indisponíveis. Atualize antes de imprimir o prontuário.");
   const all=filterDossierRecords(dossierTimeline(fresh,result.records),filtersSnapshot);const modules=authorizedDossierModules(fresh).filter(k=>filtersSnapshot.module==="all"||k===filtersSnapshot.module);popup.document.open();popup.document.write(dossierPrintHtml(fresh,all,{modules,filterSummary:summarySnapshot}));popup.document.close();popup.document.querySelectorAll("details").forEach(d=>d.open=true);popup.document.querySelector("#print-dossier").onclick=async()=>{await popup.document.fonts.ready;popup.focus();popup.print();};
  }catch(e){popup.close();message(e.message,true);}
 }
 node.querySelector(".dossier-search").onsubmit=e=>{e.preventDefault();const id=node.querySelector('[name="student"]').value;if(!id){message("Localize e selecione um aluno antes de consultar.",true);return;}if(start&&end&&start>end){message("Confira o período informado.",true);return;}open(id);};
 node.querySelector("[data-find-students]").onclick=()=>{offset=0;search();};
 node.querySelector('[name="search"]').onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();offset=0;search();}};
 node.querySelector('[name="unit"]').onchange=()=>{offset=0;search();};
 node.querySelector('[name="unitMode"]').onchange=()=>{unitMode=node.querySelector('[name="unitMode"]').value;node.querySelector("[data-unit-help]").textContent=unitMode==="record"?"Localize o aluno pelo nome ou matrícula. A unidade selecionada filtra onde os registros aconteceram, inclusive antes de transferências.":"A unidade atual seleciona os alunos; os registros preservam a unidade onde aconteceram.";offset=0;search();};
 node.querySelector('[name="student"]').onchange=()=>{clearContent();message("Clique em Consultar para carregar as informações do aluno selecionado.");};
 node.querySelector("[data-source-filter]").onchange=e=>{tab=e.target.value;render();};
 node.querySelector("[data-start]").onchange=e=>{start=e.target.value;render();};node.querySelector("[data-end]").onchange=e=>{end=e.target.value;render();};
 node.querySelector("[data-report-print]").onclick=()=>{if(data?.can_print)print();};
 node.querySelector("[data-clear-report]").onclick=()=>{node.querySelector(".dossier-search").reset();clearContent();offset=0;unitId="";unitMode="current";tab="all";start="";end="";layout="modules";const choice=node.querySelector('[name="student"]');choice.innerHTML='<option value="">Selecione uma unidade ou pesquise um aluno</option>';choice.disabled=true;node.querySelector("[data-source-filter]").disabled=true;node.querySelector(".dossier-results").innerHTML="";node.querySelector("[data-student-page]").textContent="";node.querySelector("[data-unit-help]").textContent="A unidade atual seleciona os alunos; os registros preservam a unidade onde aconteceram.";message("Filtros limpos. Selecione a unidade ou pesquise o aluno.");};
 rpc("get_student_report_units",{}).then(rows=>{units=rows;node.querySelector('[name="unit"]').innerHTML='<option value="">Todas as unidades autorizadas</option>'+units.map(u=>`<option value="${esc(u.id)}">${esc(u.name)}</option>`).join("");}).catch(e=>{node.querySelector('[name="unit"]').innerHTML='<option value="">Unidades indisponíveis</option>';message(e.message,true);});
}
