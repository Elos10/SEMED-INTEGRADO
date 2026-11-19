export const dossierSources = { learning:"Avaliações", active_search:"Busca Ativa", sae:"Atendimentos SAE", incidents:"Incidentes Escolares", protected:"Comunicação Protegida" };
export const escapeDossier = value => String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const esc=escapeDossier;
const display=value=>value===null||value===undefined||value===""?"Não informado":String(value);
const date=value=>value?new Date(String(value).length===10?`${value}T12:00:00`:value).toLocaleDateString("pt-BR"):"Não informada";
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
export function dossierPrintHtml(dossier,records) {
 const s=dossier.student;
 return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Prontuário integrado</title><style>@page{size:A4 portrait;margin:10mm;@bottom-right{content:"Página " counter(page) " de " counter(pages)}}body{font:10pt Calibri,Arial,sans-serif;color:#000;background:#fff}h1{font-size:15pt}h2{font-size:11pt;background:#eef1f5;padding:4px}p{margin:4px 0}.dossier-event{border-bottom:1px solid #ccc;padding:8px 0;break-inside:avoid}.dossier-event-head{display:flex;gap:12px;flex-wrap:wrap}dl{display:grid;grid-template-columns:1fr 1fr;gap:8px}dt{font-weight:bold}dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}a,summary,.dossier-event>small{display:none}table{width:100%;border-collapse:collapse}th,td{padding:4px;border-bottom:1px solid #ddd;text-align:left}thead{display:table-header-group}tr{break-inside:avoid}small{font-size:8pt}.print-toolbar{margin-bottom:10px}@media print{.print-toolbar{display:none}}</style></head><body><div class="print-toolbar"><button id="print-dossier">Imprimir / Salvar PDF</button></div><h1>SEMED Integra · Prontuário Integrado do Aluno</h1><p><strong>${esc(s.name)}</strong> · Matrícula ${esc(s.registration)}</p><p>${esc(s.unit_name)} · ${esc(s.class_name)} · Ano letivo ${esc(s.school_year)}</p><p><strong>Acesso restrito.</strong> Recorte das fontes autorizadas e vinculadas. Máscaras preservadas. Não constitui declaração de inexistência de outros registros.</p>${dossierEnrollmentHtml(dossier.enrollments)}<h2>Registros consultados</h2>${dossierRecordsHtml(records)}<footer><p>Preparado em ${esc(new Date(dossier.emitted_at).toLocaleString("pt-BR"))} · Responsável: ${esc(dossier.issuer)}</p><small>Emissão registrada na auditoria. Não equivale a assinatura digital. Anexos não incluídos.</small></footer></body></html>`;
}

export function mountStudentDossier(node,{supabase}) {
 let data=null,records=[],offset=0,searchTerm="",sequence=0,tab="all",start="",end="",candidates=[],source="sae",requestBusy=false;
 node.innerHTML=`<div class="intro"><div><h2>Consulta Integrada do Aluno</h2><p>Prontuário individual restrito · informações dos sistemas sem duplicar os registros originais.</p></div></div><article class="panel"><form class="dossier-search"><label>Nome ou matrícula do aluno<input name="search" required minlength="3" maxlength="120" autocomplete="off" placeholder="Digite pelo menos 3 caracteres"></label><button class="primary">Pesquisar aluno</button></form><p class="dossier-help">A busca respeita sua unidade, diretoria ou alcance institucional e o acesso ao cadastro escolar.</p><div class="dossier-message" role="status" aria-live="polite"></div><div class="dossier-results"></div></article><div class="dossier-content"></div>`;
 const message=(text,error=false)=>{const m=node.querySelector(".dossier-message");m.textContent=text;m.className=`dossier-message notice${error?" error":""}`;};
 const rpc=async(name,args)=>{const {data,error}=await supabase.rpc(name,args);if(error)throw new Error(error.message);return data;};
 const sourceCall=async(action,extra={},studentId=data?.student.id)=>{
  const {data:auth,error}=await supabase.auth.getSession();if(error||!auth.session)throw new Error("Entre novamente no Portal.");
  const response=await fetch("https://mqzaaelyiskwshqjwaxy.supabase.co/functions/v1/student-dossier-sources",{method:"POST",headers:{Authorization:`Bearer ${auth.session.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({action,student_id:studentId,...extra}),signal:AbortSignal.timeout(45000)});
  const result=await response.json();if(!response.ok)throw new Error(result.error||"Fonte indisponível.");return result;
 };
 const filtered=()=>dossierTimeline(data,records).filter(r=>(tab==="all"||r.module===tab)&&(!start||String(r.date||"").slice(0,10)>=start)&&(!end||String(r.date||"").slice(0,10)<=end));
 async function search() {
  const request=++sequence;data=null;records=[];node.querySelector(".dossier-content").innerHTML="";node.querySelector(".dossier-results").innerHTML="";message("Pesquisando…");
  try {
   const rows=await rpc("search_student_dossiers",{p_search:searchTerm,p_offset:offset});if(request!==sequence)return;
   const page=rows.slice(0,25);
   node.querySelector(".dossier-results").innerHTML=page.length?`<div class="table-wrap"><table><thead><tr><th>Aluno / matrícula</th><th>Unidade</th><th>Ano / turma</th><th>Ação</th></tr></thead><tbody>${page.map(s=>`<tr><td><strong>${esc(s.name)}</strong><br>${esc(s.registration)}</td><td>${esc(s.unit_name)}</td><td>${esc(s.school_year)} · ${esc(s.class_name)}</td><td><button class="secondary" data-open-student="${esc(s.id)}">Abrir prontuário</button></td></tr>`).join("")}</tbody></table></div><div class="actions"><button class="secondary" data-prev ${offset===0?"disabled":""}>Anterior</button><span>Página ${offset/25+1}</span><button class="secondary" data-next ${rows.length<=25?"disabled":""}>Próxima</button></div>`:'<p class="empty">Nenhum aluno disponível para esta pesquisa e este alcance.</p>';
   node.querySelectorAll("[data-open-student]").forEach(b=>b.onclick=()=>open(b.dataset.openStudent));
   const prev=node.querySelector("[data-prev]"),next=node.querySelector("[data-next]");if(prev)prev.onclick=()=>{offset-=25;search();};if(next)next.onclick=()=>{offset+=25;search();};
   message("Selecione o aluno pela matrícula e unidade. Alunos com nomes iguais não são unificados.");
  } catch(e){if(request===sequence)message(e.message,true);}
 }
 async function open(id) {
  const request=++sequence;data=null;records=[];node.querySelector(".dossier-content").innerHTML="";message("Carregando prontuário…");
  try {
   const fresh=await rpc("get_student_dossier",{p_student:id});if(request!==sequence)return;data=fresh;tab="all";start="";end="";render();
   try {const result=await sourceCall("read",{},id);if(request!==sequence)return;records=result.records;render();message(result.unavailable?.length?"Algumas fontes estão indisponíveis. A consulta não está completa.":"Prontuário consultado. Registros antigos exigem vínculo confirmado; não são unidos pelo nome.");}catch(e){if(request===sequence)message(`Consulta parcial: ${e.message}`,true);}
  } catch(e){if(request===sequence)message(e.message,true);}
 }
 function render() {
  if(!data)return;const s=data.student;const visibleSources=Object.keys(data.sources).filter(k=>data.sources[k]);
  node.querySelector(".dossier-content").innerHTML=`<article class="panel dossier-identification"><div class="panel-head"><div><h2>${esc(s.name)}</h2><p>Matrícula ${esc(s.registration)} · ${s.active?"Ativo":"Inativo"}</p></div><div class="actions"><button class="secondary" data-reload>Atualizar consulta</button>${data.can_print?'<button class="primary" data-dossier-print>Imprimir prontuário</button>':""}</div></div><p><strong>${esc(s.unit_name)}</strong> · ${esc(s.class_name)} · Ano letivo ${esc(s.school_year)}</p><small>A matrícula escolar identifica este prontuário. A unidade acima é a lotação atual; cada registro mantém sua unidade de origem.</small></article><article class="panel">${dossierEnrollmentHtml(data.enrollments)}</article><article class="panel dossier-timeline"><h3>Linha do tempo e acompanhamentos</h3><p class="dossier-help">Somente registros vinculados e permitidos. As informações completas, os documentos e a edição permanecem nos sistemas de origem.</p><div class="dossier-filters"><label>Sistema<select data-source-filter><option value="all">Todos os sistemas autorizados</option>${["learning",...visibleSources].map(k=>`<option value="${k}" ${tab===k?"selected":""}>${dossierSources[k]}</option>`).join("")}</select></label><label>Data inicial<input type="date" data-start value="${start}"></label><label>Data final<input type="date" data-end value="${end}"></label></div><div class="dossier-events">${dossierRecordsHtml(filtered(),data.can_link)}</div></article>${data.can_link?`<article class="panel dossier-link"><h3>Vincular registro existente</h3><p class="dossier-help">Pesquise e confira a identidade antes de confirmar. Esta ação não cria, transfere nem altera o atendimento original.</p><form data-link-search class="dossier-filters"><label>Sistema<select name="source">${visibleSources.map(k=>`<option value="${k}" ${source===k?"selected":""}>${dossierSources[k]}</option>`).join("")}</select></label><label>Nome na origem ou protocolo CP<input name="term" maxlength="120" minlength="3" required value="${esc(source==="protected"?"":s.name)}"></label><button class="secondary" ${visibleSources.length?"":"disabled"}>Localizar registros</button></form><div data-candidates></div></article>`:""}`;
  node.querySelectorAll(".dossier-event details").forEach(d=>d.open=false);
  node.querySelector("[data-reload]").onclick=()=>open(s.id);
  node.querySelector("[data-source-filter]").onchange=e=>{tab=e.target.value;render();};node.querySelector("[data-start]").onchange=e=>{start=e.target.value;render();};node.querySelector("[data-end]").onchange=e=>{end=e.target.value;render();};
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
  const studentId=data.student.id;const popup=window.open("","_blank");if(!popup){message("Permita abrir a prévia de impressão.",true);return;}popup.opener=null;popup.document.body.textContent="Preparando prontuário atualizado…";
  try {const fresh=await rpc("get_student_dossier",{p_student:studentId,p_action:"PRINT"});const result=await sourceCall("read",{},studentId);if(result.unavailable?.length)throw new Error("Há fontes indisponíveis. Atualize antes de imprimir o prontuário.");
   const all=dossierTimeline(fresh,result.records);popup.document.open();popup.document.write(dossierPrintHtml(fresh,all));popup.document.close();popup.document.querySelectorAll("details").forEach(d=>d.open=true);popup.document.querySelector("#print-dossier").onclick=async()=>{await popup.document.fonts.ready;popup.focus();popup.print();};
  }catch(e){popup.close();message(e.message,true);}
 }
 node.querySelector(".dossier-search").onsubmit=e=>{e.preventDefault();searchTerm=new FormData(e.currentTarget).get("search").trim();offset=0;search();};
}
