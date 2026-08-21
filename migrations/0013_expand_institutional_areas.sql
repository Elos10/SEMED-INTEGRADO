-- Lista institucional compartilhada entre o Portal e o módulo Monitoramento.

alter table public.semed_people
  drop constraint if exists semed_people_area_valid;
alter table public.semed_people
  add constraint semed_people_area_valid check (
    area in ('', 'Gestão SEMED', 'Diretoria de Ensino', 'Diretoria de Apoio à Educação Básica', 'Diretoria de Logística', 'Diretoria de Planejamento Gestão e Finanças', 'Arte e Cultura', 'Formação - Casa do Educador', 'Formação - Polo UAB', 'Inclusão', 'Infraestrutura', 'Planejamento Financeiro', 'Tecnologia', 'Transporte')
  );

alter table public.monitor_profiles
  drop constraint if exists monitor_profiles_area_valid;
alter table public.monitor_profiles
  add constraint monitor_profiles_area_valid check (
    area in ('', 'Gestão SEMED', 'Diretoria de Ensino', 'Diretoria de Apoio à Educação Básica', 'Diretoria de Logística', 'Diretoria de Planejamento Gestão e Finanças', 'Arte e Cultura', 'Formação - Casa do Educador', 'Formação - Polo UAB', 'Inclusão', 'Infraestrutura', 'Planejamento Financeiro', 'Tecnologia', 'Transporte')
  );
