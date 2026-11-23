// Deployed in the central project. Educational and case content is read with
// caller RLS. The service client handles only the private link index after
// checking the central student scope and current source-record authorization.
import { createClient } from "jsr:@supabase/supabase-js@2.57.4";
const portalUrl = "https://mqzaaelyiskwshqjwaxy.supabase.co";
const portalKey = "sb_publishable_qz1ZoagSgKJSwBbRarSOMQ_hapL8htu";
const sourceUrl = "https://vurgswhwkscxkqkpbwxf.supabase.co";
const sourceKey = "sb_publishable_6jMKw16IL6Xvsa86--pPtQ_dRxdwN6f";
const origins = new Set(["https://semed-integrado.vercel.app", "http://127.0.0.1:8765", "http://localhost:8765"]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const titles: Record<string,string> = { protected:"Comunicação Protegida", incidents:"Incidentes Escolares", active_search:"Busca Ativa", sae:"Atendimentos SAE" };
const route: Record<string,string> = { protected:"protected", incidents:"incidentes", active_search:"active-search", sae:"sae" };
const cleanError = "Não foi possível consultar esta fonte. Confira seu acesso no CREI/SAE.";
Deno.serve(async req => {
 const origin=req.headers.get("Origin") || "";
 const headers={"Content-Type":"application/json","Access-Control-Allow-Origin":origins.has(origin)?origin:"https://semed-integrado.vercel.app","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-portal-authorization","Access-Control-Allow-Methods":"POST, OPTIONS","Cache-Control":"no-store","Vary":"Origin"};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method==="OPTIONS") return new Response("ok",{headers});
 if(req.method!=="POST" || (origin && !origins.has(origin))) return reply({error:"Solicitação não permitida."},403);
 let local: ReturnType<typeof createClient> | null=null;
 try {
  // External rewrites can reserve/replace Authorization. The explicit portal
  // header transports the same user JWT; getUser still verifies it server-side.
  const token=(req.headers.get("X-Portal-Authorization")||req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
  const portal=createClient(portalUrl,portalKey,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:user,error:authError}=await portal.auth.getUser(token);
  if(authError || !user.user?.email) return reply({error:"Sessão inválida."},401);
  const body=await req.json();
  if(!uuid.test(body.student_id||"") || !["read","candidates","link","unlink"].includes(body.action)) return reply({error:"Dados inválidos."},400);
  const {data:dossier,error:denied}=await portal.rpc("get_student_dossier",{p_student:body.student_id});
  if(denied || !dossier) return reply({error:"Aluno não disponível neste acesso."},403);
  if(body.action!=="read" && !dossier.can_link) return reply({error:"Vinculação não autorizada."},403);
  const source=String(body.source||"");
  if(body.action!=="read" && (!titles[source] || !dossier.sources[source])) return reply({error:"Fonte não autorizada."},403);
  const index=createClient(portalUrl,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
  const linked:any[]=[];
  for(let offset=0;;offset+=500) {
   const {data:page,error:indexError}=await index.from("semed_student_record_links").select("id,source_module,source_record_id,source_person_id").eq("student_id",body.student_id).eq("active",true).order("id").range(offset,offset+499);
   if(indexError)throw indexError;
   linked.push(...(page||[]));if(!page||page.length<500)break;
  }
  const sourceLinks=linked.filter((l:{source_module:string})=>dossier.sources[l.source_module]);
  if(body.action==="read" && !sourceLinks.length) return reply({records:[],unavailable:[]});
  // Existing exchange verifies current source grants and synchronizes local
  // privileges. The OTP is consumed only server-side; no source token is returned.
  const url=sourceUrl;
  const key=sourceKey;
  const exchange=await fetch(`${url}/functions/v1/portal-session-exchange`,{method:"POST",headers:{Authorization:`Bearer ${token}`,apikey:key,"Content-Type":"application/json"},body:"{}"});
  const temporary=await exchange.json();
  if(!exchange.ok || !temporary.token_hash) return reply({error:cleanError},403);
  local=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:login,error:loginError}=await local.auth.verifyOtp({token_hash:temporary.token_hash,type:"magiclink"});
  if(loginError || login.user?.email?.toLowerCase()!==user.user.email.toLowerCase()) return reply({error:cleanError},403);
  const {data:profile}=await local.from("profiles").select("role,email,active").eq("id",login.user.id).single();
  const cpAllowed=profile?.active && (profile.role==="administrador" || ["assistenciaaoeducando@edu.uberabadigital.com.br","daeb@uberabadigital.com.br"].includes(profile.email?.toLowerCase()));
  const query=async(p:any)=>{const {data,error}=await p;if(error)throw new Error(cleanError);return data;};
  let protectedSummaries:Promise<any>|undefined;
  const protectedRows=()=>protectedSummaries??=query(local!.rpc("list_protected_case_summaries"));
  const readSource=async(module:string,id:string,personId?:string)=>{
   if(!dossier.sources[module] || (module==="protected" && !cpAllowed)) return null;
   if(module==="protected") {
    const rows=await protectedRows();const r=rows?.find((r:any)=>r.id===id);if(!r)return null;
    return {id,module,title:titles[module],protocol:r.protocol,date:r.occurred_at||r.created_at,unit:r.unit_name,status:r.status,occurrence_type:r.category,summary:"****",details:{"Pessoa protegida":"****","Descrição":"****","Providências":"****"},href:`/crei-sae/?view=${route[module]}&record=${id}`};
   }
   if(module==="sae") {
    const r=await query(local!.from("sae_cases").select("id,person_id,protocol_number,opened_on,unit_name,status,presented_situation,reported_situations,referral_summary,network_return,assigned_professional,notes").eq("id",id).maybeSingle());if(!r)return null;
    return {id,module,title:titles[module],protocol:r.protocol_number,date:r.opened_on,unit:r.unit_name,status:r.status,summary:r.presented_situation,details:{"Relato inicial":r.reported_situations,"Encaminhamentos":r.referral_summary,"Retorno da rede":r.network_return,"Profissional":r.assigned_professional,"Observações":r.notes},href:`/crei-sae/?view=${route[module]}&record=${id}`};
   }
   if(module==="active_search") {
    const r=await query(local!.from("active_search_records").select("id,student_name,unit_name,school_year,class_name,absence_count,certified_absence_count,other_justifications,created_at").eq("id",id).maybeSingle());if(!r)return null;
    return {id,module,title:titles[module],protocol:`BA-${r.id}`,date:r.created_at,unit:r.unit_name,status:"Registrado",summary:`${r.absence_count} falta(s); ${r.certified_absence_count} com atestado`,details:{"Ano":r.school_year,"Turma":r.class_name,"Outras justificativas":r.other_justifications},href:`/crei-sae/?view=${route[module]}&record=${id}`};
   }
   const r=await query(local!.from("school_incidents").select("id,protocol,occurred_at,reporting_unit,category,status,objective_description,measures_taken").eq("id",id).maybeSingle());if(!r)return null;
   if(!personId)return null;
   const person=await query(local!.from("school_incident_people").select("id,full_name,protect_identity").eq("id",personId).eq("incident_id",id).maybeSingle());if(!person)return null;
   // A protected participant cannot be reidentified through the dossier.
   if(person.protect_identity) return null;
   return {id,module,title:titles[module],protocol:r.protocol,date:r.occurred_at,unit:r.reporting_unit,status:r.status,summary:r.category,details:{"Descrição":r.objective_description,"Providências":r.measures_taken},href:`/crei-sae/?view=${route[module]}&record=${id}`};
  };
  if(body.action==="read") {
   const records:any[]=[];const unavailable=new Set<string>();
   // Bound concurrency and return no inaccessible record IDs/counts.
   for(let i=0;i<sourceLinks.length;i+=5) await Promise.all(sourceLinks.slice(i,i+5).map(async(l:any)=>{
    try {const r=await readSource(l.source_module,l.source_record_id,l.source_person_id);if(r)records.push(r);}catch{unavailable.add(l.source_module);}
   }));
   return reply({records,unavailable:[...unavailable]});
  }
  if(body.action==="candidates") {
   const search=String(body.search||dossier.student.name).trim();
   if(search.length<3 || search.length>120)return reply({error:"Pesquisa inválida."},400);
   const pattern=`%${search.replace(/[\\%_]/g,"\\$&")}%`;
   let candidates:any[]=[];
   if(source==="protected") {
    if(!cpAllowed)return reply({error:"Fonte não autorizada."},403);
    const rows=await protectedRows();
    candidates=(rows||[]).filter((r:any)=>r.protocol?.toLowerCase()===search.toLowerCase()).map((r:any)=>({id:r.id,protocol:r.protocol,unit:r.unit_name,date:r.occurred_at,name:"****"}));
   } else if(source==="active_search") {
    const rows=await query(local.from("active_search_records").select("id,student_name,unit_name,created_at").ilike("student_name",pattern).order("created_at",{ascending:false}).limit(25));
    candidates=(rows||[]).map((r:any)=>({id:r.id,name:r.student_name,unit:r.unit_name,date:r.created_at}));
   } else if(source==="sae") {
    const rows=await query(local.from("sae_cases").select("id,protocol_number,unit_name,opened_on,sae_people!inner(full_name,birth_date)").ilike("sae_people.full_name",pattern).order("opened_on",{ascending:false}).limit(25));
    candidates=(rows||[]).map((r:any)=>({id:r.id,protocol:r.protocol_number,name:r.sae_people.full_name,birth_date:r.sae_people.birth_date,unit:r.unit_name,date:r.opened_on}));
   } else {
    const rows=await query(local.from("school_incident_people").select("id,incident_id,full_name,protect_identity,school_incidents!inner(protocol,reporting_unit,occurred_at)").eq("protect_identity",false).ilike("full_name",pattern).limit(25));
    candidates=(rows||[]).map((r:any)=>({id:r.incident_id,person_id:r.id,name:r.full_name,protocol:r.school_incidents.protocol,unit:r.school_incidents.reporting_unit,date:r.school_incidents.occurred_at}));
   }
   await portal.from("semed_student_dossier_audit").insert({student_id:body.student_id,action:"SEARCH"});
   return reply({candidates});
  }
  if(!uuid.test(body.record_id||""))return reply({error:"Registro inválido."},400);
  const linkedPerson=sourceLinks.find((l:any)=>l.source_module===source && l.source_record_id===body.record_id)?.source_person_id;
  const verified=await readSource(source,body.record_id,body.person_id||linkedPerson);
  if(!verified)return reply({error:"Registro não disponível neste acesso."},403);
  if(body.action==="link") {
   if(body.confirmed!==true)return reply({error:"Confirme a identidade do aluno antes de vincular."},400);
   const existing=await query(index.from("semed_student_record_links").select("id,active").eq("student_id",body.student_id).eq("source_module",source).eq("source_record_id",body.record_id).maybeSingle());
   if(existing) await query(index.from("semed_student_record_links").update({active:true,source_person_id:body.person_id||null,confirmed_by:user.user.id,confirmed_at:new Date().toISOString()}).eq("id",existing.id));
   else await query(index.from("semed_student_record_links").insert({student_id:body.student_id,source_module:source,source_record_id:body.record_id,source_person_id:body.person_id||null,confirmed_by:user.user.id}));
  } else await query(index.from("semed_student_record_links").update({active:false,confirmed_by:user.user.id}).eq("student_id",body.student_id).eq("source_module",source).eq("source_record_id",body.record_id));
  // A database trigger records LINK/UNLINK atomically with this mutation.
  return reply({ok:true});
 } catch { return reply({error:cleanError},400); }
 finally { if(local) await local.auth.signOut({scope:"local"}).catch(()=>{}); }
});
