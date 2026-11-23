// Same-origin endpoint avoids cross-origin preflight failures. Authorization is
// still validated by the existing source function; no access checks are bypassed.
export async function requestStudentSources({token,body,fetcher=fetch}) {
 let response;
 try {
  response=await fetcher('/integrations/student-dossier-sources',{
   method:'POST',cache:'no-store',credentials:'omit',
   headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
   body:JSON.stringify(body),signal:AbortSignal.timeout(45000),
  });
 } catch(error) {
  throw new Error(error.name==='TimeoutError'?'A consulta demorou além do esperado. Tente atualizar o relatório.':'Não foi possível conectar à consulta integrada. Verifique a conexão e tente novamente.');
 }
 let result;
 try {result=await response.json();}catch {throw new Error('A consulta integrada retornou uma resposta inválida. Atualize a página e tente novamente.');}
 if(!response.ok)throw new Error(response.status===401?'Sua sessão expirou. Entre novamente no portal.':result.error||'Não foi possível consultar os registros autorizados.');
 return result;
}
