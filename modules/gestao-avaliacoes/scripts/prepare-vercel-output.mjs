import {cp,rm,stat} from 'node:fs/promises';
import path from 'node:path';

const source=path.resolve('apps/web/dist');
const destination=path.resolve('dist');

const sourceStat=await stat(source).catch(()=>null);
if(!sourceStat?.isDirectory()){
 throw new Error('A compilação do frontend não criou apps/web/dist.');
}

await rm(destination,{recursive:true,force:true});
await cp(source,destination,{recursive:true});
console.log(`Frontend preparado para publicação em ${destination}`);
