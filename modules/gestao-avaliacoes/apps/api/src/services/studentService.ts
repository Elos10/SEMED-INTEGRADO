import {db} from '../db.js';

export type StudentImportRow={name:string;registration?:string;unit:string;grade:number;className:string;timeMode:'PARTIAL'|'FULL'};

const normalize=(value:string)=>value.trim().toLocaleLowerCase('pt-BR');

export async function importStudents(rows:StudentImportRow[],organizationId:string){
 const [units,classes]=await Promise.all([
  db.educationalUnit.findMany({where:{organizationId}}),
  db.schoolClass.findMany({where:{unit:{organizationId}},orderBy:{schoolYear:'desc'}})
 ]);
 const unitByNameOrCode=new Map<string,(typeof units)[number]>();
 for(const unit of units){unitByNameOrCode.set(normalize(unit.name),unit);if(unit.code)unitByNameOrCode.set(normalize(unit.code),unit)}
 const classByIdentity=new Map(classes.map(schoolClass=>[`${schoolClass.unitId}|${schoolClass.grade}|${normalize(schoolClass.name)}|${schoolClass.timeMode}`,schoolClass]));
 const errors:string[]=[];
 const data=rows.map((row,index)=>{
  const unit=unitByNameOrCode.get(normalize(row.unit));
  if(!unit){errors.push(`Linha ${index+2}: unidade “${row.unit}” não encontrada.`);return null}
  const schoolClass=classByIdentity.get(`${unit.id}|${row.grade}|${normalize(row.className)}|${row.timeMode}`);
  if(!schoolClass){errors.push(`Linha ${index+2}: turma “${row.className}” não corresponde à unidade, série e tempo informados.`);return null}
  return {classId:schoolClass.id,name:row.name.trim(),registration:row.registration?.trim()||null};
 });
 if(errors.length)throw new Error(errors.slice(0,10).join(' '));
 const valid=data.filter((x):x is NonNullable<typeof x>=>Boolean(x));
 await db.$transaction(Array.from({length:Math.ceil(valid.length/1_000)},(_,index)=>db.student.createMany({data:valid.slice(index*1_000,(index+1)*1_000)})));
 return {imported:data.length};
}
