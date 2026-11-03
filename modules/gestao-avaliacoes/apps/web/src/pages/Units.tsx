import {useEffect,useState} from 'react';
import {Building2,Edit3,X} from 'lucide-react';
import {api} from '../lib/api';
import {supabase} from '../lib/supabase';
import type {Unit} from '../lib/types';
import {Page} from '../components/Page';

type Me={role:'ADMIN'|'MANAGER'|'TEACHER'|'OPERATOR'};
type UnitDetails=Unit&{active:boolean;counts:{classes:number;students:number;assessments:number}};

export function Units(){
 const [items,setItems]=useState<Unit[]>([]);
 const [canEdit,setCanEdit]=useState(false);
 const [message,setMessage]=useState('');
 const [editing,setEditing]=useState<Unit|null>(null);
 const [details,setDetails]=useState<UnitDetails|null>(null);
 const [loadingDetails,setLoadingDetails]=useState(false);
 const [saving,setSaving]=useState(false);

 const load=async()=>{
  try{
   const [units,me,userResult]=await Promise.all([api<Unit[]>('/api/units'),api<Me>('/api/me'),supabase.auth.getUser()]);
   setItems(units);
   setCanEdit(me.role==='ADMIN'||userResult.data.user?.email?.toLowerCase()==='detic@uberabadigital.com.br');
  }catch(error){setMessage((error as Error).message)}
 };
 useEffect(()=>{void load()},[]);

 async function showDetails(unit:Unit){
  try{setLoadingDetails(true);setMessage('');setDetails(await api<UnitDetails>(`/api/units/${unit.id}`))}
  catch(error){setMessage((error as Error).message)}finally{setLoadingDetails(false)}
 }
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();const form=e.currentTarget,f=Object.fromEntries(new FormData(form));
  try{setSaving(true);await api('/api/units',{method:'POST',body:JSON.stringify(f)});form.reset();setMessage('Unidade cadastrada com sucesso.');await load()}
  catch(error){setMessage((error as Error).message)}finally{setSaving(false)}
 }
 async function update(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!editing)return;const f=Object.fromEntries(new FormData(e.currentTarget));
  try{setSaving(true);await api(`/api/units/${editing.id}`,{method:'PATCH',body:JSON.stringify(f)});setEditing(null);setMessage('Unidade atualizada com sucesso. A alteração já está disponível nos sistemas integrados.');await load()}
  catch(error){setMessage((error as Error).message)}finally{setSaving(false)}
 }

 return <Page eyebrow="Cadastros" title="Unidades educacionais" description="Cadastro único compartilhado com os demais sistemas do Portal.">
  <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
   <form className="card h-fit" onSubmit={submit}><h2 className="text-lg font-bold">Nova unidade</h2><label className="mt-4 block"><span className="label">Nome</span><input className="field" name="name" required/></label><label className="mt-4 block"><span className="label">Código</span><input className="field" name="code"/></label><button className="btn mt-5 w-full" disabled={saving}>{saving?'Salvando…':'Cadastrar unidade'}</button>{message&&<p className="mt-3 text-sm text-forest">{message}</p>}</form>
   <div className="card overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="pb-3">Unidade</th><th className="pb-3">Código</th><th className="pb-3">Situação</th>{canEdit&&<th className="pb-3 text-right">Ações</th>}</tr></thead><tbody>{items.map(unit=><tr className="border-b last:border-0" key={unit.id}><td className="py-4 font-semibold"><button type="button" className="text-left text-ink underline decoration-blue-300 underline-offset-4 transition hover:text-blue-700" onClick={()=>void showDetails(unit)}>{unit.name}</button></td><td>{unit.code||'—'}</td><td><span className="rounded-full bg-mint px-2 py-1 text-xs text-forest">Ativa</span></td>{canEdit&&<td className="text-right"><button type="button" title="Editar unidade" aria-label={`Editar ${unit.name}`} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 font-semibold text-blue-700 transition hover:bg-blue-50" onClick={()=>{setEditing(unit);setMessage('')}}><Edit3 size={16}/> Editar</button></td>}</tr>)}</tbody></table>{!items.length&&<p className="py-8 text-center text-black/45">Nenhuma unidade cadastrada.</p>}</div>
  </div>
  {loadingDetails&&<div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4"><div className="card">Carregando informações da unidade…</div></div>}
  {details&&!loadingDetails&&<div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4" role="dialog" aria-modal="true" aria-label="Informações da unidade"><section className="card w-full max-w-2xl"><div className="flex items-start gap-3"><span className="rounded-xl bg-blue-50 p-3 text-blue-700"><Building2 size={24}/></span><div><div className="eyebrow">Informações da unidade</div><h2 className="mt-1 text-xl font-bold">{details.name}</h2></div><button type="button" className="ml-auto rounded-lg p-2 hover:bg-paper" onClick={()=>setDetails(null)} aria-label="Fechar"><X size={20}/></button></div><dl className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-paper p-4"><dt className="text-xs font-bold uppercase text-black/45">Código</dt><dd className="mt-1 font-semibold">{details.code||'Não informado'}</dd></div><div className="rounded-xl bg-paper p-4"><dt className="text-xs font-bold uppercase text-black/45">Situação</dt><dd className="mt-1 font-semibold text-forest">{details.active?'Ativa':'Inativa'}</dd></div></dl><div className="mt-4 grid grid-cols-3 gap-3 text-center"><div className="rounded-xl border p-4"><strong className="text-2xl">{details.counts.classes}</strong><span className="mt-1 block text-sm text-black/50">Turmas</span></div><div className="rounded-xl border p-4"><strong className="text-2xl">{details.counts.students}</strong><span className="mt-1 block text-sm text-black/50">Alunos</span></div><div className="rounded-xl border p-4"><strong className="text-2xl">{details.counts.assessments}</strong><span className="mt-1 block text-sm text-black/50">Avaliações</span></div></div><div className="mt-6 flex justify-end gap-3">{canEdit&&<button type="button" className="btn inline-flex items-center gap-2" onClick={()=>{setDetails(null);setEditing(details)}}><Edit3 size={16}/> Editar unidade</button>}<button type="button" className="rounded-xl border px-4 py-2.5 font-semibold" onClick={()=>setDetails(null)}>Fechar</button></div></section></div>}
  {editing&&<div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4" role="dialog" aria-modal="true" aria-label="Editar unidade"><form onSubmit={update} className="card w-full max-w-lg"><div className="flex items-center"><div><div className="eyebrow">Cadastro compartilhado</div><h2 className="mt-1 text-xl font-bold">Editar unidade</h2></div><button type="button" className="ml-auto rounded-lg p-2 hover:bg-paper" onClick={()=>setEditing(null)} aria-label="Fechar"><X size={20}/></button></div><label className="mt-5 block"><span className="label">Nome</span><input className="field" name="name" defaultValue={editing.name} required autoFocus/></label><label className="mt-4 block"><span className="label">Código</span><input className="field" name="code" defaultValue={editing.code||''}/></label><div className="mt-6 flex justify-end gap-3"><button type="button" className="rounded-xl border px-4 py-2.5 font-semibold" onClick={()=>setEditing(null)}>Cancelar</button><button className="btn" disabled={saving}>{saving?'Salvando…':'Salvar alterações'}</button></div></form></div>}
 </Page>;
}
