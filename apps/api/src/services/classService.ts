import {db} from '../db.js';

export type ClassImportRow={unit:string;grade:number;name:string;schoolYear:number;timeMode:'PARTIAL'|'FULL'};

const canonical=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/\bprof(?:essor|essora)?a?\b/g,'').replace(/\b(?:de|da|do|das|dos)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const rowKey=(row:ClassImportRow)=>`${canonical(row.unit)}|${row.grade}|${canonical(row.name)}|${row.schoolYear}|${row.timeMode}`;

export async function importClasses(rows:ClassImportRow[],organizationId:string){
 const unique=[...new Map(rows.map(row=>[rowKey(row),row])).values()];
 let units=await db.educationalUnit.findMany({where:{organizationId}}),unitByName=new Map(units.map(unit=>[canonical(unit.name),unit]));
 const missing=[...new Map(unique.filter(row=>!unitByName.has(canonical(row.unit))).map(row=>[canonical(row.unit),row.unit.trim()])).values()];
 const unitsCreated=(await db.educationalUnit.createMany({data:missing.map(name=>({organizationId,name})),skipDuplicates:true})).count;
 if(missing.length){units=await db.educationalUnit.findMany({where:{organizationId}});unitByName=new Map(units.map(unit=>[canonical(unit.name),unit]))}
 const data=unique.map(row=>({unitId:unitByName.get(canonical(row.unit))!.id,grade:row.grade,name:row.name.trim(),schoolYear:row.schoolYear,timeMode:row.timeMode}));
 let created=0;
 await db.$transaction(async tx=>{for(let offset=0;offset<data.length;offset+=1_000)created+=(await tx.schoolClass.createMany({data:data.slice(offset,offset+1_000),skipDuplicates:true})).count},{maxWait:10_000,timeout:120_000});
 return{sourceRows:rows.length,total:unique.length,created,existing:unique.length-created,unitsCreated};
}
