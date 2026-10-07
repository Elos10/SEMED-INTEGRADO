import {useEffect,useMemo,useState} from 'react';
import {useNavigate,useParams} from 'react-router-dom';
import {api} from '../lib/api';
import type {Answer,Processing} from '../lib/types';
import {Page} from '../components/Page';
import {allowedChoices} from '@omr/core/rules';

type Grade={id?:string;correct:number;wrong:number;blank:number;invalid:number;total:number;percentage:number;score:number};

export function Review(){
 const {id}=useParams(),nav=useNavigate();
 const [p,setP]=useState<Processing>(),[answers,setAnswers]=useState<Answer[]>([]),[message,setMessage]=useState(''),[result,setResult]=useState<Grade>(),[finalizing,setFinalizing]=useState(false);
 useEffect(()=>{api<Processing>(`/api/processings/${id}/review`).then(x=>{setP(x);setAnswers(x.answers??[]);if(x.result)setResult(x.result)}).catch(e=>setMessage(e.message))},[id]);
 const preview=useMemo<Grade>(()=>{const key=new Map(p?.sheet?.assessment.key?.map(x=>[x.question,x.choice])??[]);let correct=0,blank=0,invalid=0;for(const answer of answers){if(!answer.finalChoice){if(answer.status==='MULTIPLE'||answer.status==='REVIEW')invalid++;else blank++;}else if(answer.finalChoice===key.get(answer.question))correct++;}const total=answers.length,wrong=total-correct-blank-invalid;return{correct,wrong,blank,invalid,total,percentage:total?Number((correct/total*100).toFixed(2)):0,score:correct}},[answers,p]);
 const payload={answers:answers.map(a=>({question:a.question,choice:a.finalChoice??null,status:a.status}))};
 async function save(){try{await api(`/api/processings/${id}/review`,{method:'PATCH',body:JSON.stringify(payload)});setMessage('Revisão salva. Os valores foram atualizados.')}catch(e){setMessage((e as Error).message)}}
 async function finalize(){if(finalizing)return;setFinalizing(true);try{await api(`/api/processings/${id}/review`,{method:'PATCH',body:JSON.stringify(payload)});await api<Grade>(`/api/processings/${id}/finalize`,{method:'POST'});nav('/leitura',{replace:true})}catch(e){setMessage((e as Error).message);setFinalizing(false)}}
 if(!p)return <p>{message||'Carregando…'}</p>;
 const choices=allowedChoices(p.sheet?.assessment.grade??1);
 const grade=result??preview;
 return <Page eyebrow="Conferência manual" title={p.sheet?.student?.name??'Gabarito processado'} description={`Avaliação ${p.sheet?.assessment.number} • alinhamento ${Math.round((p.quality?.alignment??0)*100)}%`}>
  <section className="mb-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">{[[grade.correct,'Acertos'],[grade.wrong,'Erros'],[grade.blank,'Brancos'],[grade.invalid,'Inválidas'],[`${grade.percentage.toLocaleString('pt-BR')}%`,'Aproveitamento'],[grade.score,'Nota']].map(([value,label])=><div className={`card !p-4 ${label==='Nota'?'bg-forest text-white':''}`} key={label}><strong className="text-2xl">{value}</strong><span className={`block text-xs ${label==='Nota'?'text-white/70':'text-black/50'}`}>{label}</span></div>)}</section>
  {result&&<div className="mb-5 flex items-center justify-between rounded-2xl bg-mint p-4 text-forest"><strong>Resultado final armazenado no banco.</strong><button className="btn" onClick={()=>nav(`/resultados?destaque=${result.id}`)}>Ver resultados</button></div>}
  <div><div className="card mb-5 text-sm text-black/55">Por privacidade, o arquivo original e as imagens intermediárias foram descartados após a leitura. Para reler este gabarito, envie novamente o arquivo correspondente.</div><div className="mb-4 flex gap-3"><button className="btn" onClick={save}>Salvar revisão</button><button disabled={finalizing} className="rounded-xl border border-forest px-4 py-2.5 font-semibold text-forest disabled:opacity-50" onClick={()=>result?nav('/leitura'):void finalize()}>{finalizing?'Finalizando…':result?'Correção finalizada':'Finalizar correção'}</button></div><div className="grid gap-3 xl:grid-cols-2">{answers.map((a,i)=><div className={`card !p-4 ${a.status==='MARKED'&&Number(a.confidence)>=.9?'':'border-amber'}`} key={a.question}><div className="flex flex-wrap items-center gap-3"><strong className="w-10">{String(a.question).padStart(2,'0')}</strong><div className="flex gap-1">{choices.map(c=><button onClick={()=>setAnswers(xs=>xs.map((x,j)=>j===i?{...x,finalChoice:c,status:'MARKED'}:x))} className={`h-9 w-9 rounded-full border font-bold ${a.finalChoice===c?'border-forest bg-forest text-white':'bg-white'}`} key={c}>{c}</button>)}</div><button className="text-sm text-black/45" onClick={()=>setAnswers(xs=>xs.map((x,j)=>j===i?{...x,finalChoice:undefined,status:'BLANK'}:x))}>Em branco</button><span className="ml-auto text-sm">Confiança: <strong>{Math.round(Number(a.confidence)*100)}%</strong></span></div><div className="mt-2 text-xs text-black/45">Detectado: {a.detectedChoice??'—'} • {a.status} • {a.fills?.map(f=>`${f.choice} ${Math.round(f.fill*100)}%`).join(' · ')}</div></div>)}</div>{message&&<p className="mt-4">{message}</p>}</div>
 </Page>;
}
