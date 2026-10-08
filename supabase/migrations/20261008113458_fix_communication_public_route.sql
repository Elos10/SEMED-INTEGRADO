update public.semed_modules
set route='https://semed-comunicacao.vercel.app/?portal=integra',
    updated_at=now()
where code='comunicacao';
