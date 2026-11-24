import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('financial statement redistributes six monetary indicators into three columns',async()=>{
 const css=await readFile(new URL('../modules/monitor/financial-enhancements.css',import.meta.url),'utf8');
 assert.match(css,/\.financial-statement-expanded \.financial-statement-kpis\.financial-kpis-six\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:800px\).*financial-statement-kpis\.financial-kpis-six\{grid-template-columns:repeat\(2/);
 assert.match(css,/@media\(max-width:520px\).*grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/font-variant-numeric:tabular-nums;white-space:normal;overflow-wrap:anywhere/);
 assert.doesNotMatch(css,/text-overflow:ellipsis/);
 assert.match(css,/\.financial-total-panel \.financial-kpis\.financial-kpis-six\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/\.financial-total-panel \.financial-kpis-six \.kpi strong\{font-size:clamp\(18px,1.8vw,26px\)/);
});
