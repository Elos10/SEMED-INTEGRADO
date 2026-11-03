begin;

create table if not exists public.semed_reference_catalogs (
  id uuid primary key default gen_random_uuid(),
  catalog text not null check (catalog in ('AREA','DIRECTORATE','SECTOR','JOB_TITLE','EDUCATIONAL_UNIT')),
  code text not null,
  label text not null check (char_length(trim(label)) >= 2),
  parent_code text,
  source_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (catalog,code)
);

create unique index if not exists semed_reference_catalogs_source_idx
  on public.semed_reference_catalogs(catalog,source_id) where source_id is not null;
create index if not exists semed_reference_catalogs_lookup_idx
  on public.semed_reference_catalogs(catalog,active,sort_order,label);

alter table public.semed_reference_catalogs enable row level security;
drop policy if exists semed_reference_catalogs_read on public.semed_reference_catalogs;
create policy semed_reference_catalogs_read on public.semed_reference_catalogs
  for select to authenticated
  using (exists (
    select 1 from public.semed_people person
    where person.user_id=(select auth.uid())
      and person.active
      and person.account_status='ACTIVE'
  ));
revoke all on public.semed_reference_catalogs from anon;
grant select on public.semed_reference_catalogs to authenticated;

insert into public.semed_reference_catalogs(catalog,code,label,sort_order)
values
 ('AREA','GABINETE','Gabinete',10),
 ('AREA','DIRETORIA_ENSINO','Diretoria de Ensino',20),
 ('AREA','DIRETORIA_APOIO_EDUCACAO_BASICA','Diretoria de Apoio à Educação Básica',30),
 ('AREA','DIRETORIA_LOGISTICA','Diretoria de Logística',40),
 ('AREA','DIRETORIA_PLANEJAMENTO_GESTAO_FINANCAS','Diretoria de Planejamento, Gestão e Finanças',50),
 ('DIRECTORATE','GABINETE','Gabinete',10),
 ('DIRECTORATE','DIRETORIA_ENSINO','Diretoria de Ensino',20),
 ('DIRECTORATE','DIRETORIA_APOIO_EDUCACAO_BASICA','Diretoria de Apoio à Educação Básica',30),
 ('DIRECTORATE','DIRETORIA_LOGISTICA','Diretoria de Logística',40),
 ('DIRECTORATE','DIRETORIA_PLANEJAMENTO_GESTAO_FINANCAS','Diretoria de Planejamento, Gestão e Finanças',50),
 ('JOB_TITLE','SECRETARIO','Secretário(a)',10),
 ('JOB_TITLE','SECRETARIO_ADJUNTO','Secretário(a) Adjunto(a)',20),
 ('JOB_TITLE','ASSESSOR','Assessor(a)',30),
 ('JOB_TITLE','DIRETOR_DIRETORIA','Diretor(a) de Diretoria',40),
 ('JOB_TITLE','CHEFE_DEPARTAMENTO','Chefe de Departamento',50),
 ('JOB_TITLE','CHEFE_SECAO','Chefe de Seção',60),
 ('JOB_TITLE','DIRETOR_UNIDADE','Diretor(a) de Unidade',70),
 ('JOB_TITLE','VICE_DIRETOR_UNIDADE','Vice-Diretor(a) de Unidade',80),
 ('JOB_TITLE','COORDENADOR_PEDAGOGICO','Coordenador(a) Pedagógico',90),
 ('JOB_TITLE','ADMINISTRATIVO','Administrativo',100)
on conflict(catalog,code) do update set label=excluded.label,sort_order=excluded.sort_order,active=true,updated_at=now();

insert into public.semed_reference_catalogs(catalog,code,label,parent_code,sort_order)
select 'SECTOR',upper(regexp_replace(item.label,'[^A-Za-z0-9]+','_','g')),item.label,item.parent_code,item.sort_order
from (values
 ('SEMED - Secretária','GABINETE',10),('SEMED - Secretário Adjunto','GABINETE',20),('SEMED - Assessoria Jurídica','GABINETE',30),('SEMED - Assessoria de Comunicação','GABINETE',40),('SEMED - Fale com a SEMED','GABINETE',50),
 ('SEMED - Núcleo da Primeira Infância','GABINETE',60),('SEMED - Núcleo de Alfabetização','DIRETORIA_ENSINO',70),('SEMED - Núcleo de Avaliação Sistêmica e Estatística','DIRETORIA_ENSINO',80),('SEMED - Núcleo de Busca Ativa Escolar','DIRETORIA_ENSINO',90),('SEMED - Núcleo de Educação de Jovens e Adultos','DIRETORIA_ENSINO',100),('SEMED - Núcleo de Educação em Tempo Integral','DIRETORIA_ENSINO',110),('SEMED - Núcleo de Educação Inclusiva','DIRETORIA_APOIO_EDUCACAO_BASICA',120),('SEMED - Núcleo de Escolas do Campo','DIRETORIA_ENSINO',130),('SEMED - Núcleo Étnico-Racial e de Diversidade','DIRETORIA_ENSINO',140),
 ('DAEB - CEMEA Boa Vista','DIRETORIA_APOIO_EDUCACAO_BASICA',150),('DAEB - CEU das Artes','DIRETORIA_APOIO_EDUCACAO_BASICA',160),('DAEB - Departamento de Arte e Cultura','DIRETORIA_APOIO_EDUCACAO_BASICA',170),('DAEB - Departamento de Bibliotecas','DIRETORIA_APOIO_EDUCACAO_BASICA',180),('DAEB - Departamento de Educação Inclusiva','DIRETORIA_APOIO_EDUCACAO_BASICA',190),('DAEB - Seção de Assistência ao Educando','DIRETORIA_APOIO_EDUCACAO_BASICA',200),('DAEB - Seção de Atendimento Educacional Especializado','DIRETORIA_APOIO_EDUCACAO_BASICA',210),('DAEB - Seção de Bibliotecas Escolares','DIRETORIA_APOIO_EDUCACAO_BASICA',220),('DAEB - Seção de Referência, Processamento Técnico e Desenvolvimento de Acervos','DIRETORIA_APOIO_EDUCACAO_BASICA',230),
 ('DE - Departamento de Educação Física Escolar','DIRETORIA_ENSINO',240),('DE - Departamento de Educação Infantil','DIRETORIA_ENSINO',250),('DE - Departamento de Educação Tecnológica','DIRETORIA_ENSINO',260),('DE - Departamento de Ensino Fundamental','DIRETORIA_ENSINO',270),('DE - Departamento de Formação Profissional','DIRETORIA_ENSINO',280),('DE - Departamento de Inspeção Escolar','DIRETORIA_ENSINO',290),('DE - Seção de Paradesporto Escolar','DIRETORIA_ENSINO',300),('DE - Seção de Manutenção de Computadores','DIRETORIA_ENSINO',310),
 ('DPGF - Departamento de Programas Federais','DIRETORIA_PLANEJAMENTO_GESTAO_FINANCAS',320),('DPGF - Departamento de Planejamento, Gestão, Projetos e Convênios','DIRETORIA_PLANEJAMENTO_GESTAO_FINANCAS',330),('DPGF - Seção de Controle de Contratos','DIRETORIA_PLANEJAMENTO_GESTAO_FINANCAS',340),('DPGF - Seção de Convênios e Recursos','DIRETORIA_PLANEJAMENTO_GESTAO_FINANCAS',350),('DPGF - Seção de Planejamento Financeiro e Orçamento','DIRETORIA_PLANEJAMENTO_GESTAO_FINANCAS',360),('DPGF - Seção de Monitoramento de Processos Licitatórios','DIRETORIA_PLANEJAMENTO_GESTAO_FINANCAS',370),
 ('DL - Departamento de Transportes','DIRETORIA_LOGISTICA',380),('DL - Departamento de Manutenção e Infraestrutura Escolar','DIRETORIA_LOGISTICA',390),('DL - Departamento de Gestão de Pessoal','DIRETORIA_LOGISTICA',400),('DL - Seção de Alimentação Escolar','DIRETORIA_LOGISTICA',410),('DL - Seção de Transporte Escolar Urbano','DIRETORIA_LOGISTICA',420),('DL - Seção de Provimento de Pessoal','DIRETORIA_LOGISTICA',430),('DL - Seção de Acompanhamento e Suporte de Pessoal','DIRETORIA_LOGISTICA',440)
) as item(label,parent_code,sort_order)
on conflict(catalog,code) do update set label=excluded.label,parent_code=excluded.parent_code,sort_order=excluded.sort_order,active=true,updated_at=now();

insert into public.semed_reference_catalogs(id,catalog,code,label,source_id,metadata,active,sort_order)
select unit.id,'EDUCATIONAL_UNIT',coalesce(nullif(unit.code,''),unit.id::text),unit.name,unit.id,
       jsonb_build_object('organization_id',unit.organization_id),unit.active,1000
from public.avalia_educational_units unit
on conflict(catalog,source_id) where source_id is not null do update
set code=excluded.code,label=excluded.label,metadata=excluded.metadata,active=excluded.active,updated_at=now();

create or replace function private.sync_semed_reference_unit()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='DELETE' then
    update public.semed_reference_catalogs set active=false,updated_at=now()
    where catalog='EDUCATIONAL_UNIT' and source_id=old.id;
    return old;
  end if;
  insert into public.semed_reference_catalogs(id,catalog,code,label,source_id,metadata,active,sort_order,updated_at)
  values(new.id,'EDUCATIONAL_UNIT',coalesce(nullif(new.code,''),new.id::text),new.name,new.id,
         jsonb_build_object('organization_id',new.organization_id),new.active,1000,now())
  on conflict(catalog,source_id) where source_id is not null do update
  set code=excluded.code,label=excluded.label,metadata=excluded.metadata,active=excluded.active,updated_at=now();
  return new;
end $$;
revoke all on function private.sync_semed_reference_unit() from public,anon,authenticated,service_role;

drop trigger if exists avalia_units_reference_sync on public.avalia_educational_units;
create trigger avalia_units_reference_sync
after insert or update or delete on public.avalia_educational_units
for each row execute function private.sync_semed_reference_unit();

create or replace function public.get_semed_reference_catalogs(p_catalog text default null)
returns table(id uuid,catalog text,code text,label text,parent_code text,source_id uuid,metadata jsonb)
language sql stable security invoker set search_path=public,pg_temp as $$
  select item.id,item.catalog,item.code,item.label,item.parent_code,item.source_id,item.metadata
  from public.semed_reference_catalogs item
  where item.active and (p_catalog is null or item.catalog=p_catalog)
  order by item.catalog,item.sort_order,item.label
$$;
revoke all on function public.get_semed_reference_catalogs(text) from public,anon;
grant execute on function public.get_semed_reference_catalogs(text) to authenticated;

commit;
