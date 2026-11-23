import test from 'node:test';
import assert from 'node:assert/strict';
import {aggregateModule,dayKey} from '../supabase/functions/crei-decision-metrics/aggregate.js';
import {decisionSummary,decisionPanelHtml} from '../modules/inteligencia/crei-decision-panel.js';
import {readFile} from 'node:fs/promises';
const modules={
 protected:aggregateModule('protected',[{unit_name:'Alfa',occurred_at:'2026-04-10',status:'concluida',risk_level:'alto'}],2026),
 incidents:aggregateModule('incidents',[{reporting_unit:'Alfa',occurred_at:'2026-04-10',status:'registrado'}],2026),
 active_search:aggregateModule('active_search',[{unit_name:'Beta',created_at:'2026-04-10',absence_count:10,certified_absence_count:3}],2026),
 sae:aggregateModule('sae',[{unit_name:'Alfa',opened_on:'2026-04-10',status:'solucionado'},{unit_name:'Beta',opened_on:'2026-03-10',status:'aberto'}],2026),
};
test('aggregation returns no names, identities, protocols or narratives and uses Sao Paulo dates',()=>{
 const result=aggregateModule('sae',[{unit_name:'Test',opened_on:'2026-01-01',full_name:'PRIVATE',notes:'SECRET',protocol:'HIDDEN'}],2026);
 assert.doesNotMatch(JSON.stringify(result),/PRIVATE|SECRET|HIDDEN/);assert.equal(dayKey('2026-04-01T01:00:00Z'),'2026-03-31');
 assert.equal(aggregateModule('sae',[{opened_on:'2025-01-01'}],2026).buckets.length,0);
});
test('totals, unit and month filters retain counts and exclude active search from outcome denominator',()=>{
 const result=decisionSummary({modules},{month:'4'});assert.equal(result.total,4);assert.equal(result.closed,2);assert.equal(result.outcomeBase,3);assert.equal(result.pending,1);assert.equal(result.modules.active_search.closed,null);assert.equal(result.modules.active_search.certified,3);
 assert.equal(decisionSummary({modules},{unit:'Alfa',month:'4'}).total,3);
 assert.equal(decisionSummary({modules},{month:'3'}).total,1);
});
test('unavailable or restricted sources never masquerade as available zeroes',()=>{
 const html=decisionPanelHtml({year:2026,modules:{protected:{status:'restricted'},sae:{status:'unavailable'}}});
 assert.match(html,/Nenhuma das quatro fontes/);assert.doesNotMatch(html,/Lançamentos<\/span>|0%/);
 const partial=decisionPanelHtml({year:2026,modules:{...modules,sae:{status:'unavailable'}}});assert.match(partial,/Consulta parcial/);assert.match(partial,/fonte indisponível/);
});
test('safe HTML retains all four modules, denominators and escaping',()=>{
 const html=decisionPanelHtml({year:2026,modules},{month:'4'});
 for(const text of ['Comunicação Protegida','Incidentes Escolares','Busca Ativa','Atendimentos SAE','66,7%','não alunos únicos','Não se aplica'])assert.ok(html.includes(text),text);
 const unsafe={...modules,sae:aggregateModule('sae',[{unit_name:'<script>bad()</script>',opened_on:'2026-04-01'}],2026)};
 assert.doesNotMatch(decisionPanelHtml({year:2026,modules:unsafe}),/<script>/);
});
test('gateway checks central and source permissions and reads only via user RLS with full pagination',async()=>{
 const code=await readFile(new URL('../supabase/functions/crei-decision-metrics/index.ts',import.meta.url),'utf8');
 assert.match(code,/auth.getUser\(token\)/);assert.match(code,/m.code==='inteligencia'&&m.permissions\?\.view/);assert.match(code,/profile.incident_reports/);assert.match(code,/profile.sae_reports/);assert.match(code,/range\(offset,offset\+499\)/);
 assert.doesNotMatch(code,/SUPABASE_SERVICE_ROLE_KEY|student_name|full_name|objective_description/);
});
