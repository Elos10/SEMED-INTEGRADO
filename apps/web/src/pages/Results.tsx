import {Check,ChevronDown,ChevronRight,X} from 'lucide-react';
import {Fragment,useEffect,useMemo,useState} from 'react';
import {Page} from '../components/Page';
import {api} from '../lib/api';
import {subjectLabel,type Result,type ResultAnswerSheet} from '../lib/types';

type ResultGroup={id:string;unit:string;subject:string;assessment:string;grade:number;className:string;items:Result[]};

export function Results(){
 const [items,setItems]=useState<Result[]>([]),[query,setQuery]=useState(''),[expanded,setExpanded]=useState<Set<string>>(new Set()),[preview,setPreview]=useState<ResultAnswerSheet>(),[loadingId,setLoadingId]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>{api<Result[]>('/api/results').then(setItems)},[]);
 const groups=useMemo(()=>{
  const grouped=new Map<string,ResultGroup>();
  for(const item of items){
   const assessment=item.sheet.assessment,studentClass=item.sheet.student?.schoolClass;
   const unit=studentClass?.unit?.name??assessment.unit.name;
   const className=studentClass?.name??assessment.schoolClass?.name??'Toda a rede';
   const id=[assessment.id,studentClass?.unitId??assessment.unit.id,studentClass?.id??assessment.schoolClass?.id??'rede'].join(':');
   const current=grouped.get(id);
   if(current)current.items.push(item);
   else grouped.set(id,{id,unit,subject:subjectLabel(assessment.subject),assessment:assessment.number,grade:assessment.grade,className,items:[item]});
  }
  const search=query.trim().toLocaleLowerCase('pt-BR');
  return [...grouped.values()].filter(group=>!search||[group.unit,group.subject,group.assessment,group.className,...group.items.map(item=>item.sheet.student?.name??'')].some(value=>value.toLocaleLowerCase('pt-BR').includes(search)));
 },[items,query]);
 function toggle(id:string){setExpanded(current=>{const next=new Set(current);next.has(id)?next.delete(id):next.add(id);return next})}
 async function viewSheet(result:Result){try{setLoadingId(result.id);setMessage('');setPreview(await api<ResultAnswerSheet>(`/api/results/${result.id}/answer-sheet`))}catch(error){setMessage((error as Error).message)}finally{setLoadingId('')}}
 return <Page eyebrow="Correção" title="Resultados" description="Resultados consolidados por unidade, avaliação e turma. Clique em uma linha para consultar os alunos.">
  <div className="card">
   <input className="field mb-5" placeholder="Buscar unidade, avaliação, turma ou aluno…" value={query} onChange={event=>setQuery(event.target.value)}/>
   <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm">
    <thead><tr className="border-b"><th className="w-9 pb-3"></th><th>Unidade</th><th>Disciplina</th><th>Avaliação</th><th>Série</th><th>Turma</th><th className="text-center">Quantidade de gabaritos lidos</th></tr></thead>
    <tbody>{groups.map(group=>{const open=expanded.has(group.id);return <Fragment key={group.id}>
     <tr className="cursor-pointer border-b hover:bg-mint/30" onClick={()=>toggle(group.id)}>
      <td className="py-4">{open?<ChevronDown size={17}/>:<ChevronRight size={17}/>}</td>
      <td className="font-semibold">{group.unit}</td><td>{group.subject}</td><td>{group.assessment}</td><td>{group.grade}º ano</td><td>{group.className}</td><td className="text-center text-lg font-bold text-forest">{group.items.length}</td>
     </tr>
     {open&&<tr className="border-b bg-paper/60"><td colSpan={7} className="p-4"><div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full min-w-[720px] text-left text-sm">
      <thead><tr className="border-b bg-mint/40"><th className="p-3">Aluno</th><th>Acertos</th><th>Brancos</th><th>Inválidas</th><th>Nota</th><th>% de Acertos</th></tr></thead>
      <tbody>{group.items.map(item=><tr className="border-b last:border-0" key={item.id}><td className="p-3 font-semibold"><button className="text-left text-forest underline decoration-forest/30 underline-offset-4 hover:decoration-forest disabled:opacity-50" disabled={loadingId===item.id} onClick={()=>void viewSheet(item)}>{loadingId===item.id?'Carregando…':item.sheet.student?.name??'—'}</button></td><td>{item.correct}</td><td>{item.blank}</td><td>{item.invalid}</td><td><strong className="text-lg text-forest">{Number(item.score).toLocaleString('pt-BR')}</strong></td><td>{Number(item.percentage).toLocaleString('pt-BR',{maximumFractionDigits:2})}%</td></tr>)}</tbody>
     </table></div></td></tr>}
    </Fragment>})}</tbody>
   </table>{!groups.length&&<p className="py-8 text-center text-black/45">Nenhum resultado encontrado.</p>}</div>
  </div>{message&&<p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>}
  {preview&&<AnswerSheetPreview data={preview} onClose={()=>setPreview(undefined)}/>} 
 </Page>;
}

function AnswerSheetPreview({data,onClose}:{data:ResultAnswerSheet;onClose:()=>void}){
 const assessment=data.sheet.assessment,student=data.sheet.student,key=new Map(assessment.key?.map(answer=>[answer.question,answer.choice])??[]),choices=assessment.grade===1?['A','B','C','D','E']:['A','B','C','D'];
 const midpoint=Math.ceil(data.answers.length/2),columns=[data.answers.slice(0,midpoint),data.answers.slice(midpoint)].filter(column=>column.length);
 return <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Visualização do gabarito preenchido" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
  <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
   <header className="flex shrink-0 items-start justify-between gap-4 border-b bg-paper px-5 py-4 sm:px-7"><div><div className="eyebrow">Gabarito preenchido · somente visualização</div><h2 className="mt-1 text-xl font-bold sm:text-2xl">{student?.name??'Aluno não identificado'}</h2><p className="mt-1 text-sm text-black/55">{assessment.number} · {subjectLabel(assessment.subject)} · {assessment.grade}º ano · {student?.schoolClass?.name??assessment.schoolClass?.name??'Toda a rede'}</p></div><button className="rounded-full p-2 hover:bg-black/10" onClick={onClose} aria-label="Fechar visualização"><X/></button></header>
   <div className="overflow-y-auto p-4 sm:p-6">
    <div className="mb-4 grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-6"><Summary label="Acertos" value={data.result.correct}/><Summary label="Erros" value={data.result.wrong}/><Summary label="Brancos" value={data.result.blank}/><Summary label="Inválidas" value={data.result.invalid}/><Summary label="Nota" value={Number(data.result.score).toLocaleString('pt-BR')}/><Summary label="Aproveitamento" value={`${Number(data.result.percentage).toLocaleString('pt-BR',{maximumFractionDigits:2})}%`}/></div>
    <div className="grid gap-4 lg:grid-cols-2">{columns.map((column,columnIndex)=><div className="overflow-hidden rounded-xl border" key={columnIndex}><div className="grid grid-cols-[58px_1fr_86px] items-center bg-mint/50 px-3 py-2 text-xs font-bold uppercase tracking-wide"><span>Questão</span><span className="text-center">Marcações</span><span className="text-center">Situação</span></div>{column.map(answer=>{const official=key.get(answer.question),marked=new Set(answer.markedChoices),isBlank=answer.status==='BLANK',isMultiple=answer.status==='MULTIPLE',correct=answer.finalChoice===official;return <div className="grid min-h-11 grid-cols-[58px_1fr_86px] items-center border-t px-3 py-1.5" key={answer.question}><strong>{String(answer.question).padStart(2,'0')}</strong><div className="flex justify-center gap-2">{choices.map(choice=>{const selected=marked.has(choice),officialChoice=official===choice;return <span title={officialChoice?'Resposta oficial':''} className={`relative grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-bold ${selected?(correct?'border-forest bg-forest text-white':'border-red-600 bg-red-600 text-white'):officialChoice?'border-forest text-forest ring-2 ring-mint':'border-black/25 text-black/55'}`} key={choice}>{selected&&correct?<Check size={15}/>:choice}</span>})}</div><span className={`text-center text-xs font-bold ${isBlank?'text-black/45':isMultiple?'text-amber-700':correct?'text-forest':'text-red-700'}`}>{isBlank?'Em branco':isMultiple?'Múltipla':correct?'Acerto':'Erro'}</span></div>})}</div>)}</div>
    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-black/60"><Legend className="bg-forest" text="Marcação correta"/><Legend className="bg-red-600" text="Marcação incorreta"/><Legend className="border-2 border-forest bg-white" text="Resposta oficial"/></div>
   </div>
  </div>
 </div>
}

function Summary({label,value}:{label:string;value:string|number}){return <div className="rounded-xl bg-paper px-2 py-3"><strong className="block text-lg text-forest">{value}</strong><span className="text-xs text-black/55">{label}</span></div>}
function Legend({className,text}:{className:string;text:string}){return <span className="inline-flex items-center gap-2"><i className={`h-4 w-4 rounded-full ${className}`}/>{text}</span>}
