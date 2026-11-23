import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {requestStudentSources} from '../modules/inteligencia/student-source-client.js';
test('source request uses same origin, keeps authorization and disables caching',async()=>{
 let received;
 const result=await requestStudentSources({token:'test-token',body:{action:'read',student_id:'test'},fetcher:async(url,options)=>{received={url,options};return {ok:true,json:async()=>({records:[]})};}});
 assert.equal(received.url,'/integrations/student-dossier-sources');assert.equal(received.options.headers.Authorization,'Bearer test-token');assert.equal(received.options.headers['X-Portal-Authorization'],'Bearer test-token');assert.equal(received.options.cache,'no-store');assert.equal(received.options.credentials,'same-origin');assert.deepEqual(result,{records:[]});
 const config=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.ok(config.rewrites.some(r=>r.source===received.url&&r.destination.endsWith('/functions/v1/student-dossier-sources')));
});
test('network, session, and invalid response failures are understandable without hiding errors',async()=>{
 for(const [fetcher,expected] of [[async()=>{throw new TypeError('Failed to fetch');},/Não foi possível conectar/],[async()=>({ok:false,status:401,json:async()=>({})}),/validar sua sessão/],[async()=>({ok:true,json:async()=>{throw new Error();}}),/resposta inválida/]]){
  await assert.rejects(requestStudentSources({token:'test',body:{},fetcher}),expected);
 }
});
test('authentication rejection refreshes once and never loops or retries permission failures',async()=>{
 let calls=0,refreshes=0;
 const refreshToken=async()=>{refreshes++;return 'fresh-test';};
 const fetcher=async(_url,options)=>{calls++;return {ok:calls===2,status:calls===2?200:401,json:async()=>({records:[],usedFresh:options.headers['X-Portal-Authorization']==='Bearer fresh-test'})};};
 const result=await requestStudentSources({token:'old-test',body:{action:'read'},fetcher,refreshToken});
 assert.equal(calls,2);assert.equal(refreshes,1);assert.equal(result.usedFresh,true);
 calls=0;refreshes=0;
 await assert.rejects(requestStudentSources({token:'test',body:{},refreshToken,fetcher:async()=>{calls++;return {ok:false,status:401,json:async()=>({})};}}));
 assert.equal(calls,2);assert.equal(refreshes,1);
 refreshes=0;
 await assert.rejects(requestStudentSources({token:'test',body:{},refreshToken,fetcher:async()=>({ok:false,status:403,json:async()=>({error:'Acesso negado'})})}),/Acesso negado/);
 assert.equal(refreshes,0);
});
test('portal transport never bypasses server identity or permission checks',async()=>{
 const code=await readFile(new URL('../supabase/functions/student-dossier-sources/index.ts',import.meta.url),'utf8');
 assert.match(code,/headers.get\("X-Portal-Authorization"\)/);assert.match(code,/auth.getUser\(token\)/);assert.match(code,/get_student_dossier/);assert.match(code,/!dossier.can_link/);
});
test('unified report distinguishes unavailable sources from absence of records',async()=>{
 const code=await readFile(new URL('../modules/inteligencia/student-dossier.js',import.meta.url),'utf8');
 assert.match(code,/dossier-unified-report/);assert.match(code,/sourcesReady\|\|filtered\(\)\.length/);assert.match(code,/Gerenciar vínculos/);assert.doesNotMatch(code,/class="panel dossier-report"|class="panel dossier-enrollment"/);
});
