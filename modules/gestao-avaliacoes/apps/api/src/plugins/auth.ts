import crypto from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import type {FastifyReply,FastifyRequest} from 'fastify';
import type {UserRole} from '@prisma/client';
import {config} from '../config.js';
import {db} from '../db.js';

declare module 'fastify' {
 interface FastifyRequest { auth:{userId:string;organizationId:string;role:UserRole} }
}

const supabaseAuth=createClient(config.AUTH_SUPABASE_URL??config.SUPABASE_URL,config.AUTH_SUPABASE_PUBLISHABLE_KEY??config.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
type AuthContext=FastifyRequest['auth'];
type PortalPermissions={view?:boolean;create?:boolean;edit?:boolean;delete?:boolean;approve?:boolean;admin?:boolean};
type PortalModule={code?:string;role_code?:string|null;permissions?:PortalPermissions};
type PortalContext={user?:{full_name?:string|null}|null;modules?:PortalModule[]};
type PortalAccess={full_name:string|null;can_admin:boolean;can_manage:boolean;role_code:string|null};
const authCache=new Map<string,{expiresAt:number;auth:AuthContext}>(),AUTH_CACHE_MS=15_000,AUTH_CACHE_MAX=500;

function moduleRole(access:PortalAccess):UserRole{
 if(access.can_admin)return 'ADMIN';
 const code=(access.role_code??'').toUpperCase();
 if(/ADMIN|GESTOR|MANAGER|COORDEN/.test(code)||access.can_manage)return 'MANAGER';
 if(/PROF|TEACHER|DOCENTE/.test(code))return 'TEACHER';
 return 'OPERATOR';
}

async function getPortalAccess(token:string):Promise<PortalAccess|null>{
 const portal=createClient(config.AUTH_SUPABASE_URL??config.SUPABASE_URL,config.AUTH_SUPABASE_PUBLISHABLE_KEY??config.SUPABASE_PUBLISHABLE_KEY,{
  global:{headers:{Authorization:`Bearer ${token}`}},
  auth:{persistSession:false,autoRefreshToken:false}
 });
 const {data,error}=await portal.rpc('get_my_access_context');
 if(error||!data)return null;
 const context=data as PortalContext;
 const module=context.modules?.find(item=>item.code==='avaliacoes'&&item.permissions?.view);
 if(!module)return null;
 return {
  full_name:context.user?.full_name??null,
  can_admin:Boolean(module.permissions?.admin),
  can_manage:Boolean(module.permissions?.create||module.permissions?.edit||module.permissions?.delete||module.permissions?.approve),
  role_code:module.role_code??null
 };
}

async function provisionFromPortal(userId:string,email:string|undefined,access:PortalAccess):Promise<AuthContext>{
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
 const access=await getPortalAccess(token);
 if(!access)return reply.code(403).send({message:'Usuário sem permissão ativa para o módulo Avaliações no Portal INTEGRA.'});
 const auth=await provisionFromPortal(data.user.id,data.user.email,access);
 req.auth=auth;
 if(authCache.size>=AUTH_CACHE_MAX)authCache.delete(authCache.keys().next().value!);
 authCache.set(cacheKey,{expiresAt:Date.now()+AUTH_CACHE_MS,auth});
}

export const permit=(...roles:UserRole[])=>async(req:FastifyRequest,reply:FastifyReply)=>{await authenticate(req,reply);if(reply.sent)return;if(!roles.includes(req.auth.role))return reply.code(403).send({message:'Permissão insuficiente.'});};
