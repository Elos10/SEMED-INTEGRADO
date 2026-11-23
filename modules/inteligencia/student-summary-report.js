const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const modules={incidents:['Incidentes Escolares','Tipo de incidente'],protected:['Comunicação Protegida','Tipo de ocorrência'],learning:['Avaliações','Avaliação / disciplina'],active_search:['Busca Ativa','Faltas / atestados'],sae:['Atendimentos SAE','Situação apresentada']};
const incidentTypes={conflito_interpessoal:'Conflito interpessoal',indisciplina:'Indisciplina',agressao_verbal:'Agressão verbal',agressao_fisica:'Agressão física',discriminacao_intimidacao:'Discriminação ou intimidação',dano_patrimonio:'Dano ao patrimônio',acidente:'Acidente',alimentacao:'Alimentação',animal_dependencias:'Animal nas dependências',seguranca_unidade:'Segurança da unidade',transporte_escolar:'Transporte escolar',conduta_servidor:'Conduta de servidor',saude:'Saúde',outro:'Outro'};
const protectedTypes={violencia_fisica:'Violência física',violencia_sexual:'Violência sexual',violencia_psicologica:'Violência psicológica',negligencia:'Negligência',ameaca:'Ameaça',discriminacao:'Discriminação',violencia_institucional:'Violência institucional',outro:'Outro'};
export function studentSummaryReportHtml(records,{date,allowedModules=Object.keys(modules)}={}) {
 const formatDate=date||((value)=>value?String(value).slice(0,10).split('-').reverse().join('/'):'Não informada');
 const sections=Object.entries(modules).filter(([key])=>allowedModules.includes(key)).map(([key,[title,label]])=>{
  const rows=records.filter(r=>r.module===key).sort((a,b)=>String(a.date||'9999').localeCompare(String(b.date||'9999')));
  if(!rows.length)return '';
  return `<section class="dossier-module dossier-summary"><header><h3>${title}</h3></header><table><thead><tr><th>Data</th><th>${label}</th>${key==='learning'?'<th>Resultado</th>':''}</tr></thead><tbody>${rows.map(r=>{
   const text=key==='protected'?protectedTypes[r.occurrence_type]||'****':key==='learning'?[r.protocol,r.summary].filter(Boolean).join(' · '):key==='incidents'?incidentTypes[r.summary]||r.summary:r.summary;
   return `<tr><td>${escape(formatDate(r.date))}</td><td>${escape(text||'Não informado')}</td>${key==='learning'?`<td>${escape(r.details?.Aproveitamento??'Não informado')}</td>`:''}</tr>`;
  }).join('')}</tbody></table></section>`;
 }).join('');
 return sections||'<p class="empty">Nenhum registro vinculado e disponível neste recorte. Isso não significa ausência de acompanhamentos.</p>';
}
