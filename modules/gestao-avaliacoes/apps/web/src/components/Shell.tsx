import {ArrowLeft,BarChart3,Building2,Camera,ClipboardCheck,GraduationCap,House,LayoutDashboard,LogOut,Menu,Settings,Users,X} from 'lucide-react';
import {useState} from 'react';
import {NavLink,Outlet,useNavigate} from 'react-router-dom';
import {supabase} from '../lib/supabase';

const links=[['/','Visão geral',LayoutDashboard],['/avaliacoes','Avaliações',ClipboardCheck],['/leitura','Leitura de gabaritos',Camera],['/resultados','Resultados',BarChart3],['/relatorios','Relatórios',BarChart3],['/alunos','Alunos',Users],['/turmas','Turmas',GraduationCap],['/unidades','Unidades',Building2],['/configuracoes','Configurações',Settings]] as const;

export function Shell(){
 const navigate=useNavigate(),[open,setOpen]=useState(false),logo=`${import.meta.env.BASE_URL}logo_semed.webp`,deticLogo=`${import.meta.env.BASE_URL}logo_detic.webp`;
 const portalUrl=new URL('/',window.location.href).toString();
 async function logout(){await supabase.auth.signOut();window.location.assign(portalUrl)}
 return <div className="min-h-screen bg-[#f6f7fa] text-[#111827]">
  <button className="fixed right-4 top-4 z-30 rounded-xl bg-ink p-2 text-white md:hidden" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
  <aside className={`${open?'translate-x-0':'-translate-x-full'} fixed inset-y-0 left-0 z-20 flex h-screen w-[244px] flex-col border-r border-[#e2e6ef] bg-white p-3 text-[#111827] shadow-xl transition md:translate-x-0 md:shadow-none`}>
   <div className="shrink-0 px-2 pt-2"><div className="mb-5 rounded-2xl border border-[#e2e6ef] bg-white p-3"><img src={logo} alt="Secretaria de Educação de Uberaba" className="h-auto w-full"/></div><div className="mb-4 px-2"><div className="eyebrow">Sistema Avalia</div><div className="text-xl font-bold">Leitura escolar</div><p className="mt-1 text-sm text-[#5f6980]">Da impressão ao resultado.</p></div></div>
   <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-1">{links.map(([to,label,Icon])=><NavLink end={to==='/'} key={to} to={to} onClick={()=>setOpen(false)} className={({isActive})=>`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive?'bg-[#e8edfb] font-bold text-[#233f8f]':'text-[#4f5b73] hover:bg-[#f1f3f8] hover:text-[#233f8f]'}`}><Icon size={18}/>{label}</NavLink>)}</nav>
   <div className="mt-3 shrink-0 border-t border-[#e2e6ef] px-2 pt-3"><button className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#d6dce8] px-4 py-2 text-sm font-semibold text-[#4f5b73] transition hover:bg-[#f1f3f8] hover:text-[#233f8f]" onClick={()=>void logout()}><LogOut size={17}/> Sair</button><img src={deticLogo} alt="DETIC - Departamento de Educação Tecnológica" className="mx-auto mt-3 h-14 w-14 rounded-xl object-cover opacity-80"/></div>
  </aside>
  <main className="min-w-0 p-5 md:ml-[244px] md:p-8"><div className="mb-5 flex flex-wrap justify-end gap-2 pr-12 md:pr-0"><button className="inline-flex items-center gap-2 rounded-xl border border-[#d6dce8] bg-white px-4 py-2.5 font-semibold text-[#4f5b73] hover:bg-[#f1f3f8]" onClick={()=>navigate(-1)}><ArrowLeft size={18}/> Voltar</button><button className="inline-flex items-center gap-2 rounded-xl bg-[#233f8f] px-4 py-2.5 font-semibold text-white hover:bg-[#172f73]" onClick={()=>window.location.assign(`${portalUrl}?select=1`)}><House size={18}/> Voltar ao Portal</button></div><Outlet/></main>
 </div>;
}
