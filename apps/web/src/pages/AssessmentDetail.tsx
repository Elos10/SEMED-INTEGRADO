import {useEffect,useState} from 'react';
import {useLocation,useParams} from 'react-router-dom';
import {CheckCircle2,Download,Printer,Users} from 'lucide-react';
import {api,download} from '../lib/api';
import type {Assessment} from '../lib/types';
import {subjectLabel} from '../lib/types';
import {Page} from '../components/Page';
import {allowedChoices} from '@omr/core/rules';

const timeLabels={PARTIAL:'Parcial',FULL:'Integral',ALL:'Todos — parcial e integral'} as const;

export function AssessmentDetail(){
 const {id}=useParams();
 const location=useLocation();
 const justCreated=Boolean((location.state as {created?:boolean}|null)?.created);
 const [item,setItem]=useState<Assessment>();
 const [key,setKey]=useState<string[]>([]);
 const [message,setMessage]=useState('');
 const load=()=>api<Assessment>(`/api/assessments/${id}`).then(x=>{setItem(x);setKey(Array.from({length:x.questionCount},(_,i)=>x.key?.find(k=>k.question===i+1)?.choice??''))}).catch(e=>setMessage(e.message));

 useEffect(()=>{void load()},[id]);
 if(!item)return <p>{message||'Carregando…'}</p>;
 const choices=allowedChoices(item.grade);
 const keyComplete=key.length===item.questionCount&&key.every(Boolean);
 const keySaved=keyComplete&&key.every((choice,index)=>item.key?.find(answer=>answer.question===index+1)?.choice===choice);

 async function saveKey(){if(!keyComplete){setMessage('Selecione uma alternativa para todas as questões antes de salvar.');return}try{await api(`/api/assessments/${id}/answer-key`,{method:'PUT',body:JSON.stringify({choices:key})});await load();setMessage('Gabarito oficial salvo com sucesso. Agora você pode gerar as folhas dos alunos.')}catch(e){setMessage((e as Error).message)}}
 async function generate(){const assessment=item;if(!assessment)return;if(!keySaved){setMessage('Salve o gabarito oficial completo antes de gerar as folhas.');return}try{setMessage(assessment.schoolClass?'Gerando as folhas da turma…':'Gerando as folhas de toda a rede em ordem de unidade, série, turma e aluno…');await api(`/api/assessments/${id}/sheets`,{method:'POST',body:JSON.stringify({allStudents:true})});await load();await download(`/api/assessments/${id}/sheets/pdf`,`gabaritos-${assessment.schoolClass?'turma':'rede'}-${assessment.number}-${assessment.year}.pdf`);setMessage('PDF gerado em pares, ordenado por unidade, série, turma e aluno. O download foi iniciado.')}catch(e){setMessage((e as Error).message)}}
 const date=new Date(`${item.assessmentDate.slice(0,10)}T12:00:00`).toLocaleDateString('pt-BR');

 return <Page eyebrow={`Avaliação ${item.number}`} title={`${subjectLabel(item.subject)} — ${item.grade}º ano`} description="Confira o cadastro, configure o gabarito oficial e gere as folhas para impressão.">
  {justCreated&&<div className="mb-5 flex items-center gap-3 rounded-2xl border border-forest/20 bg-mint p-4 text-forest"><CheckCircle2/><div><strong>Avaliação criada com sucesso.</strong><div className="text-sm">As informações foram salvas. Cadastre abaixo as respostas corretas.</div></div></div>}
  <section className="card mb-5"><div className="eyebrow">Dados da avaliação</div><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
   <Data label="Avaliação" value={item.number}/><Data label="Ano" value={item.year}/><Data label="Data" value={date}/><Data label="Quantidade" value={`${item.questionCount} questões`}/>
   <Data label="Unidade" value={item.unit.name}/><Data label="Abrangência" value={item.schoolClass?.name??'Todas as turmas da rede'}/><Data label="Série e disciplina" value={`${item.grade}º ano • ${subjectLabel(item.subject)}`}/><Data label="Tempo" value={timeLabels[item.timeMode]}/>
  </div></section>
  <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
   <section className="card"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="eyebrow">Etapa 2</div><h2 className="text-xl font-bold">Configuração do gabarito oficial</h2><p className="mt-1 text-sm text-black/50">Selecione a alternativa correta de todas as questões.</p></div><button className="btn" disabled={!keyComplete} onClick={saveKey}>Salvar respostas</button></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{key.map((value,i)=><label className="flex items-center gap-3 rounded-xl bg-paper p-3" key={i}><strong className="w-7">{String(i+1).padStart(2,'0')}</strong><select aria-label={`Resposta da questão ${i+1}`} className="field !py-1.5" value={value} onChange={e=>setKey(k=>k.map((x,j)=>j===i?e.target.value:x))}><option value="">—</option>{choices.map(x=><option key={x}>{x}</option>)}</select></label>)}</div>
   </section>
   <aside className="space-y-5"><div className="card"><div className="eyebrow">Etapa 3</div><h2 className="text-xl font-bold">Folhas dos alunos</h2><p className="mt-2 text-sm text-black/50">O PDF agrupa dois alunos por página A4, cada metade com código de barras exclusivo e pronta para corte. Na geração para a rede, as folhas seguem a ordem Unidade → Série → Turma → Aluno.</p><button className="btn mt-4 flex w-full items-center justify-center gap-2" disabled={!keySaved} onClick={generate}><Users size={18}/> {item.schoolClass?'Gerar para a turma':'Gerar para toda a rede'}</button>{!keySaved&&<p className="mt-2 text-xs text-amber-700">Complete e salve todas as respostas oficiais para liberar a geração.</p>}{!!item.sheets?.length&&<><button className="btn mt-3 flex w-full items-center justify-center gap-2" onClick={()=>download(`/api/assessments/${id}/sheets/pdf`,`gabaritos-${item.schoolClass?'turma':'rede'}-${item.number}-${item.year}.pdf`)}><Download size={18}/> Baixar PDF {item.schoolClass?'da turma':'de toda a rede'}</button><p className="mt-3 text-xs text-black/50">{item.sheets.length} gabarito(s) em {Math.ceil(item.sheets.length/2)} página(s) A4.</p><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b"><th className="pb-2">Avaliação</th><th>Ano</th><th>Unidade</th><th>Série</th><th>Disciplina</th><th>Tempo</th></tr></thead><tbody><tr><td className="py-2 font-semibold">{item.number}</td><td>{item.year}</td><td>{item.unit.name}</td><td>{item.grade}º</td><td>{subjectLabel(item.subject)}</td><td>{timeLabels[item.timeMode]}</td></tr></tbody></table></div></>}{!item.sheets?.length&&<p className="mt-4 text-sm text-black/45">Nenhuma folha gerada.</p>}</div>
    <button className="card flex w-full items-center gap-3 text-left" onClick={()=>window.print()}><Printer className="text-forest"/><span><strong>Imprimir esta página</strong><small className="block text-black/45">Para as folhas use o PDF em tamanho real.</small></span></button>{message&&<div className="card text-sm">{message}</div>}
   </aside>
  </div>
 </Page>;
}

function Data({label,value}:{label:string;value:string|number}){return <div><span className="label">{label}</span><strong>{value}</strong></div>}
