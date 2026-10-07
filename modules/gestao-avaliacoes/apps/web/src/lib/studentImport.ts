import {MAX_STUDENT_IMPORT_ROWS} from '@omr/core/imports';

export type StudentImportRow={name:string;registration?:string;unit:string;grade:number;className:string;timeMode:'PARTIAL'|'FULL'};

const required=['nome','matricula','unidade','serie','turma','tempo'];
const clean=(value:string)=>value.trim().replace(/^"|"$/g,'').replace(/""/g,'"');

export function parseStudentCsv(text:string):StudentImportRow[]{
 const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim());
 if(lines.length<2)throw new Error('O arquivo não possui alunos para importar.');
 if(lines.length-1>MAX_STUDENT_IMPORT_ROWS)throw new Error(`O arquivo excede o limite de ${MAX_STUDENT_IMPORT_ROWS.toLocaleString('pt-BR')} alunos.`);
 const delimiter=(lines[0].match(/;/g)?.length??0)>=(lines[0].match(/,/g)?.length??0)?';':',';
 const split=(line:string)=>line.split(new RegExp(`${delimiter}(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)`)).map(clean);
 const headers=split(lines[0]).map(x=>x.toLocaleLowerCase('pt-BR'));
 if(required.some(x=>!headers.includes(x)))throw new Error(`Cabeçalho inválido. Use: ${required.join(';')}`);
 return lines.slice(1).map((line,index)=>{
  const values=split(line),value=(name:string)=>values[headers.indexOf(name)]??'';
  const grade=Number(value('serie').replace(/\D/g,''));
  const time=value('tempo').toLocaleLowerCase('pt-BR');
  if(!value('nome')||!value('unidade')||!grade||!value('turma')||!['parcial','integral'].includes(time))throw new Error(`Linha ${index+2} inválida. Confira nome, unidade, série, turma e tempo.`);
  return {name:value('nome'),registration:value('matricula')||undefined,unit:value('unidade'),grade,className:value('turma'),timeMode:time==='integral'?'FULL':'PARTIAL'};
 });
}

export function downloadStudentTemplate(){
 const csv='nome;matricula;unidade;serie;turma;tempo\nMaria da Silva;20260001;Escola Municipal Exemplo;7;7º A;Parcial\nJoão de Souza;20260002;Escola Municipal Exemplo;7;7º B;Integral\n';
 const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download='modelo-importacao-alunos.csv';link.click();URL.revokeObjectURL(url);
}
