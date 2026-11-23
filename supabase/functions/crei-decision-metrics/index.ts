import {createClient} from 'jsr:@supabase/supabase-js@2.57.4';
import {aggregateModule} from './aggregate.js';
const central='https://mqzaaelyiskwshqjwaxy.supabase.co',source='https://vurgswhwkscxkqkpbwxf.supabase.co';
const centralKey='sb_publishable_qz1ZoagSgKJSwBbRarSOMQ_hapL8htu',sourceKey='sb_publishable_6jMKw16IL6Xvsa86--pPtQ_dRxdwN6f';
Deno.serve(async req=>{
 const headers={'Content-Type':'application/json','Cache-Control':'private, no-store','Access-Control-Allow-Origin':'https://semed-integrado.vercel.app','Access-Control-Allow-Headers':'authorization,x-portal-authorization,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{headers,status});
 if(req.method==='OPTIONS')return new Response('ok',{headers});if(req.method!=='POST')return reply({error:'Método não permitido.'},405);
 let local:ReturnType<typeof createClient>|null=null;
 try{
  const token=(req.headers.get('X-Portal-Authorization')||req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');
  const portal=createClient(central,centralKey,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:user,error:authError}=await portal.auth.getUser(token);if(authError||!user.user)return reply({error:'Sessão inválida.'},401);
  const {data:context,error:contextError}=await portal.rpc('get_my_access_context');
  if(contextError||!context?.user?.active||!(context.portal_admin||context.modules?.some((m:any)=>m.code==='inteligencia'&&m.permissions?.view)))return reply({error:'Consulta gerencial não autorizada.'},403);
  const {year}=await req.json();if(!Number.isInteger(year)||year<2000||year>2100)return reply({error:'Ano inválido.'},400);
  const exchange=await fetch(`${source}/functions/v1/portal-session-exchange`,{method:'POST',headers:{Authorization:`Bearer ${token}`,apikey:sourceKey,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(20000)});
  const temporary=await exchange.json();if(!exchange.ok||!temporary.token_hash)return reply({error:'Seu acesso ao CREI/SAE não pôde ser validado.'},403);
  local=createClient(source,sourceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:login,error:loginError}=await local.auth.verifyOtp({token_hash:temporary.token_hash,type:'magiclink'});
  if(loginError||login.user?.email?.toLowerCase()!==user.user.email?.toLowerCase())return reply({error:'Falha na validação da origem.'},403);
  const {data:profile,error:profileError}=await local.from('profiles').select('role,active,protected_access,protected_manager,incident_access,incident_reports,sae_access,sae_reports').eq('id',login.user.id).single();
  if(profileError||!profile?.active)return reply({error:'Perfil de origem indisponível.'},403);
  const admin=profile.role==='administrador';
  const definitions:any={
   protected:{allowed:admin||(profile.protected_access&&profile.protected_manager),query:()=>local!.rpc('list_protected_case_summaries').select('id,unit_name,status,risk_level,occurred_at,created_at')},
   incidents:{allowed:admin||(profile.incident_access&&profile.incident_reports),query:()=>local!.from('school_incidents').select('id,reporting_unit,status,occurred_at,created_at')},
   active_search:{allowed:admin||profile.incident_access||profile.protected_access||profile.sae_access||context.profiles?.some((p:any)=>p.code==='BUSCA_ATIVA_REGISTRO'),query:()=>local!.from('active_search_records').select('id,unit_name,created_at,absence_count,certified_absence_count')},
   sae:{allowed:admin||(profile.sae_access&&profile.sae_reports),query:()=>local!.from('sae_cases').select('id,unit_name,status,opened_on')},
  };
  const results:any={};
  await Promise.all(Object.entries(definitions).map(async([module,d]:[string,any])=>{
   if(!d.allowed){results[module]={status:'restricted'};return;}
   try{const rows:any[]=[];for(let offset=0;;offset+=500){const {data,error}=await d.query().order('id').range(offset,offset+499);if(error)throw error;rows.push(...(data||[]));if(!data||data.length<500)break;}results[module]=aggregateModule(module,rows,year);}catch{results[module]={status:'unavailable'};}
  }));
  return reply({year,modules:results,updated_at:new Date().toISOString()});
 }catch{return reply({error:'Não foi possível carregar os indicadores. Tente atualizar.'},503);}
 finally{if(local)await local.auth.signOut({scope:'local'}).catch(()=>{});}
});
