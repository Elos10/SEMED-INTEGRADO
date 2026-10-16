import {db} from '../db.js';

export type StudentImportRow={name:string;registration?:string;unit:string;grade:number;className:string;timeMode:'PARTIAL'|'FULL'};

const canonicalText=(value:string)=>value
 .normalize('NFD')
 .replace(/[\u0300-\u036f]/g,'')
 .toLocaleLowerCase('pt-BR')
 .replace(/[ºª°]/g,'')
 .replace(/[^a-z0-9]+/g,' ')
 .trim()
 .replace(/\s+/g,' ');

export const canonicalUnitName=(value:string)=>canonicalText(value)
 .replace(/^(?:e m|em|esc mun|escola municipal)\s+/,'')
 .replace(/\b(?:de|da|do|das|dos)\b/g,' ')
 .replace(/\s+/g,' ')
 .trim();

const canonicalClassName=(value:string)=>canonicalText(value);
const classKey=(unitId:string,grade:number,name:string,timeMode:string)=>`${unitId}|${grade}|${canonicalClassName(name)}|${timeMode}`;

export async function importStudents(rows:StudentImportRow[],organizationId:string){
 let units=await db.educationalUnit.findMany({where:{organizationId}});
 const aliases=new Map<string,typeof units>();
 const indexUnits=()=>{
  aliases.clear();
  for(const unit of units){
   for(const alias of [canonicalUnitName(unit.name),unit.code?canonicalText(unit.code):''].filter(Boolean)){
    const matches=aliases.get(alias)??[];
    if(!matches.some(item=>item.id===unit.id))aliases.set(alias,[...matches,unit]);
   }
  }
 };
 indexUnits();

 const requestedUnits=[...new Map(rows.map(row=>[canonicalUnitName(row.unit),row.unit.trim()])).entries()];
 const missingUnits=requestedUnits.filter(([alias])=>!aliases.has(alias)).map(([,name])=>name);
 const unitsCreated=(await db.educationalUnit.createMany({data:missingUnits.map(name=>({organizationId,name})),skipDuplicates:true})).count;
 if(missingUnits.length){units=await db.educationalUnit.findMany({where:{organizationId}});indexUnits()}

 const errors:string[]=[];
 const resolvedRows=rows.map((row,index)=>{
  const matches=aliases.get(canonicalUnitName(row.unit))??[];
  if(matches.length!==1){
   errors.push(matches.length?`Linha ${index+2}: a unidade “${row.unit}” corresponde a mais de um cadastro. Unifique os nomes das unidades antes de importar.`:`Linha ${index+2}: unidade “${row.unit}” não encontrada.`);
   return null;
  }
  return{row,unit:matches[0]};
 });
 if(errors.length)throw new Error(errors.slice(0,10).join(' '));

 let classes=await db.schoolClass.findMany({where:{unit:{organizationId}},orderBy:{schoolYear:'desc'}});
 let classByIdentity=new Map(classes.map(schoolClass=>[classKey(schoolClass.unitId,schoolClass.grade,schoolClass.name,schoolClass.timeMode),schoolClass]));
 const missingClasses=[...new Map(resolvedRows.map(item=>{
  const {row,unit}=item!;
  return[classKey(unit.id,row.grade,row.className,row.timeMode),{unitId:unit.id,grade:row.grade,name:row.className.trim(),schoolYear:new Date().getFullYear(),timeMode:row.timeMode}];
 }).filter(([key])=>!classByIdentity.has(key as string)) as Array<[string,{unitId:string;grade:number;name:string;schoolYear:number;timeMode:StudentImportRow['timeMode']}]>).values()];
 const classesCreated=(await db.schoolClass.createMany({data:missingClasses,skipDuplicates:true})).count;
 if(missingClasses.length){classes=await db.schoolClass.findMany({where:{unit:{organizationId}},orderBy:{schoolYear:'desc'}});classByIdentity=new Map(classes.map(schoolClass=>[classKey(schoolClass.unitId,schoolClass.grade,schoolClass.name,schoolClass.timeMode),schoolClass]))}

 const data=resolvedRows.map(item=>{
  const {row,unit}=item!,schoolClass=classByIdentity.get(classKey(unit.id,row.grade,row.className,row.timeMode));
  if(!schoolClass)throw new Error(`Não foi possível preparar a turma “${row.className}” da unidade “${row.unit}”.`);
  return{classId:schoolClass.id,name:row.name.trim(),registration:row.registration?.trim()||null};
 });
 await db.$transaction(Array.from({length:Math.ceil(data.length/1_000)},(_,index)=>db.student.createMany({data:data.slice(index*1_000,(index+1)*1_000)})));
 return {imported:data.length,unitsCreated,classesCreated};
}
