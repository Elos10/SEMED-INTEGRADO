import {useEffect,useMemo,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {Edit3,ExternalLink,Trash2,X} from 'lucide-react';
import {allowedSubjects,questionCountFor,type Subject} from '@omr/core/rules';
import {api} from '../lib/api';
import type {Assessment,SchoolClass,Unit} from '../lib/types';
import {subjectLabel} from '../lib/types';
import {Page} from '../components/Page';

const NETWORK='NETWORK',today=new Date().toISOString().slice(0,10);
type Me={role:'ADMIN'|'MANAGER'|'TEACHER'|'OPERATOR'};

export function NewAssessment(){
 const nav=useNavigate();
 const [classes,setClasses]=useState<SchoolClass[]>([]),[units,setUnits]=useState<Unit[]>([]),[items,setItems]=useState<Assessment[]>([]),[role,setRole]=useState('');
 const [unitId,setUnitId]=useState(NETWORK),[grade,setGrade]=useState(7),[subject,setSubject]=useState<Subject>('MATHEMATICS'),[classId,setClassId]=useState('');
 const [year,setYear]=useState(new Date().getFullYear()),[number,setNumber]=useState<'Inicial'|'Intermediária'|'Final'>('Inicial'),[date,setDate]=useState(today),[timeMode,setTimeMode]=useState<'ALL'|'PARTIAL'|'FULL'>('ALL');
 const [editingId,setEditingId]=useState<string>(),[message,setMessage]=useState(''),[saving,setSaving]=useState(false);
 const networkWide=unitId===NETWORK,subjects=allowedSubjects(grade),safeSubject=subjects.includes(subject)?subject:subjects[0],count=useMemo(()=>questionCountFor(grade,safeSubject),[grade,safeSubject]);
 const availableClasses=networkWide?[]:classes.filter(x=>x.unitId===unitId&&x.grade===grade);

 const load=()=>Promise.all([api<SchoolClass[]>('/api/classes'),api<Unit[]>('/api/units'),api<Assessment[]>('/api/assessments'),api<Me>('/api/me')]).then(([c,u,a,me])=>{setClasses(c);setUnits(u);setItems(a);setRole(me.role)}).catch(e=>setMessage(e.message));
 useEffect(()=>{void load()},[]);
 function reset(){setEditingId(undefined);setUnitId(NETWORK);setGrade(7);setSubject('MATHEMATICS');setClassId('');setYear(new Date().getFullYear());setNumber('Inicial');setDate(today);setTimeMode('ALL');setMessage('')}
 function edit(item:Assessment){setEditingId(item.id);setUnitId(item.schoolClass?item.unit.id:NETWORK);setGrade(item.grade);setSubject(item.subject);setClassId(item.schoolClass?.id??'');setYear(item.year);setNumber(['Inicial','Intermediária','Final'].includes(item.number)?item.number as typeof number:'Inicial');setDate(item.assessmentDate.slice(0,10));setTimeMode(item.timeMode);scrollTo({top:0,behavior:'smooth'})}
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();try{setSaving(true);setMessage('');const body={scope:networkWide?'NETWORK':'CLASS',unitId:networkWide?undefined:unitId,classId:networkWide?null:classId,number,grade,year,subject:safeSubject,timeMode,assessmentDate:date};if(editingId){await api(`/api/assessments/${editingId}`,{method:'PATCH',body:JSON.stringify(body)});reset();setMessage('Avaliação atualizada com sucesso.');await load()}else{const created=await api<Assessment>('/api/assessments',{method:'POST',body:JSON.stringify(body)});nav(`/avaliacoes/${created.id}`,{replace:true,state:{created:true}})}}catch(error){setMessage((error as Error).message)}finally{setSaving(false)}}
 async function remove(item:Assessment){const hasSheets=(item._count?.sheets??0)>0,message=hasSheets?'Avaliação já possui folhas geradas! Deseja mesmo excluir?':`Deseja excluir a avaliação ${item.number}?`;if(!confirm(message))return;try{await api(`/api/assessments/${item.id}${hasSheets?'?force=true':''}`,{method:'DELETE'});setMessage('Avaliação e todos os dados relacionados foram excluídos.');await load()}catch(e){setMessage((e as Error).message)}}

 return <Page eyebrow="Avaliações" title={editingId?'Editar avaliação':'Nova avaliação'} description="Crie uma avaliação para uma turma específica ou para toda a rede municipal.">
  <form className="card grid w-full gap-5 md:grid-cols-2 xl:grid-cols-4" onSubmit={submit}>
   <label className="xl:col-span-2"><span className="label">Unidade</span><select className="field" value={unitId} onChange={e=>{setUnitId(e.target.value);setClassId('')}} required><option value={NETWORK}>Secretaria Municipal de Educação — toda a rede</option>{units.filter(x=>x.code!=='REDE').map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
   <label><span className="label">Série</span><select className="field" value={grade} onChange={e=>{const g=Number(e.target.value);setGrade(g);setSubject(g===1?'SINGLE':'MATHEMATICS');setClassId('')}}>{Array.from({length:9},(_,i)=><option value={i+1} key={i}>{i+1}º ano</option>)}</select></label>
   <label><span className="label">Disciplina</span><select className="field" value={safeSubject} onChange={e=>setSubject(e.target.value as Subject)}>{subjects.map(x=><option value={x} key={x}>{subjectLabel(x)}</option>)}</select></label>
   <label className="xl:col-span-2"><span className="label">Turma</span><select className="field disabled:cursor-not-allowed disabled:bg-black/5 disabled:text-black/40" value={classId} onChange={e=>setClassId(e.target.value)} required={!networkWide} disabled={networkWide}><option value="">{networkWide?'Todas as turmas da série':'Selecione'}</option>{availableClasses.map(x=><option value={x.id} key={x.id}>{x.name} — {x.schoolYear}</option>)}</select>{networkWide&&<small className="mt-1 block text-black/45">Aplicação em todas as turmas compatíveis da rede.</small>}</label>
   <label><span className="label">Avaliação</span><select className="field font-semibold" value={number} onChange={event=>setNumber(event.target.value as typeof number)} required><option value="Inicial">Inicial</option><option value="Intermediária">Intermediária</option><option value="Final">Final</option></select></label>
   <label><span className="label">Ano da avaliação</span><input className="field" type="number" value={year} onChange={e=>setYear(Number(e.target.value))} min="2020" max="2100" required/></label>
   <label><span className="label">Data</span><input className="field" type="date" value={date} onChange={e=>setDate(e.target.value)} required/></label>
   <label><span className="label">Tempo</span><select className="field" value={timeMode} onChange={e=>setTimeMode(e.target.value as typeof timeMode)}><option value="ALL">Todos — parcial e integral</option><option value="PARTIAL">Parcial</option><option value="FULL">Integral</option></select></label>
   <div className="rounded-xl bg-mint p-4 md:col-span-2"><div className="text-sm text-forest">Quantidade definida pela regra central</div><div className="text-3xl font-bold">{count} questões</div><div className="mt-1 text-sm text-black/50">Abrangência: {networkWide?'toda a rede municipal':'turma selecionada'}</div></div>
   <div className="flex gap-3 md:col-span-2"><button className="btn flex-1 disabled:cursor-wait" disabled={saving}>{saving?'Salvando…':editingId?'Salvar alterações':'Salvar e configurar gabarito'}</button>{editingId&&<button type="button" className="inline-flex items-center gap-2 rounded-xl border px-4 font-semibold" onClick={reset}><X size={18}/> Cancelar</button>}</div>
   {message&&<p className="md:col-span-2 xl:col-span-4 text-sm text-red-700">{message}</p>}
  </form>
  <section className="card mt-7"><div className="mb-4"><div className="eyebrow">Histórico</div><h2 className="mt-1 text-2xl font-bold">Avaliações já criadas</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b text-black/45"><th className="pb-3">Avaliação</th><th>Ano/Data</th><th>Unidade</th><th>Série</th><th>Disciplina</th><th>Turma</th><th>Tempo</th><th className="text-right">Ações</th></tr></thead><tbody>{items.map(item=><tr className="border-b last:border-0" key={item.id}><td className="py-4 font-bold">{item.number}</td><td>{item.year}<small className="block text-black/45">{new Date(`${item.assessmentDate.slice(0,10)}T12:00:00`).toLocaleDateString('pt-BR')}</small></td><td>{item.unit.name}</td><td>{item.grade}º ano</td><td>{subjectLabel(item.subject)}</td><td>{item.schoolClass?.name??'Toda a rede'}</td><td>{item.timeMode==='ALL'?'Todos':item.timeMode==='FULL'?'Integral':'Parcial'}</td><td><div className="flex justify-end gap-2"><Link className="rounded-lg p-2 text-forest hover:bg-mint" title="Abrir" to={`/avaliacoes/${item.id}`}><ExternalLink size={18}/></Link>{role==='ADMIN'&&<><button className="rounded-lg p-2 text-blue-700 hover:bg-blue-50" title="Editar" onClick={()=>edit(item)}><Edit3 size={18}/></button><button className="rounded-lg p-2 text-red-700 hover:bg-red-50" title="Excluir" onClick={()=>void remove(item)}><Trash2 size={18}/></button></>}</div></td></tr>)}</tbody></table>{!items.length&&<p className="py-8 text-center text-black/45">Nenhuma avaliação cadastrada.</p>}</div></section>
 </Page>;
}
