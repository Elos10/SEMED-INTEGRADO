import crypto from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import type {FastifyReply,FastifyRequest} from 'fastify';
import type {UserRole} from '@prisma/client';
import {config} from '../config.js';
import {db} from '../db.js';

declare module 'fastify' {
 interface FastifyRequest { auth:{userId:string;organizationId:string;role:UserRole} }
}

const supabaseAuth=createClient(config.SUPABASE_URL,config.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
type AuthContext=FastifyRequest['auth'];
type PortalAccess={full_name:string|null;can_admin:boolean;can_manage:boolean;role_code:string|null};
const authCache=new Map<string,{expiresAt:number;auth:AuthContext}>(),AUTH_CACHE_MS=15_000,AUTH_CACHE_MAX=500;

function moduleRole(access:PortalAccess):UserRole{
 if(access.can_admin)return 'ADMIN';
 const code=(access.role_code??'').toUpperCase();
 if(/ADMIN|GESTOR|MANAGER|COORDEN/.test(code)||access.can_manage)return 'MANAGER';
 if(/PROF|TEACHER|DOCENTE/.test(code))return 'TEACHER';
 return 'OPERATOR';
}

async function provisionFromPortal(userId:string,email?:string):Promise<AuthContext|null>{
 const rows=await db.$queryRaw<PortalAccess[]>`
  select p.full_name,
   coalesce(bool_or(pmp.can_admin),false) as can_admin,
   coalesce(bool_or(pmp.can_create or pmp.can_edit or pmp.can_approve),false) as can_manage,
   max(umr.role_code) as role_code
  from public.semed_people p
  join public.semed_user_profiles up on up.user_id=p.user_id and up.active=true
  join public.semed_profiles sp on sp.id=up.profile_id and sp.active=true
  join public.semed_profile_module_permissions pmp on pmp.profile_id=sp.id and pmp.can_view=true
  join public.semed_modules m on m.id=pmp.module_id and m.code='avaliacoes' and m.active=true
  left join public.semed_user_module_roles umr on umr.user_id=p.user_id and umr.module_id=m.id and umr.active=true
  where p.user_id=${userId}::uuid and p.active=true
  group by p.user_id,p.full_name`;
 const access=rows[0];
 if(!access)return null;
 const organization=await db.organization.findFirst({orderBy:{createdAt:'asc'},select:{id:true}});
 if(!organization)throw new Error('A organização do módulo Avaliações ainda não foi configurada.');
 const role=moduleRole(access);
 await db.profile.upsert({where:{id:userId},create:{id:userId,organizationId:organization.id,name:access.full_name||email||'Usuário',role,active:true},update:{organizationId:organization.id,name:access.full_name||email||'Usuário',role,active:true}});
 return {userId,organizationId:organization.id,role};
}

export async function authenticate(req:FastifyRequest,reply:FastifyReply){
 const token=req.headers.authorization?.replace(/^Bearer\s+/i,'');
 if(!token)return reply.code(401).send({message:'Autenticação necessária.'});
 const cacheKey=crypto.createHash('sha256').update(token).digest('base64url'),cached=authCache.get(cacheKey);
 if(cached&&cached.expiresAt>Date.now()){req.auth=cached.auth;return}
 if(cached)authCache.delete(cacheKey);
 const {data,error}=await supabaseAuth.auth.getUser(token);
 if(error||!data.user)return reply.code(401).send({message:'Sessão inválida.'});
 const auth=await provisionFromPortal(data.user.id,data.user.email);
 if(!auth)return reply.code(403).send({message:'Usuário sem permissão ativa para o módulo Avaliações no Portal INTEGRA.'});
 req.auth=auth;
 if(authCache.size>=AUTH_CACHE_MAX)authCache.delete(authCache.keys().next().value!);
 authCache.set(cacheKey,{expiresAt:Date.now()+AUTH_CACHE_MS,auth});
}

export const permit=(...roles:UserRole[])=>async(req:FastifyRequest,reply:FastifyReply)=>{await authenticate(req,reply);if(reply.sent)return;if(!roles.includes(req.auth.role))return reply.code(403).send({message:'Permissão insuficiente.'});};
