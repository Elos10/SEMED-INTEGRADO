import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dossierTimeline,dossierRecordsHtml,dossierPrintHtml,dossierEnrollmentHtml,dossierModuleReportHtml,filterDossierRecords,authorizedDossierModules} from '../modules/inteligencia/student-dossier.js';
const dossier={student:{id:'test-id',name:'Aluno de teste',registration:'TEST-01',unit_name:'Unidade de teste',class_name:'4º A',school_year:2026},evaluations:[],enrollments:[],emitted_at:'2026-11-19T12:00:00Z',issuer:'Emissor de teste'};
test('timeline combines only explicit records and orders by date',()=>{
 const rows=dossierTimeline({...dossier,evaluations:[{id:'eval',number:'Final',date:'2026-10-01',percentage:0}]},[{id:'sae',module:'sae',date:'2026-11-01',summary:'Acompanhamento'}]);
 assert.deepEqual(rows.map(x=>x.id),['eval','sae']);assert.equal(rows[0].details.Aproveitamento,'0%');
 assert.equal(dossierTimeline(dossier,[]).length,0);
});
test('protected summaries are masked again in timeline, rendering and print',()=>{
 const rows=[{module:'protected',id:'cp',summary:'PRIVATE SUMMARY',details:{Nome:'PRIVATE NAME'},protocol:'CP-TEST',unit:'Unidade de origem'}];
 for(const html of [dossierRecordsHtml(rows),dossierRecordsHtml(dossierTimeline(dossier,rows)),dossierPrintHtml(dossier,rows)]){
  assert.doesNotMatch(html,/PRIVATE/);assert.match(html,/\*\*\*\*/);assert.match(html,/Unidade de origem/);
 }
});
test('all supplied text is escaped and long narratives are not shortened',()=>{
 const long='Texto integral '.repeat(2000);
 const html=dossierRecordsHtml([{module:'sae',summary:'<script>bad()</script>',details:{Relato:long},href:'javascript:bad()'}]);
 assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script|javascript:/);assert.ok(html.includes(long));
});
test('print uses requested paper configuration and responsible emitter',()=>{
 const html=dossierPrintHtml(dossier,[]);
 for(const token of ['size:A4 portrait','margin:10mm','10pt Calibri','counter(page)','Emissor de teste','TEST-01','Não constitui declaração'])assert.ok(html.includes(token),token);
 assert.match(html,/Preparado em/);assert.match(html,/Anexos não incluídos/);
});
test('enrollment snapshots are clearly distinguished from historical entry dates',()=>{
 const html=dossierEnrollmentHtml([{origin:'initial_snapshot',unit_name:'Unidade anterior',class_name:'3º A',school_year:2025,observed_at:'2026-11-19'}]);
 assert.match(html,/Não representa a data de ingresso/);assert.match(html,/Unidade anterior/);assert.match(html,/Retrato inicial/);
});
test('source gateway validates central identity before using the private index',async()=>{
 const code=await readFile(new URL('../supabase/functions/student-dossier-sources/index.ts',import.meta.url),'utf8');
 assert.ok(code.indexOf('auth.getUser(token)')<code.indexOf('const index=createClient'));
 assert.ok(code.indexOf('if(denied || !dossier)')<code.indexOf('const index=createClient'));
 assert.match(code,/if\(body.action!=="read" && !dossier.can_link\)/);
 assert.match(code,/\.auth\.signOut\(\{scope:"local"\}\)/);
 assert.match(code,/if\(person.protect_identity\) return null/);
 assert.doesNotMatch(code,/index\.from\("(?:protected_cases|sae_cases|school_incidents|active_search_records)"\)/);
});
test('hardening migration hides case existence from browser APIs',async()=>{
 const sql=await readFile(new URL('../supabase/migrations/20261119231411_protect_student_dossier_index_and_enrollment_history.sql',import.meta.url),'utf8');
 assert.match(sql,/revoke all on public.semed_student_record_links from authenticated,anon,public/);
 assert.doesNotMatch(sql,/'links',links/);
 assert.match(sql,/security invoker/);
 assert.match(sql,/enable row level security/);
});
test('module report separates sources and never renders unauthorized modules',()=>{
 const records=[{module:'learning',protocol:'AV-TEST',summary:'Português',details:{}},{module:'sae',protocol:'SAE-TEST',summary:'Demanda',details:{Relato:'Relato completo'}},{module:'protected',protocol:'PRIVATE-CP',summary:'PRIVATE SUMMARY'}];
 const modules=authorizedDossierModules({sources:{sae:true,protected:false}});
 const html=dossierModuleReportHtml(records,modules);
 assert.match(html,/data-report-module="learning"/);assert.match(html,/data-report-module="sae"/);assert.doesNotMatch(html,/PRIVATE|data-report-module="protected"/);
 assert.match(html,/Relato completo/);assert.match(html,/1 registro\(s\)/);
});
test('empty sections do not assert absence of previous follow-up',()=>{
 assert.match(dossierModuleReportHtml([],['sae']),/Nenhum registro vinculado disponível neste período/);
});
test('module date and occurrence unit filters apply together without filtering by current school',()=>{
 const records=[{module:'sae',date:'2026-10-01',unit:'Unidade Anterior'},{module:'sae',date:'2026-11-01',unit:'Unidade Atual'},{module:'incidents',date:'2026-10-02',unit:'Unidade Anterior'}];
 assert.equal(filterDossierRecords(records,{module:'sae',start:'2026-10-01',end:'2026-10-31',unitMode:'record',unitLabel:'Unidade Anterior'}).length,1);
 assert.equal(filterDossierRecords(records,{unitMode:'current',unitLabel:'Unidade Atual'}).length,3);
 assert.equal(filterDossierRecords(records,{unitMode:'record',unitLabel:'Unidade Anterior'}).length,2);
});
test('module report and print preserve protected masks and complete narratives',()=>{
 const long='Narrativa completa '.repeat(500);
 const records=[{module:'protected',protocol:'CP-TEST',summary:'PRIVATE',details:{Nome:'PRIVATE'}},{module:'sae',protocol:'SAE-TEST',details:{Relato:long}}];
 const html=dossierPrintHtml(dossier,records,{modules:['protected','sae'],filterSummary:'Unidade atual: Teste · Período: novembro'});
 assert.doesNotMatch(html,/PRIVATE/);assert.match(html,/\*\*\*\*/);assert.ok(html.includes(long));assert.doesNotMatch(html,/<details/);assert.match(html,/Histórico integrado do aluno/);assert.match(html,/Período: novembro/);
});
test('period boundaries use the same Sao Paulo calendar day displayed in the report',()=>{
 const records=[{module:'sae',date:'2026-11-02T01:00:00Z'},{module:'sae',date:'2026-11-02'}];
 assert.equal(filterDossierRecords(records,{start:'2026-11-01',end:'2026-11-01'}).length,1);
 assert.equal(filterDossierRecords(records,{start:'2026-11-02',end:'2026-11-02'}).length,1);
});
