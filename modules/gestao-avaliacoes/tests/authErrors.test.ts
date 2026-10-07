import {describe,expect,it} from 'vitest';
import {explainLoginError} from '../apps/web/src/lib/authErrors';

describe('mensagens de autenticação',()=>{
 it('explica indisponibilidade do projeto',()=>expect(explainLoginError({message:'Failed to fetch'})).toContain('projeto Supabase'));
 it('explica credenciais recusadas',()=>expect(explainLoginError({message:'Invalid login credentials',status:400})).toContain('recusou as credenciais'));
 it('explica perfil não confirmado',()=>expect(explainLoginError({message:'Email not confirmed'})).toContain('ainda não foi confirmado'));
 it('explica limite de tentativas',()=>expect(explainLoginError({message:'rate limit exceeded',status:429})).toContain('Muitas tentativas'));
});
