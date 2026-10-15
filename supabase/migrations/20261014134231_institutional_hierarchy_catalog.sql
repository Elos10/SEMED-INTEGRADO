-- Catálogo institucional usado no cadastro centralizado de usuários.
-- Os nomes de unidade e função continuam armazenados em semed_people para
-- compatibilidade com os módulos, mas passam a ser validados pela aplicação.
alter table public.semed_people
  drop constraint if exists semed_people_area_valid;

alter table public.semed_people
  add constraint semed_people_area_valid check (
    area in (
      '', 'Gabinete', 'Diretoria de Ensino',
      'Diretoria de Apoio à Educação Básica', 'Diretoria de Logística',
      'Diretoria de Planejamento, Gestão e Finanças',
      -- valores legados mantidos durante a transição dos cadastros existentes
      'Gestão SEMED', 'Diretoria de Planejamento Gestão e Finanças',
      'Arte e Cultura', 'Formação - Casa do Educador', 'Formação - Polo UAB',
      'Inclusão', 'Infraestrutura', 'Planejamento Financeiro', 'Tecnologia', 'Transporte'
    )
  );

alter table public.monitor_profiles
  drop constraint if exists monitor_profiles_area_valid;

alter table public.monitor_profiles
  add constraint monitor_profiles_area_valid check (
    area in (
      '', 'Gabinete', 'Diretoria de Ensino',
      'Diretoria de Apoio à Educação Básica', 'Diretoria de Logística',
      'Diretoria de Planejamento, Gestão e Finanças',
      'Gestão SEMED', 'Diretoria de Planejamento Gestão e Finanças',
      'Arte e Cultura', 'Formação - Casa do Educador', 'Formação - Polo UAB',
      'Inclusão', 'Infraestrutura', 'Planejamento Financeiro', 'Tecnologia', 'Transporte'
    )
  );
