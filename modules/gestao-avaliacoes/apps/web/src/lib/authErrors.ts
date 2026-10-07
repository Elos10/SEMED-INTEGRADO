type AuthErrorLike={message?:string;code?:string;status?:number;name?:string};

export function explainLoginError(error:AuthErrorLike){
 const text=`${error.code??''} ${error.name??''} ${error.message??''}`.toLowerCase();
 if(text.includes('failed to fetch')||text.includes('fetch')||text.includes('network')||text.includes('networkerror'))return 'Não foi possível conectar ao serviço de autenticação. O projeto Supabase configurado não foi encontrado, está pausado ou está indisponível.';
 if(text.includes('email not confirmed'))return 'O e-mail existe, mas ainda não foi confirmado no Supabase Auth.';
 if(text.includes('rate limit')||error.status===429)return 'Muitas tentativas foram realizadas. Aguarde alguns minutos antes de tentar novamente.';
 if(text.includes('invalid login credentials')||text.includes('invalid_credentials')||error.status===400)return 'O Supabase recusou as credenciais. O usuário pode não existir nesse projeto, a senha pode ter sido alterada ou estar incorreta.';
 if(text.includes('user is banned')||text.includes('banned'))return 'O usuário está bloqueado no Supabase Auth.';
 return `O acesso não foi concluído: ${error.message||'falha não identificada no serviço de autenticação.'}`;
}
