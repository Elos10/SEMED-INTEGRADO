export const modules=['protected','incidents','active_search','sae'];
export function dayKey(value){
 if(!value)return '';if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
 const d=new Date(value);if(Number.isNaN(d.getTime()))return '';
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d).map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`;
}
export function aggregateModule(module,rows,year){
 const buckets=new Map();let undated=0;
 for(const r of rows){
  const day=dayKey(module==='sae'?r.opened_on:module==='active_search'?r.created_at:r.occurred_at||r.created_at);
  if(!day){undated++;continue;}if(!day.startsWith(`${year}-`))continue;
  const month=Number(day.slice(5,7)),unit=String(r.unit_name||r.reporting_unit||'').trim()||'Unidade não informada',key=JSON.stringify([month,unit]);
  const b=buckets.get(key)||{month,unit,total:0,closed:module==='active_search'?null:0,critical:0,absences:0,certified:0};
  b.total++;
  if(b.closed!==null&&({protected:['concluida','arquivada'],incidents:['resolvido','encerrado'],sae:['solucionado']}[module]||[]).includes(r.status))b.closed++;
  if(module==='protected'&&['alto','imediato'].includes(r.risk_level))b.critical++;
  if(module==='active_search'){b.absences+=Number(r.absence_count||0);b.certified+=Number(r.certified_absence_count||0);}
  buckets.set(key,b);
 }
 return {status:'available',buckets:[...buckets.values()],undated};
}
