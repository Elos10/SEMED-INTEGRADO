update public.semed_modules
set route='https://gest-o-de-avalia-es-api.vercel.app/?portal=integra',
    updated_at=now()
where code='avaliacoes';
