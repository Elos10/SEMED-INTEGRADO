import { requestStudentSources } from "./student-source-client.js?v=20261123-auth-3";
import { mountStudentUnitBrowser, studentSeries } from "./student-unit-browser.js?v=20261123-auth-3";

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
 return [...assessments,...records.map(r=>r.module==="protected"?{...r,summary:"****",details:{"Pessoa protegida":"****","Descrição":"****","Providências":"****"}}:r)].sort((a,b)=>String(a.date||"9999").localeCompare(String(b.date||"9999")));
}
export function dossierRecordsHtml(records,canUnlink=false) {
 const ordered=[...records].sort((a,b)=>String(a.date||"9999").localeCompare(String(b.date||"9999")));
 return ordered.map(row=>{
 const r=row.module==="protected"?{...row,summary:"****",details:{"Pessoa protegida":"****","Descrição":"****","Providências":"****"}}:row;
 return `<article class="dossier-event"><header class="dossier-event-head"><strong>${esc(date(r.date))} · ${esc(dossierSources[r.module]||r.title)}</strong><span>Protocolo: ${esc(display(r.protocol))}</span></header><dl><div><dt>Unidade do registro</dt><dd>${esc(display(r.unit))}</dd></div><div><dt>Situação</dt><dd>${esc(display(r.status).replaceAll("_"," "))}</dd></div><div class="dossier-field-wide"><dt>Informação registrada</dt><dd>${esc(display(r.summary))}</dd></div>${Object.entries(r.details||{}).map(([k,v])=>`<div class="${String(v??"").length>100?"dossier-field-wide":""}"><dt>${esc(k)}</dt><dd>${esc(display(v))}</dd></div>`).join("")}</dl><div class="report-controls">${canUnlink&&r.module!=="learning"?`<button class="secondary" data-unlink-source="${esc(r.module)}" data-unlink-record="${esc(r.id)}">Desvincular do prontuário</button>`:""} <a class="secondary" href="${r.module==="learning"?"/avaliacoes/":"/crei-sae/"}" target="_blank" rel="noopener">Abrir sistema de origem</a></div></article>`;
 }).join("")||'<p class="empty">Nenhum registro vinculado e disponível neste recorte. Isso não significa ausência de acompanhamentos.</p>';
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
 return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de Acompanhamento do Aluno</title><style>@page{size:A4 portrait;margin:10mm;@bottom-right{content:"Página " counter(page) " de " counter(pages)}}body{font:10pt Calibri,Arial,sans-serif;color:#000;background:#fff}h1{font-size:15pt}h2{font-size:11pt;background:#eef1f5;padding:4px}p{margin:4px 0}.dossier-event{border-bottom:1px solid #ccc;padding:8px 0;break-inside:avoid}.dossier-event-head{display:flex;gap:12px;flex-wrap:wrap}dl{display:grid;grid-template-columns:1fr 1fr;gap:6px 12px}.dossier-field-wide{grid-column:1/-1}.dossier-event-head{background:#eef1f5;border-bottom:1px solid #aab6c8;padding:5px}dl>div{min-width:0;border-bottom:1px solid #ddd;padding:3px 0}.dossier-event{break-inside:auto}.dossier-event-head,dl>div{break-inside:avoid}dt{font-weight:bold}dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}a,summary,.dossier-event>small,.report-controls{display:none}details{display:block}.dossier-module>header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ccc;margin-top:12px}h3{font-size:11pt}.dossier-row-detail td{border-top:0}tbody{break-inside:avoid}dd{overflow-wrap:anywhere}table{width:100%;border-collapse:collapse}th,td{padding:4px;border-bottom:1px solid #ddd;text-align:left}thead{display:table-header-group}tr{break-inside:avoid}small{font-size:8pt}.print-toolbar{margin-bottom:10px}@media print{.print-toolbar{display:none}}</style></head><body><div class="print-toolbar"><button id="print-dossier">Imprimir / Salvar PDF</button></div><h1>SEMED Integra · Relatório de Acompanhamento do Aluno</h1><p><strong>${esc(s.name)}</strong> · Matrícula ${esc(s.registration)}</p><p>${esc(s.unit_name)} · Série ${esc(studentSeries(s))} · Turma ${esc(s.class_name)} · Ano letivo ${esc(s.school_year)}</p><p><strong>Acesso restrito.</strong> Recorte das fontes autorizadas e vinculadas. Máscaras preservadas. Não constitui declaração de inexistência de outros registros.</p>${dossierEnrollmentHtml(dossier.enrollments)}<p class="report-period">${esc(options.filterSummary||"Todos os períodos · módulos autorizados")}</p><h2>Histórico integrado do aluno</h2>${dossierRecordsHtml(records)}<footer><p>Preparado em ${esc(new Date(dossier.emitted_at).toLocaleString("pt-BR"))} · Responsável: ${esc(dossier.issuer)}</p><small>Emissão registrada na auditoria. Não equivale a assinatura digital. Anexos não incluídos.</small></footer></body></html>`;
}

export function mountStudentDossier(node,{supabase}) {
 let sourcesReady=false,sourceError="",data=null,records=[],sequence=0,recordUnitId="",tab="all",start="",end="",candidates=[],source="sae",requestBusy=false,units=[],unitId="",unitMode="current";
 node.innerHTML=`<div class="intro"><div><span class="badge blue">INTELIGÊNCIA GERENCIAL · ALUNO</span><h2>Relatório de Acompanhamento do Aluno</h2><p>Consulta individual com histórico cronológico integrado, respeitando o sigilo e o alcance de acesso.</p></div></div><article class="panel dossier-filter-panel"><form class="dossier-search"><label>Unidade atual do aluno<select name="unit"><option value="">Carregando unidades autorizadas…</option></select></label><label>Registros do aluno<select name="unitMode"><option value="current">Histórico completo autorizado</option><option value="record">Filtrar pela unidade do registro</option></select></label><label data-record-unit-field hidden>Unidade onde o registro aconteceu<select name="recordUnit"><option value="">Todas as unidades autorizadas</option></select></label><label class="dossier-search-name">Pesquisar aluno por nome ou matrícula<div class="dossier-name-search"><input name="search" maxlength="120" autocomplete="off" placeholder="Nome ou matrícula"><button type="button" class="secondary" data-find-students>Localizar</button></div></label><label>Módulo<select data-source-filter disabled><option value="all">Todos os autorizados</option></select></label><label>Data inicial<input type="date" data-start></label><label>Data final<input type="date" data-end></label><div class="dossier-search-actions"><button class="primary" type="submit">Consultar</button><button class="secondary" type="button" data-clear-report>Limpar filtros</button><button class="primary" type="button" data-report-print disabled>Imprimir / Salvar PDF</button></div></form><p class="dossier-help" data-unit-help>As unidades mostram o total de alunos. Expanda a unidade e clique no aluno para abrir o relatório.</p><div class="dossier-message" role="status" aria-live="polite"></div><div class="dossier-results"></div></article><div class="dossier-content"></div>`;
 const message=(text,error=false)=>{const m=node.querySelector(".dossier-message");m.textContent=text;m.className=`dossier-message notice${error?" error":""}`;};
 const rpc=async(name,args)=>{const {data,error}=await supabase.rpc(name,args);if(error)throw new Error(error.message);return data;};
 const sourceCall=async(action,extra={},studentId=data?.student.id)=>{
  const {data:auth,error}=await supabase.auth.getSession();if(error||!auth.session)throw new Error("Entre novamente no Portal.");
  return requestStudentSources({token:auth.session.access_token,body:{action,student_id:studentId,...extra},refreshToken:async()=>{
   const {data:fresh,error:refreshError}=await supabase.auth.refreshSession();
   if(refreshError||!fresh.session)throw new Error("Não foi possível renovar seu acesso. Entre novamente no portal.");
   return fresh.session.access_token;
  }});
 };
 const reportFilters=()=>({module:tab,start,end,unitMode,unitLabel:units.find(u=>u.id===(unitMode==="record"?recordUnitId:unitId))?.name||""});
 const filtered=()=>filterDossierRecords(dossierTimeline(data,records),reportFilters());
 const filterSummary=()=>`Unidade atual: ${units.find(u=>u.id===unitId)?.name||"Todas as autorizadas"} · Registros: ${unitMode==="record"?(reportFilters().unitLabel||"Todas as unidades autorizadas"):"Histórico completo autorizado"} · Módulo: ${dossierSources[tab]||"Todos os autorizados"} · Período: ${start?date(start):"início não limitado"} a ${end?date(end):"fim não limitado"}`;
 const clearContent=()=>{++sequence;data=null;records=[];node.querySelector(".dossier-content").innerHTML="";node.querySelector("[data-report-print]").disabled=true;};
 const unitBrowser=mountStudentUnitBrowser(node.querySelector(".dossier-results"),{rpc,onSelect:id=>open(id),onMessage:message});
 async function search() {
  unitId=node.querySelector('[name="unit"]').value;
  clearContent();
  await unitBrowser.refresh({unit:unitId,search:node.querySelector('[name="search"]').value.trim()});
 }
 async function open(id) {
  const request=++sequence;sourcesReady=false;sourceError="";data=null;records=[];node.querySelector(".dossier-content").innerHTML="";message("Carregando prontuário…");
  try {
   const fresh=await rpc("get_student_dossier",{p_student:id});if(request!==sequence)return;data=fresh;if(tab!=="all"&&!authorizedDossierModules(data).includes(tab))tab="all";render();node.querySelectorAll("[data-report-print],[data-dossier-print]").forEach(b=>b.disabled=true);requestAnimationFrame(()=>node.querySelector(".dossier-identification")?.scrollIntoView({behavior:"smooth",block:"start"}));
   try {const result=await sourceCall("read",{},id);if(request!==sequence)return;records=result.records||[];sourcesReady=!result.unavailable?.length;sourceError=sourcesReady?"":"Algumas fontes estão indisponíveis. Atualize para consultar o histórico completo.";render();message(result.unavailable?.length?"Algumas fontes estão indisponíveis. A consulta não está completa.":"Relatório consultado. Registros antigos exigem vínculo confirmado; não são unidos pelo nome.");}catch(e){if(request===sequence){sourceError=e.message;render();message(`Consulta parcial: ${e.message}`,true);}}
  } catch(e){if(request===sequence)message(e.message,true);}
 }
 function render() {
  if(!data)return;const s=data.student;const allModules=authorizedDossierModules(data);const visibleSources=allModules.filter(k=>k!=="learning");
  const sourceFilter=node.querySelector("[data-source-filter]");sourceFilter.disabled=false;sourceFilter.innerHTML='<option value="all">Todos os autorizados</option>'+allModules.map(k=>`<option value="${k}" ${tab===k?"selected":""}>${dossierSources[k]}</option>`).join("");
  node.querySelector("[data-report-print]").disabled=!data.can_print||!sourcesReady;
  if(start&&end&&start>end){message("A data inicial não pode ser posterior à data final.",true);node.querySelector(".dossier-content").innerHTML="";node.querySelector("[data-report-print]").disabled=true;return;}
  node.querySelector(".dossier-content").innerHTML=`<article class="panel dossier-identification dossier-unified-report"><div class="panel-head"><div><span class="badge blue">IDENTIFICAÇÃO DO ALUNO</span><h2>${esc(s.name)}</h2><p>Matrícula ${esc(s.registration)} · ${s.active?"Ativo":"Inativo"}</p></div><div class="actions"><button type="button" class="secondary" data-reload>Atualizar consulta</button>${data.can_print?`<button type="button" class="primary" data-dossier-print ${sourcesReady?"":"disabled"}>Imprimir / Salvar PDF</button>`:""}</div></div><p><strong>${esc(s.unit_name)}</strong> · Série ${esc(studentSeries(s))} · Turma ${esc(s.class_name)} · Ano letivo ${esc(s.school_year)}</p><small>Unidade atual do aluno. Cada registro abaixo mantém a unidade onde aconteceu.</small><section class="dossier-report"><div class="panel-head"><div><h3>Histórico integrado do aluno</h3><p>${esc(filterSummary())}</p></div></div>${sourceError?`<p class="notice error" role="alert">${esc(sourceError)} As informações abaixo podem estar incompletas.</p>`:!sourcesReady?'<p role="status">Carregando registros das fontes autorizadas…</p>':""}${sourcesReady||filtered().length?dossierRecordsHtml(filtered(),data.can_link):""}</section><section class="dossier-enrollment">${dossierEnrollmentHtml(data.enrollments)}</section></article>${data.can_link?`<details class="panel dossier-link"><summary>Gerenciar vínculos de registros existentes</summary><p class="dossier-help">Pesquise e confira a identidade antes de confirmar. Esta ação não cria, transfere nem altera o atendimento original.</p><form data-link-search class="dossier-filters"><label>Sistema<select name="source">${visibleSources.map(k=>`<option value="${k}" ${source===k?"selected":""}>${dossierSources[k]}</option>`).join("")}</select></label><label>Nome na origem ou protocolo CP<input name="term" maxlength="120" minlength="3" required value="${esc(source==="protected"?"":s.name)}"></label><button class="secondary" ${visibleSources.length?"":"disabled"}>Localizar registros</button></form><div data-candidates></div></details>`:""}`;

  node.querySelector("[data-reload]").onclick=()=>open(s.id);
  node.querySelector("[data-dossier-print]")?.addEventListener("click",print);
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
 node.querySelector(".dossier-search").onsubmit=e=>{e.preventDefault();if(start&&end&&start>end){message("Confira o período informado.",true);return;}if(data?.student?.id)open(data.student.id);else search();};
 node.querySelector("[data-find-students]").onclick=()=>search();
 node.querySelector('[name="search"]').onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();search();}};
 node.querySelector('[name="unit"]').onchange=()=>search();
 node.querySelector('[name="unitMode"]').onchange=()=>{unitMode=node.querySelector('[name="unitMode"]').value;node.querySelector("[data-record-unit-field]").hidden=unitMode!=="record";render();};
 node.querySelector('[name="recordUnit"]').onchange=e=>{recordUnitId=e.target.value;render();};
 node.querySelector("[data-source-filter]").onchange=e=>{tab=e.target.value;render();};
 node.querySelector("[data-start]").onchange=e=>{start=e.target.value;render();};node.querySelector("[data-end]").onchange=e=>{end=e.target.value;render();};
 node.querySelector("[data-report-print]").onclick=()=>{if(data?.can_print&&sourcesReady)print();};
 node.querySelector("[data-clear-report]").onclick=()=>{node.querySelector(".dossier-search").reset();unitId="";recordUnitId="";unitMode="current";tab="all";start="";end="";node.querySelector("[data-record-unit-field]").hidden=true;node.querySelector("[data-source-filter]").disabled=true;search();};
 rpc("get_student_report_units",{}).then(rows=>{units=rows;const options='<option value="">Todas as unidades autorizadas</option>'+units.map(u=>`<option value="${esc(u.id)}">${esc(u.name)}</option>`).join("");node.querySelector('[name="unit"]').innerHTML=options;node.querySelector('[name="recordUnit"]').innerHTML=options;search();}).catch(e=>{node.querySelector('[name="unit"]').innerHTML='<option value="">Unidades indisponíveis</option>';message(e.message,true);});
}
