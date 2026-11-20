const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
export function studentSeries(student) {
 return student.grade===null||student.grade===undefined?"Não informada":/^\d+$/.test(String(student.grade))?`${student.grade}º Ano`:String(student.grade);
}
export function studentUnitGroupsHtml(groups,expanded=new Map(),selected="") {
 if(!groups.length)return '<p class="dossier-empty">Nenhuma unidade com alunos disponível neste filtro e alcance.</p>';
 return `<div class="table-wrap dossier-unit-table"><table><thead><tr><th>Unidade atual do aluno</th><th>Quantidade de alunos</th></tr></thead>${groups.map(group=>{
  const state=expanded.get(group.id),isOpen=!!state;
  const detail=!isOpen?"":state.loading?'<p role="status">Carregando alunos desta unidade…</p>':state.error?`<p role="alert">${esc(state.error)}</p><button type="button" class="secondary" data-unit-retry="${esc(group.id)}">Tentar novamente</button>`:`<table class="dossier-unit-students"><thead><tr><th>Aluno</th><th>Série</th><th>Turma</th></tr></thead><tbody>${state.rows.map(s=>`<tr class="${selected===s.id?"student-selected":""}"><td><button type="button" data-open-student="${esc(s.id)}"><strong>${esc(s.name)}</strong></button><small>Matrícula ${esc(s.registration)}${s.active===false?" · Inativo":""}</small></td><td>${esc(studentSeries(s))}</td><td>${esc(s.class_name)}</td></tr>`).join("")||'<tr><td colspan="3">Nenhum aluno disponível nesta unidade e neste filtro.</td></tr>'}</tbody></table><div class="actions dossier-unit-pages"><button type="button" class="secondary" data-unit-page="${esc(group.id)}" data-direction="prev" ${state.offset===0?"disabled":""}>Anterior</button><span>Página ${state.offset/25+1}</span><button type="button" class="secondary" data-unit-page="${esc(group.id)}" data-direction="next" ${!state.more?"disabled":""}>Próxima</button></div>`;
  return `<tbody><tr><td><button type="button" class="dossier-unit-toggle" data-unit-toggle="${esc(group.id)}" aria-expanded="${isOpen}" aria-controls="students-${esc(group.id)}"><span aria-hidden="true">${isOpen?"▾":"▸"}</span> ${esc(group.name)}</button></td><td><span class="dossier-unit-count">${Number(group.student_count).toLocaleString("pt-BR")} aluno(s)</span></td></tr>${isOpen?`<tr><td colspan="2" id="students-${esc(group.id)}" class="dossier-unit-detail">${detail}</td></tr>`:""}</tbody>`;
 }).join("")}</table></div>`;
}
export function mountStudentUnitBrowser(node,{rpc,onSelect,onMessage=()=>{}}) {
 let groups=[],expanded=new Map(),cache=new Map(),revision=0,term="",selected="";
 function render() {
  node.innerHTML=`<div class="dossier-unit-heading"><h3>Unidades e alunos</h3><p>Clique na unidade para expandir ou recolher os alunos. Clique no nome do aluno para abrir o relatório completo.</p><small>Quantidades de alunos cadastrados no alcance autorizado${term?", conforme a pesquisa por nome ou matrícula":""}; não são quantidades de atendimentos.</small></div>`+studentUnitGroupsHtml(groups,expanded,selected);
  node.querySelectorAll("[data-unit-toggle]").forEach(b=>b.onclick=()=>{
   const id=b.dataset.unitToggle;if(expanded.has(id)){expanded.delete(id);render();return;}
   const saved=cache.get(id);if(saved){expanded.set(id,saved);render();}else loadStudents(id,0);
  });
  node.querySelectorAll("[data-unit-page]").forEach(b=>b.onclick=()=>{const id=b.dataset.unitPage,state=expanded.get(id);loadStudents(id,state.offset+(b.dataset.direction==="next"?25:-25));});
  node.querySelectorAll("[data-unit-retry]").forEach(b=>b.onclick=()=>loadStudents(b.dataset.unitRetry,0));
  node.querySelectorAll("[data-open-student]").forEach(b=>b.onclick=()=>{selected=b.dataset.openStudent;render();onSelect(selected);});
 }
 async function loadStudents(id,offset) {
  const version=revision,state={loading:true,offset,rows:[],more:false};expanded.set(id,state);render();
  try {
   const rows=await rpc("search_student_report",{p_unit:id,p_search:term,p_offset:offset});
   if(version!==revision||expanded.get(id)!==state)return;
   Object.assign(state,{loading:false,rows:rows.slice(0,25),more:rows.length>25});cache.set(id,state);render();
  }catch(e){if(version===revision&&expanded.get(id)===state){Object.assign(state,{loading:false,error:e.message});render();}}
 }
 return {async refresh({unit=null,search=""}={}) {
  const version=++revision;term=search;selected="";expanded=new Map();cache=new Map();node.innerHTML='<p role="status">Carregando unidades e quantidades de alunos…</p>';
  try {const rows=await rpc("get_student_report_groups",{p_unit:unit||null,p_search:search});if(version!==revision)return;groups=rows;render();onMessage("Escolha a unidade e depois clique no nome do aluno para abrir o relatório.");}
  catch(e){if(version===revision){node.innerHTML='<p class="dossier-empty">Não foi possível carregar as unidades.</p>';onMessage(e.message,true);}}
 }};
}
