begin; -- Tabelas compartilhadas do Portal SEMED Integra.

create table public.semed_shared_tables (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  name text not null check (char_length(trim(name)) >= 3),
  description text,
  category text not null check (category in ('ORGANIZATIONAL','OPERATIONAL','EDUCATIONAL')),
  selection_mode text not null default 'SINGLE' check (selection_mode in ('SINGLE','MULTIPLE')),
  allow_hierarchy boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.semed_shared_options (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.semed_shared_tables(id) on delete restrict,
  code text not null,
  label text not null check (char_length(trim(label)) >= 2),
  short_label text,
  normalized_label text generated always as (
    regexp_replace(translate(lower(trim(label)),
      'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc'),
      '[^a-z0-9]+','','g')
  ) stored,
  parent_option_id uuid references public.semed_shared_options(id) on delete restrict,
  sort_order integer not null default 0,
  color text,
  icon text,
  help_text text,
  active boolean not null default true,
  valid_from date,
  valid_until date,
  legacy_reference_id uuid references public.semed_reference_catalogs(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(table_id,code),
  check (valid_from is null or valid_until is null or valid_until >= valid_from),
  check (parent_option_id is null or parent_option_id <> id)
);

create unique index semed_shared_options_label_parent_idx
  on public.semed_shared_options(table_id,normalized_label,coalesce(parent_option_id,'00000000-0000-0000-0000-000000000000'::uuid));
create index semed_shared_options_active_order_idx
  on public.semed_shared_options(table_id,active,sort_order,label);
create index semed_shared_options_parent_idx
  on public.semed_shared_options(parent_option_id) where parent_option_id is not null;
create index semed_shared_options_legacy_idx
  on public.semed_shared_options(legacy_reference_id) where legacy_reference_id is not null;

create table public.semed_shared_table_consumers (
  table_id uuid not null references public.semed_shared_tables(id) on delete cascade,
  module_code text not null,
  field_code text not null,
  required boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key(table_id,module_code,field_code)
);
create index semed_shared_consumers_module_idx
  on public.semed_shared_table_consumers(module_code,active);

create table public.semed_shared_option_history (
  id bigint generated always as identity primary key,
  option_id uuid not null,
  operation text not null check (operation in ('INSERT','UPDATE')),
  previous_data jsonb,
  new_data jsonb not null,
  changed_by uuid,
  changed_at timestamptz not null default now()
);
create index semed_shared_option_history_idx
  on public.semed_shared_option_history(option_id,changed_at desc);

alter table public.semed_shared_tables enable row level security;
alter table public.semed_shared_options enable row level security;
alter table public.semed_shared_table_consumers enable row level security;
alter table public.semed_shared_option_history enable row level security;
revoke all on public.semed_shared_tables,public.semed_shared_options,public.semed_shared_table_consumers,public.semed_shared_option_history from anon;
grant select,insert,update on public.semed_shared_tables,public.semed_shared_options,public.semed_shared_table_consumers to authenticated;
grant select on public.semed_shared_option_history to authenticated;

create policy semed_shared_tables_read on public.semed_shared_tables for select to authenticated
 using (active or (select private.semed_can_module('cadastros','view')));
create policy semed_shared_tables_insert on public.semed_shared_tables for insert to authenticated
 with check ((select private.semed_can_module('cadastros','create')));
create policy semed_shared_tables_update on public.semed_shared_tables for update to authenticated
 using ((select private.semed_can_module('cadastros','edit')))
 with check ((select private.semed_can_module('cadastros','edit')));
create policy semed_shared_options_read on public.semed_shared_options for select to authenticated
 using (active or (select private.semed_can_module('cadastros','view')));
create policy semed_shared_options_insert on public.semed_shared_options for insert to authenticated
 with check ((select private.semed_can_module('cadastros','create')));
create policy semed_shared_options_update on public.semed_shared_options for update to authenticated
 using ((select private.semed_can_module('cadastros','edit')))
 with check ((select private.semed_can_module('cadastros','edit')));
create policy semed_shared_consumers_read on public.semed_shared_table_consumers for select to authenticated
 using (active or (select private.semed_can_module('cadastros','view')));
create policy semed_shared_consumers_write on public.semed_shared_table_consumers for all to authenticated
 using ((select private.semed_can_module('cadastros','edit')))
 with check ((select private.semed_can_module('cadastros','edit')));
create policy semed_shared_history_read on public.semed_shared_option_history for select to authenticated
 using ((select private.semed_can_module('cadastros','view')));

insert into public.semed_shared_tables(code,name,description,category,selection_mode,allow_hierarchy,sort_order)
values
 ('AREA','Áreas de atuação','Primeiro nível da estrutura institucional.','ORGANIZATIONAL','SINGLE',true,10),
 ('DIRECTORATE','Diretorias','Diretorias responsáveis pela execução institucional.','ORGANIZATIONAL','SINGLE',true,20),
 ('SECTOR','Setores, departamentos e núcleos','Unidades administrativas subordinadas às diretorias.','ORGANIZATIONAL','SINGLE',true,30),
 ('EDUCATIONAL_UNIT','Unidades educacionais','Escolas, CEMEIs, polos e unidades de atendimento.','EDUCATIONAL','SINGLE',true,40),
 ('JOB_TITLE','Cargos e funções','Funções utilizadas em usuários, fluxos e responsabilidades.','ORGANIZATIONAL','SINGLE',false,50),
 ('GENERAL_STATUS','Situações gerais','Situações padronizadas para fluxos e acompanhamentos.','OPERATIONAL','SINGLE',false,100),
 ('PRIORITY','Prioridades','Níveis padronizados de prioridade.','OPERATIONAL','SINGLE',false,110),
 ('DOCUMENT_TYPE','Tipos de documento','Classificação comum de documentos e anexos.','OPERATIONAL','SINGLE',false,120),
 ('EXTERNAL_AGENCY','Órgãos externos','Órgãos que podem receber comunicações e encaminhamentos.','OPERATIONAL','MULTIPLE',false,130),
 ('RISK_LEVEL','Níveis de risco','Classificação comum de risco em ocorrências e incidentes.','OPERATIONAL','SINGLE',false,140)
on conflict(code) do update set name=excluded.name,description=excluded.description,category=excluded.category,
 selection_mode=excluded.selection_mode,allow_hierarchy=excluded.allow_hierarchy,active=true,sort_order=excluded.sort_order,updated_at=now();

with reference_seed as (
  select distinct on (catalog,code) *
  from public.semed_reference_catalogs
  order by catalog,code,active desc,updated_at desc,id
)
insert into public.semed_shared_options(table_id,code,label,parent_option_id,sort_order,active,legacy_reference_id,metadata)
select table_row.id,reference.code,reference.label,parent_option.id,reference.sort_order,reference.active,reference.id,
       jsonb_build_object('source','semed_reference_catalogs')
from reference_seed reference
join public.semed_shared_tables table_row on table_row.code=reference.catalog
left join lateral (
  select parent.* from public.semed_reference_catalogs parent
  where parent.code=reference.parent_code and parent.catalog in ('AREA','DIRECTORATE')
  order by parent.active desc,parent.updated_at desc,parent.id limit 1
) parent_reference on true
left join public.semed_shared_options parent_option on parent_option.legacy_reference_id=parent_reference.id
on conflict(table_id,code) do update set label=excluded.label,sort_order=excluded.sort_order,active=excluded.active,
 legacy_reference_id=excluded.legacy_reference_id,metadata=excluded.metadata,updated_at=now();

update public.semed_shared_options child
set parent_option_id=parent_option.id,updated_at=now()
from public.semed_reference_catalogs child_reference
join public.semed_reference_catalogs parent_reference
  on parent_reference.code=child_reference.parent_code and parent_reference.catalog in ('AREA','DIRECTORATE')
join public.semed_shared_options parent_option on parent_option.legacy_reference_id=parent_reference.id
where child.legacy_reference_id=child_reference.id
  and child.parent_option_id is distinct from parent_option.id;

with option_seed(table_code,code,label,short_label,sort_order,color,help_text) as (values
 ('GENERAL_STATUS','DRAFT','Em elaboração','Elaboração',10,'#64748b','Registro iniciado e ainda não encaminhado.'),
 ('GENERAL_STATUS','PENDING','Pendente','Pendente',20,'#d97706','Aguardando providência ou informação.'),
 ('GENERAL_STATUS','IN_PROGRESS','Em andamento','Andamento',30,'#2563eb','Providências em execução.'),
 ('GENERAL_STATUS','COMPLETED','Concluído','Concluído',40,'#15803d','Fluxo finalizado com resultado registrado.'),
 ('GENERAL_STATUS','CANCELLED','Cancelado','Cancelado',50,'#b91c1c','Fluxo encerrado sem continuidade.'),
 ('PRIORITY','LOW','Baixa','Baixa',10,'#15803d','Pode seguir o fluxo regular.'),
 ('PRIORITY','MEDIUM','Média','Média',20,'#d97706','Requer acompanhamento dentro do prazo.'),
 ('PRIORITY','HIGH','Alta','Alta',30,'#dc2626','Requer atenção prioritária.'),
 ('PRIORITY','URGENT','Urgente','Urgente',40,'#991b1b','Requer atuação imediata.'),
 ('DOCUMENT_TYPE','INTERNAL_REPORT','Relatório interno','Relatório',10,null,'Documento de registro e acompanhamento interno.'),
 ('DOCUMENT_TYPE','MINUTES','Ata','Ata',20,null,'Registro formal de reunião ou deliberação.'),
 ('DOCUMENT_TYPE','OFFICIAL_LETTER','Ofício','Ofício',30,null,'Comunicação formal entre instituições.'),
 ('DOCUMENT_TYPE','POLICE_REPORT','Boletim de ocorrência','B.O.',40,null,'Registro oficial de ocorrência policial.'),
 ('EXTERNAL_AGENCY','SAMU','SAMU','SAMU',10,null,'Serviço de Atendimento Móvel de Urgência.'),
 ('EXTERNAL_AGENCY','FIRE_DEPARTMENT','Corpo de Bombeiros','Bombeiros',20,null,'Corpo de Bombeiros Militar.'),
 ('EXTERNAL_AGENCY','MILITARY_POLICE','Polícia Militar','PM',30,null,'Polícia Militar.'),
 ('EXTERNAL_AGENCY','MUNICIPAL_GUARD','Guarda Municipal','Guarda',40,null,'Guarda Municipal.'),
 ('EXTERNAL_AGENCY','CHILD_PROTECTION','Conselho Tutelar','Conselho Tutelar',50,null,'Conselho Tutelar responsável.'),
 ('RISK_LEVEL','LOW','Baixo','Baixo',10,'#15803d','Sem indicação de risco imediato.'),
 ('RISK_LEVEL','MODERATE','Moderado','Moderado',20,'#d97706','Requer acompanhamento e providências.'),
 ('RISK_LEVEL','HIGH','Alto','Alto',30,'#dc2626','Requer resposta prioritária.'),
 ('RISK_LEVEL','CRITICAL','Crítico','Crítico',40,'#991b1b','Risco imediato ou grave.')
)
insert into public.semed_shared_options(table_id,code,label,short_label,sort_order,color,help_text)
select shared_table.id,seed.code,seed.label,seed.short_label,seed.sort_order,seed.color,seed.help_text
from option_seed seed join public.semed_shared_tables shared_table on shared_table.code=seed.table_code
on conflict(table_id,code) do update set label=excluded.label,short_label=excluded.short_label,
 sort_order=excluded.sort_order,color=excluded.color,help_text=excluded.help_text,active=true,updated_at=now();

with consumer(table_code,module_code,field_code,required) as (values
 ('AREA','portal','user_area',true),('AREA','monitor','object_area',true),
 ('DIRECTORATE','portal','user_directorate',true),('SECTOR','comunicacao','sector_2',false),
 ('SECTOR','monitor','object_area',false),('EDUCATIONAL_UNIT','avaliacoes','unit_id',true),
 ('EDUCATIONAL_UNIT','comunicacao','identified_unit',false),('EDUCATIONAL_UNIT','incidentes','incident_unit',true),
 ('JOB_TITLE','portal','job_title',true),('GENERAL_STATUS','monitor','status',true),
 ('GENERAL_STATUS','comunicacao','status',true),('PRIORITY','monitor','priority',false),
 ('DOCUMENT_TYPE','comunicacao','document_type',false),('DOCUMENT_TYPE','incidentes','formal_record_type',false),
 ('EXTERNAL_AGENCY','incidentes','external_agencies',false),('RISK_LEVEL','comunicacao','risk_level',true),
 ('RISK_LEVEL','incidentes','risk_level',false)
)
insert into public.semed_shared_table_consumers(table_id,module_code,field_code,required)
select shared_table.id,consumer.module_code,consumer.field_code,consumer.required
from consumer join public.semed_shared_tables shared_table on shared_table.code=consumer.table_code
on conflict(table_id,module_code,field_code) do update set required=excluded.required,active=true;

create or replace function private.audit_semed_shared_option()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.semed_shared_option_history(option_id,operation,previous_data,new_data,changed_by)
  values(new.id,tg_op,case when tg_op='UPDATE' then to_jsonb(old) end,to_jsonb(new),(select auth.uid()));
  return new;
end $$;
revoke all on function private.audit_semed_shared_option() from public,anon,authenticated;
create trigger semed_shared_option_audit after insert or update on public.semed_shared_options
for each row execute function private.audit_semed_shared_option();

create or replace function private.sync_reference_to_shared_option()
returns trigger language plpgsql security definer set search_path='' as $$
declare target_table uuid;
begin
  select id into target_table from public.semed_shared_tables where code=new.catalog;
  if target_table is null then return new; end if;
  insert into public.semed_shared_options(table_id,code,label,sort_order,active,legacy_reference_id,metadata,updated_at)
  values(target_table,new.code,new.label,new.sort_order,new.active,new.id,
         jsonb_build_object('source','semed_reference_catalogs'),now())
  on conflict(table_id,code) do update set label=excluded.label,sort_order=excluded.sort_order,
    active=excluded.active,legacy_reference_id=excluded.legacy_reference_id,updated_at=now();
  return new;
end $$;
revoke all on function private.sync_reference_to_shared_option() from public,anon,authenticated;
create trigger semed_reference_shared_option_sync after insert or update of code,label,sort_order,active
on public.semed_reference_catalogs for each row execute function private.sync_reference_to_shared_option();

create or replace function public.get_semed_shared_options(p_table_code text,p_parent_code text default null)
returns table(id uuid,code text,label text,short_label text,parent_code text,color text,icon text,help_text text)
language sql stable security invoker set search_path=public,pg_temp as $$
 select option.id,option.code,option.label,option.short_label,parent.code,option.color,option.icon,option.help_text
 from public.semed_shared_options option
 join public.semed_shared_tables shared_table on shared_table.id=option.table_id
 left join public.semed_shared_options parent on parent.id=option.parent_option_id
 where shared_table.code=upper(p_table_code) and shared_table.active and option.active
   and (option.valid_from is null or option.valid_from<=current_date)
   and (option.valid_until is null or option.valid_until>=current_date)
   and (p_parent_code is null or parent.code=p_parent_code)
 order by option.sort_order,option.label
$$;
revoke all on function public.get_semed_shared_options(text,text) from public,anon;
grant execute on function public.get_semed_shared_options(text,text) to authenticated;

commit;
