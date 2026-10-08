update public.semed_modules
set route='./modules/gestao-avaliacoes/',
    name='Gestão de Avaliações',
    description='Criação, leitura, correção e acompanhamento das avaliações escolares.',
    updated_at=now()
where code='avaliacoes';
