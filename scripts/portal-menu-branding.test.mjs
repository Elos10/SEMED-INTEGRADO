import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {installPortalMenuBranding} from '../portal-menu-branding.js';
test('standalone systems are untouched',()=>{
 let touched=false;installPortalMenuBranding({querySelectorAll:()=>{touched=true;return [];}},'standalone.example');assert.equal(touched,false);
});
test('only menu logout buttons are hidden, and original logo is shipped',async()=>{
 const code=await readFile(new URL('../portal-menu-branding.js',import.meta.url),'utf8');
 assert.match(code,/\.sidebar,\[data-workspace-sidebar\]/);assert.match(code,/==='Sair'/);assert.match(code,/data-portal-menu-logo/);
 const build=await readFile(new URL('./build-portal.mjs',import.meta.url),'utf8');assert.match(build,/logo-educacao-uberaba.png/);
 const image=await readFile(new URL('../modules/logo-educacao-uberaba.png',import.meta.url));assert.equal(image.subarray(1,4).toString(),'PNG');
});
