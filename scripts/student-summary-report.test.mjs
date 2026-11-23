import test from 'node:test';
import assert from 'node:assert/strict';
import {studentSummaryReportHtml} from '../modules/inteligencia/student-summary-report.js';
test('lists date and type only under modules with records',()=>{
 const html=studentSummaryReportHtml([{module:'incidents',date:'2026-11-20',summary:'acidente'},{module:'incidents',date:'2026-10-01',summary:'saude'}]);
 assert.match(html,/Incidentes Escolares/);assert.match(html,/Tipo de incidente/);assert.ok(html.indexOf('01\/10\/2026')<html.indexOf('20\/11\/2026'));assert.match(html,/Acidente/);assert.doesNotMatch(html,/Comunicação Protegida|Atendimentos SAE|<details/);
});
test('only safe category and date appear for protected records',()=>{
 const html=studentSummaryReportHtml([{module:'protected',date:'2026-11-20',occurrence_type:'violencia_fisica',summary:'PRIVATE',details:{Pessoa:'PRIVATE'}}]);
 assert.match(html,/Violência física/);assert.match(html,/Tipo de ocorrência/);assert.doesNotMatch(html,/PRIVATE/);
 assert.match(studentSummaryReportHtml([{module:'protected',occurrence_type:'PRIVATE'}]),/\*\*\*\*/);
});
test('escapes labels and respects source authorization',()=>{
 const html=studentSummaryReportHtml([{module:'sae',summary:'<script>test</script>'},{module:'incidents',summary:'acidente'}],{allowedModules:['sae']});
 assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script|Incidentes Escolares/);
});
