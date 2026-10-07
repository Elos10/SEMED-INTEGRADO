import {useEffect,useState} from 'react';
import {api} from '../lib/api';
import type {Unit} from '../lib/types';
import {Page} from '../components/Page';

export function Units(){
 const [items,setItems]=useState<Unit[]>([]),[message,setMessage]=useState('');
 const load=()=>api<Unit[]>('/api/units').then(setItems).catch(e=>setMessage(e.message));
 useEffect(()=>{void load()},[]);
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget,f=Object.fromEntries(new FormData(form));try{await api('/api/units',{method:'POST',body:JSON.stringify(f)});form.reset();setMessage('Unidade cadastrada com sucesso.');await load()}catch(e){setMessage((e as Error).message)}}
 return <Page eyebrow="Cadastros" title="Unidades educacionais" description="Escolas e polos pertencentes à sua organização."><div className="grid gap-5 xl:grid-cols-[360px_1fr]"><form className="card h-fit" onSubmit={submit}><h2 className="text-lg font-bold">Nova unidade</h2><label className="mt-4 block"><span className="label">Nome</span><input className="field" name="name" required/></label><label className="mt-4 block"><span className="label">Código</span><input className="field" name="code"/></label><button className="btn mt-5 w-full">Cadastrar unidade</button>{message&&<p className="mt-3 text-sm text-red-700">{message}</p>}</form><div className="card overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="pb-3">Unidade</th><th className="pb-3">Código</th><th className="pb-3">Situação</th></tr></thead><tbody>{items.map(x=><tr className="border-b last:border-0" key={x.id}><td className="py-4 font-semibold">{x.name}</td><td>{x.code||'—'}</td><td><span className="rounded-full bg-mint px-2 py-1 text-xs text-forest">Ativa</span></td></tr>)}</tbody></table>{!items.length&&<p className="py-8 text-center text-black/45">Nenhuma unidade cadastrada.</p>}</div></div></Page>;
}
