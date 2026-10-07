export type ClassImportRow={unit:string;grade:number;name:string;schoolYear:number;timeMode:'PARTIAL'|'FULL'};
export type ParsedClassImport={rows:ClassImportRow[];sourceRows:number;duplicates:number};

const MAX_ROWS=30_000,required=['unidade','serie','turma','ano letivo','tempo'];
const clean=(value:string)=>value.trim().replace(/^"|"$/g,'').replace(/""/g,'"');
const headerKey=(value:string)=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ');

export function decodeClassImport(buffer:ArrayBuffer){try{return new TextDecoder('utf-8',{fatal:true}).decode(buffer)}catch{return new TextDecoder('windows-1252').decode(buffer)}}

export function parseClassCsv(text:string):ParsedClassImport{
 const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(line=>line.trim());
 if(lines.length<2)throw new Error('O arquivo não possui turmas para importar.');
 if(lines.length-1>MAX_ROWS)throw new Error(`O arquivo excede o limite de ${MAX_ROWS.toLocaleString('pt-BR')} linhas.`);
 const delimiter=(lines[0].match(/;/g)?.length??0)>=(lines[0].match(/,/g)?.length??0)?';':',';
 const split=(line:string)=>line.split(new RegExp(`${delimiter}(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)`)).map(clean);
 const headers=split(lines[0]).map(headerKey);
 if(required.some(name=>!headers.includes(name)))throw new Error(`Cabeçalho inválido. Use: ${required.join(';')}`);
 const unique=new Map<string,ClassImportRow>();
 for(const [index,line] of lines.slice(1).entries()){
  const values=split(line),value=(name:string)=>values[headers.indexOf(name)]?.trim()??'',grade=Number(value('serie').match(/\d+/)?.[0]),schoolYear=Number(value('ano letivo')),time=headerKey(value('tempo'));
  if(!value('unidade')||!grade||grade<1||grade>9||!value('turma')||!Number.isInteger(schoolYear)||schoolYear<2020||schoolYear>2100||!['parcial','integral'].includes(time))throw new Error(`Linha ${index+2} inválida. Confira unidade, série, turma, ano letivo e tempo.`);
  const row:ClassImportRow={unit:value('unidade'),grade,name:value('turma'),schoolYear,timeMode:time==='integral'?'FULL':'PARTIAL'};
  unique.set(`${headerKey(row.unit)}|${row.grade}|${headerKey(row.name)}|${row.schoolYear}|${row.timeMode}`,row);
 }
 return{rows:[...unique.values()],sourceRows:lines.length-1,duplicates:lines.length-1-unique.size};
}

export function downloadClassTemplate(){
 const csv='UNIDADE;SERIE;TURMA;ANO LETIVO;TEMPO\nEM ARTHUR DE MELLO TEIXEIRA;1º ANO;A;2026;PARCIAL\nEM ARTHUR DE MELLO TEIXEIRA;1º ANO;B;2026;INTEGRAL\n';
 const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='modelo-importacao-turmas.csv';link.click();URL.revokeObjectURL(url);
}
