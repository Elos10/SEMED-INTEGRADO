import {lazy,Suspense} from 'react';
import {HashRouter,Route,Routes} from 'react-router-dom';
import {AuthGate} from './components/AuthGate';
import {Shell} from './components/Shell';

const Dashboard=lazy(()=>import('./pages/Dashboard').then(module=>({default:module.Dashboard})));
const NewAssessment=lazy(()=>import('./pages/NewAssessment').then(module=>({default:module.NewAssessment})));
const Assessments=lazy(()=>import('./pages/Assessments').then(module=>({default:module.Assessments})));
const AssessmentDetail=lazy(()=>import('./pages/AssessmentDetail').then(module=>({default:module.AssessmentDetail})));
const Reading=lazy(()=>import('./pages/Reading').then(module=>({default:module.Reading})));
const Review=lazy(()=>import('./pages/Review').then(module=>({default:module.Review})));
const Login=lazy(()=>import('./pages/Login').then(module=>({default:module.Login})));
const Units=lazy(()=>import('./pages/Units').then(module=>({default:module.Units})));
const Classes=lazy(()=>import('./pages/Classes').then(module=>({default:module.Classes})));
const Students=lazy(()=>import('./pages/Students').then(module=>({default:module.Students})));
const Results=lazy(()=>import('./pages/Results').then(module=>({default:module.Results})));
const Reports=lazy(()=>import('./pages/Reports').then(module=>({default:module.Reports})));
const Settings=lazy(()=>import('./pages/Settings').then(module=>({default:module.Settings})));
const loading=<div className="grid min-h-[50vh] place-items-center text-sm font-semibold text-forest">Carregando página…</div>;

export default function App(){return <HashRouter><Suspense fallback={loading}><Routes><Route path="login" element={<Login/>}/><Route element={<AuthGate/>}><Route element={<Shell/>}><Route index element={<Dashboard/>}/><Route path="avaliacoes" element={<Assessments/>}/><Route path="avaliacoes/nova" element={<NewAssessment/>}/><Route path="avaliacoes/:id" element={<AssessmentDetail/>}/><Route path="leitura" element={<Reading/>}/><Route path="leitura/:id/revisao" element={<Review/>}/><Route path="resultados" element={<Results/>}/><Route path="relatorios" element={<Reports/>}/><Route path="alunos" element={<Students/>}/><Route path="turmas" element={<Classes/>}/><Route path="unidades" element={<Units/>}/><Route path="configuracoes" element={<Settings/>}/></Route></Route></Routes></Suspense></HashRouter>}
