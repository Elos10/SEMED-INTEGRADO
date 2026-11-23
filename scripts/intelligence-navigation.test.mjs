import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('overview includes distinct Communication and CREI while sidebar keeps management options only',async()=>{
 const code=await readFile(new URL('../modules/inteligencia/app.js',import.meta.url),'utf8');
 const sidebar=code.slice(code.indexOf('<nav class="nav"'),code.indexOf('</nav>'));
 assert.doesNotMatch(sidebar,/Gestão de Avaliações|Monitoramento|Comunicação|CREI\/SAE/);
 for(const label of ['Visão Geral','Alertas e Prioridades','Agenda de Decisões'])assert.ok(sidebar.includes(label));
 assert.match(code,/\["communication","Comunicação","Informações institucionais"\]/);
 assert.match(code,/\["risks","CREI\/SAE","Proteção e acompanhamento"\]/);
 assert.match(code,/data-view="communication"/);assert.match(code,/data-view="risks"/);
 assert.doesNotMatch(code,/\/comunicacao\/\?view=(?:incidentes|protegida)/);
 assert.match(code,/\/crei-sae\/\?view=incidentes/);
});
