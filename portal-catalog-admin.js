const CATALOGS = {
  AREA: ["Áreas de atuação", "Organização institucional"],
  DIRECTORATE: ["Diretorias", "Organização institucional"],
  SECTOR: ["Setores e departamentos", "Estrutura operacional"],
  JOB_TITLE: ["Cargos e funções", "Vínculos de usuários"],
  EDUCATIONAL_UNIT: ["Unidades educacionais", "Avaliações, Comunicação e CREI/SAE"],
};
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const codeFromLabel = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");

export function initSharedCatalogAdmin({ supabase, context }) {
  const access = (context.modules || []).find((item) => item.code === "cadastros")?.permissions;
  if (!access?.view) return;
  const userArea = document.querySelector(".portal-user");
  if (!userArea || userArea.querySelector("[data-catalog-admin]")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.dataset.catalogAdmin = "1";
  button.textContent = "Cadastros compartilhados";
  userArea.prepend(button);

  const style = document.createElement("style");
  style.textContent = `
    .catalog-admin{position:fixed;inset:0;z-index:210;padding:22px;overflow:auto;background:#071b46d9}.catalog-admin[hidden]{display:none}.catalog-shell{width:min(1320px,100%);min-height:calc(100vh - 44px);margin:auto;padding:24px;border-radius:22px;background:#f5f7fb;color:#17254a;box-shadow:0 30px 90px #00113388}.catalog-head,.catalog-toolbar,.catalog-actions{display:flex;align-items:center;gap:12px}.catalog-head{justify-content:space-between}.catalog-head h2,.catalog-card h3{margin:0}.catalog-head p{margin:5px 0 0;color:#687694}.catalog-toolbar{margin:20px 0;display:grid;grid-template-columns:1fr 230px 170px auto}.catalog-toolbar input,.catalog-toolbar select,.catalog-dialog input,.catalog-dialog select{min-height:43px;padding:9px 12px;border:1px solid #cad5e8;border-radius:10px;background:#fff;color:#17254a}.catalog-stats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-bottom:18px}.catalog-card{padding:15px;border:1px solid #d9e2f0;border-radius:15px;background:#fff;text-align:left;color:#17254a}.catalog-card.active{border-color:#315bb4;background:#edf3ff}.catalog-card strong{display:block;margin-top:7px;font-size:22px}.catalog-card small{color:#697895}.catalog-table{overflow:auto;border:1px solid #dae2ef;border-radius:14px;background:#fff}.catalog-table table{width:100%;border-collapse:collapse}.catalog-table th,.catalog-table td{padding:12px 14px;border-bottom:1px solid #e5eaf2;text-align:left;font-size:13px}.catalog-table th{background:#eaf0f9;color:#18366d}.catalog-status{display:inline-flex;padding:4px 9px;border-radius:999px;background:#e4f3eb;color:#17623d;font-weight:800}.catalog-status.inactive{background:#f4e7e7;color:#962c2c}.catalog-primary,.catalog-secondary{border-radius:9px;padding:10px 14px;font-weight:800;cursor:pointer}.catalog-primary{border:0;background:#27479c;color:#fff}.catalog-secondary{border:1px solid #afbdd4;background:#fff;color:#17336d}.catalog-empty{padding:34px!important;text-align:center!important;color:#6d7890}.catalog-dialog-wrap{position:fixed;inset:0;z-index:220;display:grid;place-items:center;padding:18px;background:#06173d99}.catalog-dialog{width:min(640px,100%);padding:22px;border-radius:20px;background:#fff;box-shadow:0 24px 70px #00113366}.catalog-dialog h3{margin:0 0 5px}.catalog-dialog p{margin:0 0 18px;color:#667591}.catalog-form{display:grid;grid-template-columns:1fr 1fr;gap:13px}.catalog-form label{display:grid;gap:6px;font-size:12px;font-weight:800}.catalog-wide{grid-column:1/-1}.catalog-actions{justify-content:flex-end;margin-top:18px}.catalog-note{padding:12px;border-radius:10px;background:#edf3ff;color:#294c91;font-size:12px}.catalog-error{color:#a51f2b;font-weight:700}.catalog-history{margin-top:16px;padding-top:14px;border-top:1px solid #e1e7f0}.catalog-history ul{max-height:160px;overflow:auto;padding-left:18px;color:#53627e;font-size:12px}
    @media(max-width:850px){.catalog-toolbar{grid-template-columns:1fr 1fr}.catalog-toolbar input{grid-column:1/-1}.catalog-stats{grid-template-columns:repeat(2,1fr)}}@media(max-width:560px){.catalog-admin{padding:0}.catalog-shell{min-height:100vh;border-radius:0;padding:16px}.catalog-head{align-items:flex-start}.catalog-toolbar,.catalog-form{grid-template-columns:1fr}.catalog-toolbar>*{grid-column:1}.catalog-stats{grid-template-columns:1fr 1fr}.catalog-wide{grid-column:1}}
  `;
  document.head.append(style);

  const panel = document.createElement("section");
  panel.className = "catalog-admin";
  panel.hidden = true;
  panel.innerHTML = `<div class="catalog-shell"><header class="catalog-head"><div><h2>Cadastros Compartilhados</h2><p>Uma única fonte de dados para todos os sistemas do Portal.</p></div><button class="catalog-secondary" data-close>Fechar</button></header><div data-catalog-content></div></div>`;
  document.body.append(panel);

  let items = [], category = "ALL", search = "", situation = "ALL";
  const content = () => panel.querySelector("[data-catalog-content]");
  async function load() {
    content().innerHTML = "<p>Carregando cadastros compartilhados…</p>";
    const { data, error } = await supabase.from("semed_reference_catalogs").select("*").order("catalog").order("sort_order").order("label");
    if (error) throw error;
    items = data || [];
    render();
  }
  function render() {
    const visible = items.filter((item) => (category === "ALL" || item.catalog === category) && (situation === "ALL" || String(item.active) === situation) && (!search || `${item.label} ${item.code}`.toLocaleLowerCase("pt-BR").includes(search)));
    content().innerHTML = `<section class="catalog-stats"><button class="catalog-card ${category === "ALL" ? "active" : ""}" data-category="ALL"><small>Todos os cadastros</small><strong>${items.length}</strong></button>${Object.entries(CATALOGS).map(([key,value]) => `<button class="catalog-card ${category === key ? "active" : ""}" data-category="${key}"><small>${esc(value[0])}</small><strong>${items.filter((item)=>item.catalog===key).length}</strong></button>`).join("")}</section>
      <div class="catalog-toolbar"><input data-search type="search" placeholder="Pesquisar por nome ou código…" value="${esc(search)}"><select data-category-select><option value="ALL">Todos os tipos</option>${Object.entries(CATALOGS).map(([key,value])=>`<option value="${key}" ${category===key?"selected":""}>${esc(value[0])}</option>`).join("")}</select><select data-situation><option value="ALL">Ativos e inativos</option><option value="true" ${situation==="true"?"selected":""}>Somente ativos</option><option value="false" ${situation==="false"?"selected":""}>Somente inativos</option></select>${access.create?'<button class="catalog-primary" data-new>Novo cadastro</button>':""}</div>
      <p class="catalog-note">Registros em uso não são excluídos: eles podem ser inativados, preservando documentos, relatórios e históricos anteriores.</p>
      <div class="catalog-table"><table><thead><tr><th>Descrição</th><th>Tipo</th><th>Utilizado por</th><th>Situação</th><th>Ação</th></tr></thead><tbody>${visible.length?visible.map((item)=>`<tr><td><strong>${esc(item.label)}</strong><br><small>${esc(item.code)}</small></td><td>${esc(CATALOGS[item.catalog]?.[0]||item.catalog)}</td><td>${esc(CATALOGS[item.catalog]?.[1]||"Portal")}</td><td><span class="catalog-status ${item.active?"":"inactive"}">${item.active?"Ativo":"Inativo"}</span></td><td>${access.edit?`<button class="catalog-secondary" data-edit="${item.id}">Editar</button>`:"Consulta"}</td></tr>`).join(""):'<tr><td colspan="5" class="catalog-empty">Nenhum cadastro corresponde aos filtros.</td></tr>'}</tbody></table></div>`;
    content().querySelector("[data-search]").addEventListener("input",(event)=>{search=event.target.value.trim().toLocaleLowerCase("pt-BR");render();const input=content().querySelector("[data-search]");input.focus();input.setSelectionRange(input.value.length,input.value.length)});
    content().querySelector("[data-category-select]").addEventListener("change",(event)=>{category=event.target.value;render()});
    content().querySelector("[data-situation]").addEventListener("change",(event)=>{situation=event.target.value;render()});
    content().querySelectorAll("[data-category]").forEach((node)=>node.addEventListener("click",()=>{category=node.dataset.category;render()}));
    content().querySelector("[data-new]")?.addEventListener("click",()=>editItem(null));
    content().querySelectorAll("[data-edit]").forEach((node)=>node.addEventListener("click",()=>editItem(items.find((item)=>item.id===node.dataset.edit))));
  }
  async function editItem(item) {
    const wrap = document.createElement("div");
    wrap.className = "catalog-dialog-wrap";
    wrap.innerHTML = `<form class="catalog-dialog"><h3>${item?"Editar cadastro":"Novo cadastro compartilhado"}</h3><p>A alteração será utilizada pelos sistemas integrados.</p><div class="catalog-form"><label>Tipo<select name="catalog" ${item?"disabled":""} required><option value="">Selecione</option>${Object.entries(CATALOGS).map(([key,value])=>`<option value="${key}" ${item?.catalog===key?"selected":""}>${esc(value[0])}</option>`).join("")}</select></label><label>Código<input name="code" value="${esc(item?.code)}" placeholder="Gerado automaticamente"></label><label class="catalog-wide">Descrição<input name="label" value="${esc(item?.label)}" required minlength="2"></label><label>Vínculo superior<select name="parentCode"><option value="">Sem vínculo</option>${items.filter((candidate)=>["AREA","DIRECTORATE"].includes(candidate.catalog)&&candidate.active).map((candidate)=>`<option value="${esc(candidate.code)}" ${item?.parent_code===candidate.code?"selected":""}>${esc(candidate.label)}</option>`).join("")}</select></label><label>Situação<select name="active"><option value="true" ${item?.active!==false?"selected":""}>Ativo</option><option value="false" ${item?.active===false?"selected":""}>Inativo</option></select></label><div class="catalog-wide catalog-error" data-error></div></div><div class="catalog-history" data-history></div><div class="catalog-actions"><button type="button" class="catalog-secondary" data-cancel>Cancelar</button><button class="catalog-primary">Salvar cadastro</button></div></form>`;
    document.body.append(wrap);
    const form=wrap.querySelector("form");
    wrap.querySelector("[data-cancel]").addEventListener("click",()=>wrap.remove());
    if(item){const {data}=await supabase.from("semed_reference_catalog_history").select("operation,changed_at,new_data").eq("reference_id",item.id).order("changed_at",{ascending:false}).limit(5);wrap.querySelector("[data-history]").innerHTML=`<strong>Últimas alterações</strong>${data?.length?`<ul>${data.map((row)=>`<li>${new Date(row.changed_at).toLocaleString("pt-BR")} · ${row.operation==="INSERT"?"criado":"alterado"}</li>`).join("")}</ul>`:"<p>Ainda não há alterações registradas.</p>"}`}
    form.addEventListener("submit",async(event)=>{event.preventDefault();const submit=form.querySelector(".catalog-primary"),error=form.querySelector("[data-error]"),values=new FormData(form),catalog=item?.catalog||String(values.get("catalog")),label=String(values.get("label")||"").trim(),code=String(values.get("code")||"").trim()||codeFromLabel(label),active=values.get("active")==="true",parent_code=String(values.get("parentCode")||"")||null;submit.disabled=true;error.textContent="Salvando…";let result;
      if(catalog==="EDUCATIONAL_UNIT") { const organization_id=item?.metadata?.organization_id||items.find((candidate)=>candidate.catalog==="EDUCATIONAL_UNIT")?.metadata?.organization_id; result=item?await supabase.from("avalia_educational_units").update({name:label,code,active}).eq("id",item.source_id):await supabase.from("avalia_educational_units").insert({name:label,code,active,organization_id}); }
      else result=item?await supabase.from("semed_reference_catalogs").update({label,code,parent_code,active,updated_at:new Date().toISOString()}).eq("id",item.id):await supabase.from("semed_reference_catalogs").insert({catalog,label,code,parent_code,active,sort_order:items.filter((candidate)=>candidate.catalog===catalog).length*10+10});
      if(result.error){error.textContent=result.error.message;submit.disabled=false;return} wrap.remove();await load();});
  }
  button.addEventListener("click",async()=>{panel.hidden=false;try{await load()}catch(error){content().innerHTML=`<p class="catalog-error">${esc(error.message)}</p>`}});
  panel.querySelector("[data-close]").addEventListener("click",()=>{panel.hidden=true});
}
