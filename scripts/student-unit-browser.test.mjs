import test from 'node:test';
import assert from 'node:assert/strict';
import {studentUnitGroupsHtml,studentSeries,mountStudentUnitBrowser} from '../modules/inteligencia/student-unit-browser.js';
const groups=[{id:'u1',name:'Unidade Alfa',student_count:123},{id:'u2',name:'Unidade Beta',student_count:2}];
const student={id:'s1',name:'Aluno fictício',registration:'TEST-001',grade:4,class_name:'4º A',active:true};
test('initial listing contains only unit names and full student counts',()=>{
 const html=studentUnitGroupsHtml(groups);
 assert.match(html,/Unidade Alfa/);assert.match(html,/123 aluno/);assert.match(html,/aria-expanded="false"/);
 assert.doesNotMatch(html,/data-open-student|Aluno fictício/);
});
test('expanded unit shows student name series class and stable registration',()=>{
 const html=studentUnitGroupsHtml(groups,new Map([['u1',{rows:[student],offset:0,more:false}]]));
 for(const expected of ['Aluno fictício','4º Ano','4º A','TEST-001','data-open-student="s1"','aria-expanded="true"'])assert.ok(html.includes(expected),expected);
 assert.equal((html.match(/data-open-student=/g)||[]).length,1);
});
test('group and student labels are escaped; missing grade is not fabricated',()=>{
 const html=studentUnitGroupsHtml([{id:'u1',name:'<img src=x>',student_count:1}],new Map([['u1',{rows:[{...student,name:'<script>x</script>'}],offset:0,more:false}]]));
 assert.doesNotMatch(html,/<img|<script/);assert.match(html,/&lt;script&gt;/);assert.equal(studentSeries({grade:null}),'Não informada');
});
// Minimal DOM adapter tests event wiring and lazy loading without a browser,
// credentials or external libraries. It does not replace visual inspection.
class Node {
 set innerHTML(html){this.html=html;this.buttons=[...html.matchAll(/<button\b([^>]*)>/g)].map(([,attrs])=>({dataset:Object.fromEntries([...attrs.matchAll(/data-([a-z-]+)="([^"]*)"/g)].map(([,k,v])=>[k.replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),v])),disabled:/\bdisabled\b/.test(attrs)}));}
 get innerHTML(){return this.html;}
 querySelectorAll(selector){const key=selector.slice(6,-1).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());return this.buttons.filter(b=>Object.hasOwn(b.dataset,key));}
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('students load only on expansion, student click opens report, next click collapses',async()=>{
 const node=new Node(),calls=[],opened=[];
 const rpc=async(name,args)=>{calls.push([name,args]);return name==='get_student_report_groups'?groups:[student];};
 const browser=mountStudentUnitBrowser(node,{rpc,onSelect:id=>opened.push(id)});
 await browser.refresh({unit:'u1'});
 assert.equal(calls.length,1);assert.equal(calls[0][1].p_unit,'u1');assert.equal(opened.length,0);
 node.querySelectorAll('[data-unit-toggle]')[0].onclick();await settle();
 assert.equal(calls[1][0],'search_student_report');assert.equal(calls[1][1].p_unit,'u1');
 node.querySelectorAll('[data-open-student]')[0].onclick();assert.deepEqual(opened,['s1']);
 node.querySelectorAll('[data-unit-toggle]')[0].onclick();assert.doesNotMatch(node.innerHTML,/Aluno fictício/);assert.equal(calls.length,2);
 node.querySelectorAll('[data-unit-toggle]')[0].onclick();assert.match(node.innerHTML,/Aluno fictício/);assert.equal(calls.length,2);
});
test('late response for a previous unit filter cannot replace the current listing',async()=>{
 const node=new Node();let firstResolve;
 const browser=mountStudentUnitBrowser(node,{onSelect:()=>{},rpc:async(name,args)=>args.p_unit==='u1'?new Promise(resolve=>{firstResolve=resolve;}):[groups[1]]});
 const first=browser.refresh({unit:'u1'});await browser.refresh({unit:'u2'});firstResolve([groups[0]]);await first;
 assert.match(node.innerHTML,/Unidade Beta/);assert.doesNotMatch(node.innerHTML,/Unidade Alfa/);
});
