const CATALOGS = {
  AREA: ["Áreas de atuação", "Organização institucional"],
  DIRECTORATE: ["Diretorias", "Organização institucional"],
  SECTOR: ["Setores e departamentos", "Estrutura operacional"],
  JOB_TITLE: ["Cargos e funções", "Vínculos de usuários"],
  EDUCATIONAL_UNIT: ["Unidades educacionais", "Avaliações, Comunicação e CREI/SAE"],
};
const CATALOG_GROUPS = {
  ORGANIZATION: ["Estrutura organizacional", ["AREA", "DIRECTORATE", "SECTOR", "EDUCATIONAL_UNIT"]],
  JOB_TITLE: ["Cargos e funções", ["JOB_TITLE"]],
  OPERATIONAL: ["Catálogos operacionais", []],
};
const CATALOG_USAGE = {
  AREA: ["Portal e usuários", "Monitoramento"],
  DIRECTORATE: ["Portal e usuários", "Comunicação", "Monitoramento"],
  SECTOR: ["Comunicação Interna", "Monitoramento"],
  JOB_TITLE: ["Portal e usuários", "Permissões"],
  EDUCATIONAL_UNIT: ["Gestão de Avaliações", "Comunicação", "CREI/SAE"],
};
const FORM_CATALOGS = {
  DIRECTORATE: ["Área / Diretoria"],
  SECTOR: ["Setor / Departamento"],
  EDUCATIONAL_UNIT: ["Unidade educacional"],
  JOB_TITLE: ["Cargo / Função"],
};
const PORTAL_SYSTEMS = ["Portal e usuários", "Gestão de Avaliações", "Comunicação", "Comunicação Interna", "Monitoramento", "CREI/SAE", "Permissões"];
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const codeFromLabel = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
const PARENT_CATALOG = { DIRECTORATE: "DIRECTORATE", SECTOR: "DIRECTORATE", EDUCATIONAL_UNIT: "DIRECTORATE" };

export function initSharedCatalogAdmin({ supabase, context }) {
  const access = (context.modules || []).find((item) => item.code === "cadastros")?.permissions;
  if (!access?.view) return;
  const userArea = document.querySelector(".portal-user");
  if (!userArea || userArea.querySelector("[data-catalog-admin]")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.dataset.catalogAdmin = "1";
  button.textContent = "Tabelas compartilhadas";
  userArea.prepend(button);

  const style = document.createElement("style");
  style.textContent = `
    .catalog-admin{position:fixed;inset:0;z-index:210;padding:22px;overflow:auto;background:#071b46d9}.catalog-admin[hidden]{display:none}.catalog-shell{width:min(1320px,100%);min-height:calc(100vh - 44px);margin:auto;padding:24px;border-radius:22px;background:#f5f7fb;color:#17254a;box-shadow:0 30px 90px #00113388}.catalog-head,.catalog-toolbar,.catalog-actions,.catalog-view-switch{display:flex;align-items:center;gap:12px}.catalog-head{justify-content:space-between}.catalog-head h2,.catalog-card h3{margin:0}.catalog-head p{margin:5px 0 0;color:#687694}.catalog-toolbar{margin:14px 0;display:grid;grid-template-columns:1fr 230px 170px auto}.catalog-toolbar input,.catalog-toolbar select,.catalog-dialog input,.catalog-dialog select{min-height:43px;padding:9px 12px;border:1px solid #cad5e8;border-radius:10px;background:#fff;color:#17254a}.catalog-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:18px 0}.catalog-card{padding:15px;border:1px solid #d9e2f0;border-radius:15px;background:#fff;text-align:left;color:#17254a}.catalog-card.active{border-color:#315bb4;background:#edf3ff}.catalog-card strong{display:block;margin-top:7px;font-size:22px}.catalog-card small{color:#697895}.catalog-table{overflow:auto;border:1px solid #dae2ef;border-radius:14px;background:#fff}.catalog-table table{width:100%;border-collapse:collapse}.catalog-table th,.catalog-table td{padding:12px 14px;border-bottom:1px solid #e5eaf2;text-align:left;font-size:13px}.catalog-table th{background:#eaf0f9;color:#18366d}.catalog-usage{display:inline-flex;padding:4px 8px;border:0;border-radius:999px;background:#edf3ff;color:#27479c;font-size:11px;font-weight:800;cursor:pointer}.catalog-status{display:inline-flex;padding:4px 9px;border-radius:999px;background:#e4f3eb;color:#17623d;font-weight:800}.catalog-status.inactive{background:#f4e7e7;color:#962c2c}.catalog-primary,.catalog-secondary{border-radius:9px;padding:10px 14px;font-weight:800;cursor:pointer}.catalog-primary{border:0;background:#27479c;color:#fff}.catalog-secondary{border:1px solid #afbdd4;background:#fff;color:#17336d}.catalog-view-switch{margin-bottom:14px}.catalog-view.active{border-color:#27479c;background:#27479c;color:#fff}.catalog-empty{padding:34px!important;text-align:center!important;color:#6d7890}.catalog-tree{display:grid;gap:12px;padding:16px;border:1px solid #dae2ef;border-radius:14px;background:#fff}.catalog-tree-root{padding:14px;border:1px solid #d9e2f0;border-radius:12px}.catalog-tree-root>header{display:flex;align-items:center;justify-content:space-between;gap:10px}.catalog-tree-children{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:8px;margin:12px 0 0 24px}.catalog-tree-child{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px;border-left:3px solid #7894d0;background:#f6f8fc}.catalog-systems{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}.catalog-system{padding:16px;border:1px solid #d9e2f0;border-radius:14px;background:#fff}.catalog-system h3{margin:0 0 10px}.catalog-system ul{margin:0;padding-left:18px;color:#53627e}.catalog-dialog-wrap{position:fixed;inset:0;z-index:220;display:grid;place-items:center;padding:18px;background:#06173d99}.catalog-dialog{width:min(850px,100%);max-height:calc(100vh - 36px);overflow:auto;padding:22px;border-radius:20px;background:#fff;box-shadow:0 24px 70px #00113366}.catalog-dialog h3{margin:0 0 5px}.catalog-dialog p{margin:0 0 18px;color:#667591}.catalog-dialog ul{display:grid;gap:8px;padding-left:20px;color:#34476d}.catalog-form{display:grid;grid-template-columns:1fr 1fr;gap:13px}.catalog-form label{display:grid;gap:6px;font-size:12px;font-weight:800}.catalog-step{grid-column:1/-1;display:grid;grid-template-columns:36px 1fr;gap:10px;align-items:center;margin-top:4px;padding-top:12px;border-top:1px solid #e1e7f0}.catalog-step:first-child{border-top:0;padding-top:0}.catalog-step span{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:#27479c;color:#fff;font-weight:900}.catalog-step strong{font-size:14px}.catalog-step small{display:block;color:#6b7892;font-weight:500}.catalog-use-grid{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.catalog-use-item{padding:10px;border:1px solid #dbe3f0;border-radius:10px;background:#f8faff;color:#405070;font-size:12px}.catalog-use-item.on{border-color:#8fa9df;background:#edf3ff;color:#18366d;font-weight:800}.catalog-wide{grid-column:1/-1}.catalog-actions{justify-content:flex-end;margin-top:18px}.catalog-note{padding:12px;border-radius:10px;background:#edf3ff;color:#294c91;font-size:12px}.catalog-error{color:#a51f2b;font-weight:700}.catalog-history{margin-top:16px;padding-top:14px;border-top:1px solid #e1e7f0}.catalog-history ul{max-height:160px;overflow:auto;padding-left:18px;color:#53627e;font-size:12px}
    @media(max-width:850px){.catalog-toolbar{grid-template-columns:1fr 1fr}.catalog-toolbar input{grid-column:1/-1}.catalog-stats{grid-template-columns:repeat(2,1fr)}}@media(max-width:560px){.catalog-admin{padding:0}.catalog-shell{min-height:100vh;border-radius:0;padding:16px}.catalog-head{align-items:flex-start}.catalog-toolbar,.catalog-form{grid-template-columns:1fr}.catalog-toolbar>*{grid-column:1}.catalog-stats{grid-template-columns:1fr 1fr}.catalog-wide{grid-column:1}}
  `;
  document.head.append(style);

  const panel = document.createElement("section");
  panel.className = "catalog-admin";
  panel.hidden = true;
  panel.innerHTML = `<div class="catalog-shell"><header class="catalog-head"><div><h2>Tabelas Compartilhadas</h2><p>Opções únicas, padronizadas e reutilizadas por todos os sistemas do Portal.</p></div><button class="catalog-secondary" data-close>Fechar</button></header><div data-catalog-content></div></div>`;
  document.body.append(panel);

  let items = [], sharedTables = [], sharedOptions = [], consumers = [], category = "ALL", search = "", situation = "ALL", viewMode = "TABLE", screen = "TABLES", selectedSharedTable = null;
  const content = () => panel.querySelector("[data-catalog-content]");
  async function load() {
    content().innerHTML = "<p>Carregando tabelas compartilhadas…</p>";
    const [references,tables,options,uses] = await Promise.all([
      supabase.from("semed_reference_catalogs").select("*").order("catalog").order("sort_order").order("label"),
      supabase.from("semed_shared_tables").select("*").order("sort_order").order("name"),
      supabase.from("semed_shared_options").select("*").order("sort_order").order("label"),
      supabase.from("semed_shared_table_consumers").select("*").eq("active",true).order("module_code").order("field_code"),
    ]);
    for(const result of [references,tables,options,uses]) if(result.error) throw result.error;
    items = references.data || []; sharedTables=tables.data||[]; sharedOptions=options.data||[]; consumers=uses.data||[];
    render();
  }
  function groupFor(item){return Object.entries(CATALOG_GROUPS).find(([,value])=>value[1].includes(item.catalog))?.[0]||item.catalog}
  function displayItems(){
    const consolidated=new Map();
    for(const item of items){
      const duplicateKey=["AREA","DIRECTORATE"].includes(item.catalog)?`ORGANIZATION:${item.code}`:`${item.catalog}:${item.id}`;
      const current=consolidated.get(duplicateKey);
      if(!current){consolidated.set(duplicateKey,{...item,sourceItems:[item],group:groupFor(item)});continue}
      current.sourceItems.push(item);
      if(item.catalog==="DIRECTORATE") Object.assign(current,item,{sourceItems:current.sourceItems,group:"ORGANIZATION"});
      current.active=current.sourceItems.some((source)=>source.active);
    }
    return [...consolidated.values()];
  }
  function typeLabel(item){
    const types=new Set(item.sourceItems?.map((source)=>source.catalog)||[item.catalog]);
    if(types.has("AREA")&&types.has("DIRECTORATE"))return "Área / Diretoria";
    return item.catalog==="SECTOR"?"Setor / Departamento":CATALOGS[item.catalog]?.[0]||item.catalog;
  }
  function usagesFor(item){return [...new Set((item.sourceItems||[item]).flatMap((source)=>CATALOG_USAGE[source.catalog]||[]))]}
  function parentLabel(item){return items.find((candidate)=>["DIRECTORATE","AREA"].includes(candidate.catalog)&&candidate.code===item.parent_code)?.label||"—"}
  function createsHierarchyCycle(code,parentCode){
    const visited=new Set([code]);let cursor=parentCode;
    while(cursor){if(visited.has(cursor))return true;visited.add(cursor);cursor=items.find((candidate)=>candidate.catalog==="DIRECTORATE"&&candidate.code===cursor)?.parent_code||null}
    return false;
  }
  function showUsage(item){
    const usages=usagesFor(item),wrap=document.createElement("div");wrap.className="catalog-dialog-wrap";
    wrap.innerHTML=`<section class="catalog-dialog"><h3>${esc(item.label)}</h3><p>Este cadastro é compartilhado com:</p><ul>${usages.map((usage)=>`<li>${esc(usage)}</li>`).join("")}</ul><div class="catalog-actions"><button class="catalog-primary" data-close-usage>Fechar</button></div></section>`;
    document.body.append(wrap);wrap.querySelector("[data-close-usage]").addEventListener("click",()=>wrap.remove());
  }
  function treeHtml(rows){
    const organization=rows.filter((item)=>item.group==="ORGANIZATION"),roots=organization.filter((item)=>["AREA","DIRECTORATE"].includes(item.catalog));
    const detached=organization.filter((item)=>item.catalog==="SECTOR"&&!roots.some((root)=>root.code===item.parent_code));
    const branch=(root)=>`<article class="catalog-tree-root"><header><div><strong>${esc(root.label)}</strong><br><small>${esc(typeLabel(root))}</small></div>${access.edit?`<button class="catalog-secondary" data-edit="${root.id}">Editar</button>`:""}</header><div class="catalog-tree-children">${organization.filter((item)=>item.catalog==="SECTOR"&&item.parent_code===root.code).map((child)=>`<div class="catalog-tree-child"><span><strong>${esc(child.label)}</strong><br><small>${esc(typeLabel(child))}</small></span>${access.edit?`<button class="catalog-secondary" data-edit="${child.id}">Editar</button>`:""}</div>`).join("")||"<small>Nenhum setor vinculado.</small>"}</div></article>`;
    const units=rows.filter((item)=>item.catalog==="EDUCATIONAL_UNIT"),jobs=rows.filter((item)=>item.catalog==="JOB_TITLE");
    return `<div class="catalog-tree">${roots.map(branch).join("")}${detached.length?`<article class="catalog-tree-root"><header><strong>Sem vínculo superior</strong></header><div class="catalog-tree-children">${detached.map((child)=>`<div class="catalog-tree-child"><span>${esc(child.label)}</span>${access.edit?`<button class="catalog-secondary" data-edit="${child.id}">Editar</button>`:""}</div>`).join("")}</div></article>`:""}${units.length?`<article class="catalog-tree-root"><header><strong>Unidades educacionais</strong><span>${units.length}</span></header><div class="catalog-tree-children">${units.map((unit)=>`<div class="catalog-tree-child"><span><strong>${esc(unit.label)}</strong><br><small>${esc(parentLabel(unit))}</small></span>${access.edit?`<button class="catalog-secondary" data-edit="${unit.id}">Editar</button>`:""}</div>`).join("")}</div></article>`:""}${jobs.length?`<article class="catalog-tree-root"><header><strong>Cargos e funções</strong><span>${jobs.length}</span></header></article>`:""}</div>`;
  }
  function systemsHtml(rows){
    return `<section class="catalog-systems">${PORTAL_SYSTEMS.map((system)=>{const linked=rows.filter((item)=>usagesFor(item).includes(system));return `<article class="catalog-system"><h3>${esc(system)} <span class="catalog-usage">${linked.length}</span></h3>${linked.length?`<ul>${linked.slice(0,12).map((item)=>`<li>${esc(item.label)} <small>· ${esc(typeLabel(item))}</small></li>`).join("")}${linked.length>12?`<li>e mais ${linked.length-12} cadastros…</li>`:""}</ul>`:"<small>Nenhum cadastro compartilhado com este sistema.</small>"}</article>`}).join("")}</section>`;
  }
  const categoryLabel=(value)=>({ORGANIZATIONAL:"Estrutura organizacional",OPERATIONAL:"Operacional",EDUCATIONAL:"Educacional"}[value]||value);
  const moduleLabel=(value)=>({portal:"Portal e usuários",avaliacoes:"Gestão de Avaliações",monitor:"Monitoramento",comunicacao:"Comunicação",incidentes:"Incidentes Escolares"}[value]||value);
  const legacyTableCodes=new Set(["AREA","DIRECTORATE","SECTOR","EDUCATIONAL_UNIT","JOB_TITLE"]);
  function renderSharedTables(){
    const activeOptions=sharedOptions.filter((option)=>option.active).length;
    const linkedSystems=new Set(consumers.map((item)=>item.module_code)).size;
    const duplicates=sharedOptions.length-new Set(sharedOptions.map((option)=>`${option.table_id}:${option.normalized_label}:${option.parent_option_id||""}`)).size;
    const rows=sharedTables.filter((table)=>!search||`${table.name} ${table.code} ${table.description||""}`.toLocaleLowerCase("pt-BR").includes(search));
    content().innerHTML=`<section class="catalog-stats"><article class="catalog-card"><small>Tabelas padronizadas</small><strong>${sharedTables.length}</strong></article><article class="catalog-card"><small>Opções ativas</small><strong>${activeOptions}</strong></article><article class="catalog-card"><small>Sistemas integrados</small><strong>${linkedSystems}</strong></article><article class="catalog-card"><small>Possíveis duplicidades</small><strong>${duplicates}</strong></article></section>
      <div class="catalog-toolbar"><input data-table-search type="search" placeholder="Pesquisar tabela, código ou finalidade…" value="${esc(search)}"><div></div><button class="catalog-secondary" data-legacy>Ver cadastros estruturais</button>${access.create?'<button class="catalog-primary" data-new-table>Nova tabela</button>':""}</div>
      <p class="catalog-note">Cada tabela possui código permanente, opções padronizadas, sistemas consumidores e regras de seleção. Opções utilizadas são inativadas, nunca apagadas.</p>
      <div class="catalog-table"><table><thead><tr><th>Tabela compartilhada</th><th>Categoria</th><th>Opções</th><th>Utilizada em</th><th>Seleção</th><th>Ação</th></tr></thead><tbody>${rows.map((table)=>{const options=sharedOptions.filter((option)=>option.table_id===table.id&&option.active);const uses=consumers.filter((use)=>use.table_id===table.id);return `<tr><td><strong>${esc(table.name)}</strong><br><small>${esc(table.code)} · ${esc(table.description||"")}</small></td><td>${esc(categoryLabel(table.category))}</td><td><span class="catalog-usage">${options.length} opções</span></td><td>${uses.length?`${new Set(uses.map((use)=>use.module_code)).size} sistemas`:"Ainda não vinculada"}</td><td>${table.selection_mode==="MULTIPLE"?"Múltipla":"Única"}${table.allow_hierarchy?" · hierárquica":""}</td><td><button class="catalog-primary" data-open-table="${table.id}">Gerenciar opções</button>${access.edit?` <button class="catalog-secondary" data-edit-table="${table.id}">Configurar</button>`:""}</td></tr>`}).join("")||'<tr><td colspan="6" class="catalog-empty">Nenhuma tabela encontrada.</td></tr>'}</tbody></table></div>`;
    content().querySelector("[data-table-search]").addEventListener("input",(event)=>{search=event.target.value.trim().toLocaleLowerCase("pt-BR");renderSharedTables();const input=content().querySelector("[data-table-search]");input.focus();input.setSelectionRange(input.value.length,input.value.length)});
    content().querySelector("[data-legacy]").addEventListener("click",()=>{screen="LEGACY";search="";render()});
    content().querySelector("[data-new-table]")?.addEventListener("click",()=>editSharedTable(null));
    content().querySelectorAll("[data-edit-table]").forEach((node)=>node.addEventListener("click",()=>editSharedTable(sharedTables.find((table)=>table.id===node.dataset.editTable))));
    content().querySelectorAll("[data-open-table]").forEach((node)=>node.addEventListener("click",()=>{selectedSharedTable=sharedTables.find((table)=>table.id===node.dataset.openTable);screen="SHARED_OPTIONS";search="";renderSharedOptions()}));
  }
  function renderSharedOptions(){
    const table=selectedSharedTable;if(!table){screen="TABLES";return renderSharedTables()}
    const rows=sharedOptions.filter((option)=>option.table_id===table.id&&(!search||`${option.label} ${option.code}`.toLocaleLowerCase("pt-BR").includes(search)));
    const uses=consumers.filter((use)=>use.table_id===table.id);
    const structural=legacyTableCodes.has(table.code);
    content().innerHTML=`<div class="catalog-toolbar"><button class="catalog-secondary" data-back-tables>← Todas as tabelas</button><input data-option-search type="search" placeholder="Pesquisar opção…" value="${esc(search)}"><div></div>${structural?'<button class="catalog-primary" data-manage-structure>Gerenciar estrutura</button>':access.create?'<button class="catalog-primary" data-new-option>Nova opção</button>':""}</div><section class="catalog-card"><small>${esc(categoryLabel(table.category))}</small><h3>${esc(table.name)}</h3><p>${esc(table.description||"")}</p><div class="catalog-use-grid">${uses.map((use)=>`<div class="catalog-use-item on">${esc(moduleLabel(use.module_code))}<br><small>Campo: ${esc(use.field_code)}</small></div>`).join("")||'<div class="catalog-use-item">Sem campo consumidor cadastrado.</div>'}</div></section>
      <p class="catalog-note">Código permanente para integrações; descrição oficial para formulários; descrição curta para tabelas e relatórios.</p>
      <div class="catalog-table"><table><thead><tr><th>Opção padronizada</th><th>Descrição curta</th><th>Vínculo superior</th><th>Ordem</th><th>Situação</th><th>Ação</th></tr></thead><tbody>${rows.map((option)=>{const parent=sharedOptions.find((item)=>item.id===option.parent_option_id);return `<tr><td><strong>${esc(option.label)}</strong><br><small>${esc(option.code)}</small></td><td>${esc(option.short_label||"—")}</td><td>${esc(parent?.label||"—")}</td><td>${option.sort_order}</td><td><span class="catalog-status ${option.active?"":"inactive"}">${option.active?"Ativa":"Inativa"}</span></td><td>${access.edit?`<button class="catalog-secondary" data-edit-option="${option.id}">Editar</button>`:"Consulta"}</td></tr>`}).join("")||'<tr><td colspan="6" class="catalog-empty">Nenhuma opção cadastrada.</td></tr>'}</tbody></table></div>`;
    content().querySelector("[data-back-tables]").addEventListener("click",()=>{screen="TABLES";search="";renderSharedTables()});
    content().querySelector("[data-option-search]").addEventListener("input",(event)=>{search=event.target.value.trim().toLocaleLowerCase("pt-BR");renderSharedOptions();const input=content().querySelector("[data-option-search]");input.focus();input.setSelectionRange(input.value.length,input.value.length)});
    content().querySelector("[data-new-option]")?.addEventListener("click",()=>editSharedOption(null));
    content().querySelector("[data-manage-structure]")?.addEventListener("click",()=>{screen="LEGACY";search="";render()});
    content().querySelectorAll("[data-edit-option]").forEach((node)=>node.addEventListener("click",()=>editSharedOption(sharedOptions.find((option)=>option.id===node.dataset.editOption))));
  }
  async function editSharedTable(table){
    const wrap=document.createElement("div");wrap.className="catalog-dialog-wrap";
    wrap.innerHTML=`<form class="catalog-dialog"><h3>${table?"Editar tabela compartilhada":"Nova tabela compartilhada"}</h3><p>Defina uma fonte única de opções para formulários, filtros e relatórios dos sistemas integrados.</p><div class="catalog-form">
      <label>Nome da tabela<input name="name" value="${esc(table?.name)}" required minlength="3" placeholder="Ex.: Tipos de atendimento"></label><label>Código permanente<input name="code" value="${esc(table?.code)}" ${table?"readonly":""} required placeholder="TIPOS_ATENDIMENTO"></label>
      <label>Categoria<select name="category"><option value="ORGANIZATIONAL" ${table?.category==="ORGANIZATIONAL"?"selected":""}>Estrutura organizacional</option><option value="OPERATIONAL" ${!table||table?.category==="OPERATIONAL"?"selected":""}>Operacional</option><option value="EDUCATIONAL" ${table?.category==="EDUCATIONAL"?"selected":""}>Educacional</option></select></label><label>Forma de seleção<select name="selectionMode"><option value="SINGLE" ${table?.selection_mode!=="MULTIPLE"?"selected":""}>Uma opção</option><option value="MULTIPLE" ${table?.selection_mode==="MULTIPLE"?"selected":""}>Várias opções</option></select></label>
      <label class="catalog-wide">Finalidade<textarea name="description" placeholder="Explique onde e para que esta tabela será usada">${esc(table?.description)}</textarea></label><label>Hierarquia<select name="allowHierarchy"><option value="false" ${!table?.allow_hierarchy?"selected":""}>Sem vínculo superior</option><option value="true" ${table?.allow_hierarchy?"selected":""}>Permitir vínculo superior</option></select></label><label>Situação<select name="active"><option value="true" ${table?.active!==false?"selected":""}>Ativa</option><option value="false" ${table?.active===false?"selected":""}>Inativa</option></select></label>
      <label>Sistema consumidor<select name="moduleCode"><option value="">Vincular depois</option><option value="portal">Portal e usuários</option><option value="avaliacoes">Gestão de Avaliações</option><option value="monitor">Monitoramento</option><option value="comunicacao">Comunicação</option><option value="incidentes">Incidentes Escolares</option></select></label><label>Campo no sistema<input name="fieldCode" placeholder="Ex.: status, unidade_id"></label><div class="catalog-wide catalog-error" data-error></div></div><div class="catalog-actions"><button type="button" class="catalog-secondary" data-cancel>Cancelar</button><button class="catalog-primary">Salvar tabela</button></div></form>`;
    document.body.append(wrap);const form=wrap.querySelector("form");wrap.querySelector("[data-cancel]").addEventListener("click",()=>wrap.remove());
    form.addEventListener("submit",async(event)=>{event.preventDefault();const values=new FormData(form),error=wrap.querySelector("[data-error]"),submit=form.querySelector(".catalog-primary"),name=String(values.get("name")||"").trim(),code=codeFromLabel(String(values.get("code")||name));if(sharedTables.some((candidate)=>candidate.id!==table?.id&&(candidate.code===code||candidate.name.trim().toLocaleLowerCase("pt-BR")===name.toLocaleLowerCase("pt-BR")))){error.textContent="Já existe uma tabela com este nome ou código.";return}submit.disabled=true;error.textContent="Salvando…";const payload={name,code,category:String(values.get("category")),description:String(values.get("description")||"").trim()||null,selection_mode:String(values.get("selectionMode")),allow_hierarchy:values.get("allowHierarchy")==="true",active:values.get("active")==="true",sort_order:table?.sort_order??(sharedTables.length+1)*10};const result=table?await supabase.from("semed_shared_tables").update(payload).eq("id",table.id).select("id").single():await supabase.from("semed_shared_tables").insert(payload).select("id").single();if(result.error){error.textContent=result.error.message;submit.disabled=false;return}const moduleCode=String(values.get("moduleCode")||""),fieldCode=String(values.get("fieldCode")||"").trim();if(moduleCode&&fieldCode){const useResult=await supabase.from("semed_shared_table_consumers").upsert({table_id:result.data.id,module_code:moduleCode,field_code:fieldCode,active:true},{onConflict:"table_id,module_code,field_code"});if(useResult.error){error.textContent=`Tabela salva, mas o vínculo não foi criado: ${useResult.error.message}`;submit.disabled=false;return}}wrap.remove();await load();});
  }
  async function editSharedOption(option){
    const table=selectedSharedTable;if(!table)return;if(option?.legacy_reference_id){const legacy=items.find((item)=>item.id===option.legacy_reference_id);if(legacy)return editItem(legacy)}
    const wrap=document.createElement("div");wrap.className="catalog-dialog-wrap";const parents=table.allow_hierarchy?sharedOptions.filter((candidate)=>candidate.table_id===table.id&&candidate.active&&candidate.id!==option?.id):[];
    wrap.innerHTML=`<form class="catalog-dialog"><h3>${option?"Editar opção padronizada":"Nova opção padronizada"}</h3><p>${esc(table.name)} · a alteração será refletida nos sistemas consumidores.</p><div class="catalog-form"><label class="catalog-wide">Descrição oficial<input name="label" value="${esc(option?.label)}" required minlength="2" placeholder="Texto apresentado nos formulários"></label><label>Código permanente<input name="code" value="${esc(option?.code)}" ${option?"readonly":""} placeholder="Gerado pela descrição"></label><label>Descrição curta<input name="shortLabel" value="${esc(option?.short_label)}" placeholder="Para tabelas e relatórios"></label>${table.allow_hierarchy?`<label>Vínculo superior<select name="parentId"><option value="">Sem vínculo</option>${parents.map((parent)=>`<option value="${parent.id}" ${option?.parent_option_id===parent.id?"selected":""}>${esc(parent.label)}</option>`).join("")}</select></label>`:"<div></div>"}<label>Ordem<input name="sortOrder" type="number" min="0" value="${option?.sort_order??(sharedOptions.filter((candidate)=>candidate.table_id===table.id).length+1)*10}"></label><label>Texto de ajuda<input name="helpText" value="${esc(option?.help_text)}" placeholder="Orientação opcional ao usuário"></label><label>Cor de identificação<input name="color" value="${esc(option?.color)}" placeholder="#27479c"></label><label>Situação<select name="active"><option value="true" ${option?.active!==false?"selected":""}>Ativa</option><option value="false" ${option?.active===false?"selected":""}>Inativa</option></select></label><div class="catalog-wide catalog-error" data-error></div></div><div class="catalog-actions"><button type="button" class="catalog-secondary" data-cancel>Cancelar</button><button class="catalog-primary">Salvar opção</button></div></form>`;
    document.body.append(wrap);const form=wrap.querySelector("form");wrap.querySelector("[data-cancel]").addEventListener("click",()=>wrap.remove());form.addEventListener("submit",async(event)=>{event.preventDefault();const values=new FormData(form),error=wrap.querySelector("[data-error]"),submit=form.querySelector(".catalog-primary"),label=String(values.get("label")||"").trim(),code=codeFromLabel(String(values.get("code")||label)),parent_option_id=String(values.get("parentId")||"")||null;if(sharedOptions.some((candidate)=>candidate.table_id===table.id&&candidate.id!==option?.id&&(candidate.code===code||candidate.label.trim().toLocaleLowerCase("pt-BR")===label.toLocaleLowerCase("pt-BR"))&&(candidate.parent_option_id||null)===parent_option_id)){error.textContent="Esta opção já existe na tabela e no mesmo vínculo superior.";return}submit.disabled=true;error.textContent="Salvando…";const payload={table_id:table.id,label,code,short_label:String(values.get("shortLabel")||"").trim()||null,parent_option_id,sort_order:Number(values.get("sortOrder")||0),help_text:String(values.get("helpText")||"").trim()||null,color:String(values.get("color")||"").trim()||null,active:values.get("active")==="true"};const result=option?await supabase.from("semed_shared_options").update(payload).eq("id",option.id):await supabase.from("semed_shared_options").insert(payload);if(result.error){error.textContent=result.error.message;submit.disabled=false;return}wrap.remove();await load();selectedSharedTable=sharedTables.find((candidate)=>candidate.id===table.id)||table;screen="SHARED_OPTIONS";renderSharedOptions();});
  }
  function render() {
    if(screen==="TABLES")return renderSharedTables();
    if(screen==="SHARED_OPTIONS")return renderSharedOptions();
    const consolidated=displayItems();
    const visible = consolidated.filter((item) => (category === "ALL" || item.group === category) && (situation === "ALL" || String(item.active) === situation) && (!search || `${item.label} ${item.code}`.toLocaleLowerCase("pt-BR").includes(search)));
    const table=`<div class="catalog-table"><table><thead><tr><th>Cadastro</th><th>Tipo</th><th>Vínculo superior</th><th>Utilizado em</th><th>Situação</th><th>Ação</th></tr></thead><tbody>${visible.length?visible.map((item)=>{const usages=usagesFor(item);return `<tr><td><strong>${esc(item.label)}</strong><br><small>${esc(item.code)}</small></td><td>${esc(typeLabel(item))}</td><td>${esc(parentLabel(item))}</td><td><button class="catalog-usage" data-usage="${item.id}" title="Ver sistemas consumidores">${usages.length} ${usages.length===1?"sistema":"sistemas"}</button></td><td><span class="catalog-status ${item.active?"":"inactive"}">${item.active?"Ativo":"Inativo"}</span></td><td>${access.edit?`<button class="catalog-secondary" data-edit="${item.id}">Editar</button>`:"Consulta"}</td></tr>`}).join(""):'<tr><td colspan="6" class="catalog-empty">Nenhum cadastro corresponde aos filtros.</td></tr>'}</tbody></table></div>`;
    content().innerHTML = `<section class="catalog-stats"><button class="catalog-card ${category === "ALL" ? "active" : ""}" data-category="ALL"><small>Todos os cadastros mestres</small><strong>${consolidated.length}</strong></button>${Object.entries(CATALOG_GROUPS).map(([key,value]) => `<button class="catalog-card ${category === key ? "active" : ""}" data-category="${key}"><small>${esc(value[0])}</small><strong>${consolidated.filter((item)=>item.group===key).length}</strong></button>`).join("")}</section>
      <div class="catalog-toolbar"><input data-search type="search" placeholder="Pesquisar por nome ou código…" value="${esc(search)}"><select data-category-select><option value="ALL">Todos os conjuntos mestres</option>${Object.entries(CATALOG_GROUPS).map(([key,value])=>`<option value="${key}" ${category===key?"selected":""}>${esc(value[0])}</option>`).join("")}</select><select data-situation><option value="ALL">Ativos e inativos</option><option value="true" ${situation==="true"?"selected":""}>Somente ativos</option><option value="false" ${situation==="false"?"selected":""}>Somente inativos</option></select>${access.create?'<button class="catalog-primary" data-new>Novo cadastro</button>':""}</div>
      <nav class="catalog-view-switch" aria-label="Forma de visualização"><button class="catalog-secondary catalog-view ${viewMode==="TABLE"?"active":""}" data-view="TABLE">Lista unificada</button><button class="catalog-secondary catalog-view ${viewMode==="TREE"?"active":""}" data-view="TREE">Hierarquia</button><button class="catalog-secondary catalog-view ${viewMode==="SYSTEM"?"active":""}" data-view="SYSTEM">Por sistema</button></nav>
      <p class="catalog-note">Registros em uso não são excluídos: eles podem ser inativados, preservando documentos, relatórios e históricos anteriores.</p>
      ${viewMode==="TREE"?treeHtml(visible):viewMode==="SYSTEM"?systemsHtml(visible):table}`;
    content().querySelector(".catalog-view-switch")?.insertAdjacentHTML("afterbegin",'<button class="catalog-secondary" data-back-shared>← Tabelas compartilhadas</button>');
    content().querySelector("[data-back-shared]")?.addEventListener("click",()=>{screen="TABLES";search="";renderSharedTables()});
    content().querySelector("[data-search]").addEventListener("input",(event)=>{search=event.target.value.trim().toLocaleLowerCase("pt-BR");render();const input=content().querySelector("[data-search]");input.focus();input.setSelectionRange(input.value.length,input.value.length)});
    content().querySelector("[data-category-select]").addEventListener("change",(event)=>{category=event.target.value;render()});
    content().querySelector("[data-situation]").addEventListener("change",(event)=>{situation=event.target.value;render()});
    content().querySelectorAll("[data-view]").forEach((node)=>node.addEventListener("click",()=>{viewMode=node.dataset.view;render()}));
    content().querySelectorAll("[data-category]").forEach((node)=>node.addEventListener("click",()=>{category=node.dataset.category;render()}));
    content().querySelector("[data-new]")?.addEventListener("click",()=>editItem(null));
    content().querySelectorAll("[data-usage]").forEach((node)=>node.addEventListener("click",()=>showUsage(visible.find((item)=>item.id===node.dataset.usage))));
    content().querySelectorAll("[data-edit]").forEach((node)=>node.addEventListener("click",()=>editItem(items.find((item)=>item.id===node.dataset.edit))));
  }
  async function editItem(item) {
    const wrap = document.createElement("div");
    wrap.className = "catalog-dialog-wrap";
    wrap.innerHTML = `<form class="catalog-dialog"><h3>${item?"Editar cadastro mestre":"Novo cadastro mestre"}</h3><p>Cadastre uma vez e reutilize a mesma informação em todos os sistemas integrados.</p><div class="catalog-form">
      <div class="catalog-step"><span>1</span><div><strong>Identificação</strong><small>Natureza, nome oficial e código único.</small></div></div>
      <label>Natureza do cadastro<select name="catalog" ${item?"disabled":""} required><option value="">Selecione</option>${Object.entries(FORM_CATALOGS).map(([key,value])=>`<option value="${key}" ${item?.catalog===key?"selected":""}>${esc(value[0])}</option>`).join("")}</select></label><label>Código único<input name="code" value="${esc(item?.code)}" placeholder="Gerado automaticamente"></label><label class="catalog-wide">Nome / descrição oficial<input name="label" value="${esc(item?.label)}" required minlength="2" placeholder="Informe uma única vez, sem abreviações desnecessárias"></label>
      <div class="catalog-step"><span>2</span><div><strong>Organização</strong><small>Defina a posição hierárquica para evitar cadastros soltos ou repetidos.</small></div></div>
      <label>Vínculo superior<select name="parentCode"></select><small data-parent-help></small></label><label>Conjunto mestre<input data-master-group value="${esc(CATALOG_GROUPS[groupFor(item||{})]?.[0]||"Definido após selecionar a natureza")}" disabled></label>
      <div class="catalog-step"><span>3</span><div><strong>Utilização</strong><small>Confira onde este cadastro será apresentado. A integração é automática conforme a natureza.</small></div></div>
      <div class="catalog-use-grid" data-use-grid></div>
      <div class="catalog-step"><span>4</span><div><strong>Vigência e controle</strong><small>Inative sem apagar documentos, relatórios ou históricos anteriores.</small></div></div>
      <label>Situação<select name="active"><option value="true" ${item?.active!==false?"selected":""}>Ativo</option><option value="false" ${item?.active===false?"selected":""}>Inativo</option></select></label><div></div><div class="catalog-wide catalog-error" data-error></div></div><div class="catalog-history" data-history></div><div class="catalog-actions"><button type="button" class="catalog-secondary" data-cancel>Cancelar</button><button class="catalog-primary">Salvar cadastro mestre</button></div></form>`;
    document.body.append(wrap);
    const form=wrap.querySelector("form");
    const parentSelect=form.elements.parentCode,parentHelp=wrap.querySelector("[data-parent-help]");
    const updateUsagePreview=(catalog)=>{
      const preview={catalog,sourceItems:[{catalog}]};
      const enabled=usagesFor(preview);
      wrap.querySelector("[data-use-grid]").innerHTML=PORTAL_SYSTEMS.map((system)=>`<div class="catalog-use-item ${enabled.includes(system)?"on":""}">${enabled.includes(system)?"✓ ":""}${esc(system)}</div>`).join("");
      wrap.querySelector("[data-master-group]").value=CATALOG_GROUPS[groupFor(preview)]?.[0]||"Catálogos operacionais";
    };
    const updateParentOptions=(catalog,selected="")=>{
      const parentCatalog=PARENT_CATALOG[catalog];
      const candidates=parentCatalog?[...new Map(items.filter((candidate)=>candidate.catalog===parentCatalog&&candidate.active&&candidate.code!==item?.code).map((candidate)=>[candidate.code,candidate])).values()]:[];
      parentSelect.innerHTML=`<option value="">Sem vínculo</option>${candidates.map((candidate)=>`<option value="${esc(candidate.code)}" ${selected===candidate.code?"selected":""}>${esc(candidate.label)}</option>`).join("")}`;
      parentSelect.disabled=!parentCatalog;
      parentHelp.textContent=parentCatalog?"Selecione o superior hierárquico deste cadastro.":"Este tipo de cadastro não utiliza vínculo superior.";
      updateUsagePreview(catalog);
    };
    updateParentOptions(item?.catalog||"",item?.parent_code||"");
    form.elements.catalog?.addEventListener("change",(event)=>updateParentOptions(event.target.value));
    wrap.querySelector("[data-cancel]").addEventListener("click",()=>wrap.remove());
    if(item){const {data}=await supabase.from("semed_reference_catalog_history").select("operation,changed_at,new_data").eq("reference_id",item.id).order("changed_at",{ascending:false}).limit(5);wrap.querySelector("[data-history]").innerHTML=`<strong>Últimas alterações</strong>${data?.length?`<ul>${data.map((row)=>`<li>${new Date(row.changed_at).toLocaleString("pt-BR")} · ${row.operation==="INSERT"?"criado":"alterado"}</li>`).join("")}</ul>`:"<p>Ainda não há alterações registradas.</p>"}`}
    form.addEventListener("submit",async(event)=>{event.preventDefault();const submit=form.querySelector(".catalog-primary"),error=form.querySelector("[data-error]"),values=new FormData(form),catalog=item?.catalog||String(values.get("catalog")),label=String(values.get("label")||"").trim(),code=String(values.get("code")||"").trim()||codeFromLabel(label),active=values.get("active")==="true",parent_code=String(values.get("parentCode")||"")||null;
      const normalizedLabel=label.toLocaleLowerCase("pt-BR"),sameLogicalCatalog=(candidate)=>candidate.catalog===catalog||catalog==="DIRECTORATE"&&candidate.catalog==="AREA";
      const duplicate=items.find((candidate)=>candidate.id!==item?.id&&sameLogicalCatalog(candidate)&&(candidate.code===code||candidate.label.trim().toLocaleLowerCase("pt-BR")===normalizedLabel)&&!(item&&["AREA","DIRECTORATE"].includes(item.catalog)&&candidate.code===item.code));
      if(duplicate){error.textContent=`Já existe ${duplicate.label} neste tipo de cadastro.`;return}
      if(parent_code===code){error.textContent="Um cadastro não pode ser vínculo superior dele mesmo.";return}
      if(createsHierarchyCycle(code,parent_code)){error.textContent="Este vínculo criaria um ciclo na hierarquia institucional.";return}
      submit.disabled=true;error.textContent="Salvando…";let result;
      if(catalog==="EDUCATIONAL_UNIT") {
        const organization_id=item?.metadata?.organization_id||items.find((candidate)=>candidate.catalog==="EDUCATIONAL_UNIT")?.metadata?.organization_id;
        const unitMutation=item
          ?await supabase.from("avalia_educational_units").update({name:label,code,active}).eq("id",item.source_id).select("id").single()
          :await supabase.from("avalia_educational_units").insert({name:label,code,active,organization_id}).select("id").single();
        if(unitMutation.error) result=unitMutation;
        else result=await supabase.from("semed_reference_catalogs").update({parent_code,updated_at:new Date().toISOString()}).eq("catalog","EDUCATIONAL_UNIT").eq("source_id",unitMutation.data.id);
      }
      else result=item?await supabase.from("semed_reference_catalogs").update({label,code,parent_code,active,updated_at:new Date().toISOString()}).eq("id",item.id):await supabase.from("semed_reference_catalogs").insert({catalog,label,code,parent_code,active,sort_order:items.filter((candidate)=>candidate.catalog===catalog).length*10+10});
      if(result.error){error.textContent=result.error.message;submit.disabled=false;return} wrap.remove();await load();});
  }
  button.addEventListener("click",async()=>{panel.hidden=false;try{await load()}catch(error){content().innerHTML=`<p class="catalog-error">${esc(error.message)}</p>`}});
  panel.querySelector("[data-close]").addEventListener("click",()=>{panel.hidden=true});
}
