import {ArrowLeft,BarChart3,Building2,Camera,ClipboardCheck,GraduationCap,LayoutDashboard,LogOut,Menu,Settings,Users,X} from 'lucide-react';
import {useState} from 'react';
import {NavLink,Outlet,useNavigate} from 'react-router-dom';
import {supabase} from '../lib/supabase';

const links=[['/','Visão geral',LayoutDashboard],['/avaliacoes','Avaliações',ClipboardCheck],['/leitura','Leitura de gabaritos',Camera],['/resultados','Resultados',BarChart3],['/relatorios','Relatórios',BarChart3],['/alunos','Alunos',Users],['/turmas','Turmas',GraduationCap],['/unidades','Unidades',Building2],['/configuracoes','Configurações',Settings]] as const;

export function Shell(){
 const navigate=useNavigate(),[open,setOpen]=useState(false),logo=`${import.meta.env.BASE_URL}logo_semed.webp`,deticLogo=`${import.meta.env.BASE_URL}logo_detic.webp`;
 async function logout(){await supabase.auth.signOut();navigate('/login',{replace:true})}
 return <div className="min-h-screen">
  <button className="fixed right-4 top-4 z-30 rounded-xl bg-ink p-2 text-white md:hidden" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
  <aside className={`${open?'translate-x-0':'-translate-x-full'} fixed inset-y-0 left-0 z-20 flex h-screen w-[260px] flex-col bg-ink p-6 text-white transition md:translate-x-0`}>
   <div className="shrink-0"><div className="mb-7 rounded-2xl bg-white p-3"><img src={logo} alt="Secretaria de Educação de Uberaba" className="h-auto w-full"/></div><div className="mb-5"><div className="eyebrow !text-amber">Sistema Avalia</div><div className="text-xl font-bold">Leitura escolar</div><p className="mt-2 text-sm text-white/60">Da impressão ao resultado.</p></div></div>
   <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">{links.map(([to,label,Icon])=><NavLink end={to==='/'} key={to} to={to} onClick={()=>setOpen(false)} className={({isActive})=>`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${isActive?'bg-white text-ink':'text-white/70 hover:bg-white/10 hover:text-white'}`}><Icon size={18}/>{label}</NavLink>)}</nav>
   <div className="mt-4 shrink-0 border-t border-white/15 pt-4 text-center"><button className="mx-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 px-6 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-ink" onClick={()=>void logout()}><LogOut size={17}/> Sair</button><img src={deticLogo} alt="DETIC - Departamento de Educação Tecnológica" className="mx-auto mt-4 h-24 w-24 rounded-xl object-cover"/></div>
  </aside>
  <main className="min-w-0 p-5 md:ml-[260px] md:p-9"><div className="mb-3 flex justify-end pr-12 md:pr-0"><button className="inline-flex items-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-2.5 font-semibold hover:bg-black/5" onClick={()=>navigate(-1)}><ArrowLeft size={18}/> Voltar</button></div><Outlet/></main>
 </div>;
}
