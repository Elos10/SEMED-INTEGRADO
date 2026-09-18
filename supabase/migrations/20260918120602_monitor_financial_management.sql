begin;

create table if not exists public.monitor_financial_sources (
  id uuid primary key default gen_random_uuid(),
  object_record_id uuid not null references public.monitor_records(id) on delete restrict,
  object_code text not null,
  source_type text not null check (source_type in ('Próprio','Vinculado','Convênio','Transferência','Outro')),
  source_code text not null,
  source_description text not null,
  planned_amount numeric(16,2) not null default 0 check (planned_amount >= 0),
  active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id),
  updated_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.monitor_financial_annual_budgets (
  id uuid primary key default gen_random_uuid(),
  object_record_id uuid not null references public.monitor_records(id) on delete restrict,
  object_code text not null,
  source_id uuid references public.monitor_financial_sources(id) on delete restrict,
  fiscal_year integer not null check (fiscal_year between 2000 and 2200),
  planned_amount numeric(16,2) not null default 0 check (planned_amount >= 0),
  active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id),
  updated_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.monitor_financial_processes (
  id uuid primary key default gen_random_uuid(),
  object_record_id uuid not null references public.monitor_records(id) on delete restrict,
  object_code text not null,
  source_id uuid references public.monitor_financial_sources(id) on delete restrict,
  resource_type text not null,
  acquisition_method text not null,
  fiscal_year integer not null check (fiscal_year between 2000 and 2200),
  planned_amount numeric(16,2) not null default 0 check (planned_amount >= 0),
  functional_programmatic text,
  process_number text not null,
  status text not null default 'Em planejamento',
  active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id),
  updated_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.monitor_financial_entries (
  id uuid primary key default gen_random_uuid(),
  object_record_id uuid not null references public.monitor_records(id) on delete restrict,
  object_code text not null,
  source_id uuid references public.monitor_financial_sources(id) on delete restrict,
  process_id uuid references public.monitor_financial_processes(id) on delete restrict,
  entry_type text not null check (entry_type in ('EMPENHO','LIQUIDACAO','PAGAMENTO')),
  occurred_on date not null,
  fiscal_year integer not null check (fiscal_year between 2000 and 2200),
  category text not null,
  supplier text,
  document_number text,
  amount numeric(16,2) not null check (amount > 0),
  notes text,
  allow_over_budget boolean not null default false,
  active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id),
  updated_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.monitor_financial_audit (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id uuid not null,
  object_record_id uuid,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid default auth.uid() references auth.users(id),
  changed_at timestamptz not null default now()
);

create unique index if not exists monitor_financial_sources_object_code_uidx
  on public.monitor_financial_sources (object_record_id, lower(source_code)) where active;
create unique index if not exists monitor_financial_annual_budget_uidx
  on public.monitor_financial_annual_budgets (object_record_id, fiscal_year, coalesce(source_id, '00000000-0000-0000-0000-000000000000'::uuid)) where active;
create unique index if not exists monitor_financial_process_number_uidx
  on public.monitor_financial_processes (object_record_id, lower(process_number)) where active;
create index if not exists monitor_financial_entries_object_date_idx
  on public.monitor_financial_entries (object_record_id, occurred_on desc) where active;
create index if not exists monitor_financial_entries_object_type_idx
  on public.monitor_financial_entries (object_record_id, entry_type) where active;
create index if not exists monitor_financial_entries_source_idx
  on public.monitor_financial_entries (source_id) where active;
create index if not exists monitor_financial_entries_process_idx
  on public.monitor_financial_entries (process_id) where active;
create index if not exists monitor_financial_audit_object_idx
  on public.monitor_financial_audit (object_record_id, changed_at desc);

create or replace function private.monitor_financial_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  expected_object_code text;
begin
  select data->>'code' into expected_object_code
  from public.monitor_records
  where id = new.object_record_id and collection = 'objects' and active;
  if expected_object_code is null then
    raise exception 'O Objeto informado não existe ou está inativo.' using errcode = '23503';
  end if;
  if nullif(to_jsonb(new)->>'source_id','') is not null and not exists (
    select 1 from public.monitor_financial_sources source
    where source.id=(to_jsonb(new)->>'source_id')::uuid and source.object_record_id=new.object_record_id and source.active
  ) then
    raise exception 'A fonte de recurso não pertence ao Objeto informado.' using errcode = '23503';
  end if;
  if nullif(to_jsonb(new)->>'process_id','') is not null and not exists (
    select 1 from public.monitor_financial_processes process
    where process.id=(to_jsonb(new)->>'process_id')::uuid and process.object_record_id=new.object_record_id and process.active
  ) then
    raise exception 'O processo não pertence ao Objeto informado.' using errcode = '23503';
  end if;
  new.object_code := expected_object_code;
  new.updated_by := (select auth.uid());
  new.updated_at := now();
  if tg_op = 'INSERT' then new.created_by := (select auth.uid()); end if;
  return new;
end;
$$;

create or replace function private.monitor_validate_financial_entry()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  planned numeric(16,2);
  committed numeric(16,2);
  liquidated numeric(16,2);
  paid numeric(16,2);
begin
  perform pg_advisory_xact_lock(hashtextextended(new.object_record_id::text, 0));
  select coalesce(nullif(sum(planned_amount) filter (where active), 0),
                  (select nullif(sum(planned_amount),0) from public.monitor_financial_sources where object_record_id=new.object_record_id and active),
                  (select nullif((data->>'budget')::numeric,0) from public.monitor_records where id=new.object_record_id), 0)
    into planned
  from public.monitor_financial_annual_budgets where object_record_id=new.object_record_id;
  select coalesce(sum(amount) filter (where entry_type='EMPENHO' and active and id<>new.id),0),
         coalesce(sum(amount) filter (where entry_type='LIQUIDACAO' and active and id<>new.id),0),
         coalesce(sum(amount) filter (where entry_type='PAGAMENTO' and active and id<>new.id),0)
    into committed, liquidated, paid
  from public.monitor_financial_entries where object_record_id=new.object_record_id;
  if new.active then
    if new.entry_type='EMPENHO' then committed:=committed+new.amount;
    elsif new.entry_type='LIQUIDACAO' then liquidated:=liquidated+new.amount;
    elsif new.entry_type='PAGAMENTO' then paid:=paid+new.amount;
    end if;
  end if;
  if committed > planned and not (new.allow_over_budget and (select private.monitor_role())='administrador') then
    raise exception 'O valor empenhado supera o orçamento previsto.' using errcode='23514';
  end if;
  if liquidated > committed then raise exception 'O valor liquidado supera o total empenhado.' using errcode='23514'; end if;
  if paid > liquidated then raise exception 'O valor pago supera o total liquidado.' using errcode='23514'; end if;
  return new;
end;
$$;

create or replace function private.monitor_financial_audit_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op='DELETE' then
    insert into public.monitor_financial_audit(table_name,record_id,object_record_id,action,old_data,changed_by)
    values(tg_table_name,old.id,old.object_record_id,tg_op,to_jsonb(old),(select auth.uid()));
    return old;
  end if;
  insert into public.monitor_financial_audit(table_name,record_id,object_record_id,action,old_data,new_data,changed_by)
  values(tg_table_name,new.id,new.object_record_id,tg_op,case when tg_op='UPDATE' then to_jsonb(old) end,to_jsonb(new),(select auth.uid()));
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['monitor_financial_sources','monitor_financial_annual_budgets','monitor_financial_processes','monitor_financial_entries'] loop
    execute format('drop trigger if exists %I on public.%I',table_name||'_before_write',table_name);
    execute format('create trigger %I before insert or update on public.%I for each row execute function private.monitor_financial_before_write()',table_name||'_before_write',table_name);
    execute format('drop trigger if exists %I on public.%I',table_name||'_audit',table_name);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function private.monitor_financial_audit_change()',table_name||'_audit',table_name);
  end loop;
end $$;
drop trigger if exists monitor_financial_entries_validate on public.monitor_financial_entries;
create trigger monitor_financial_entries_validate before insert or update on public.monitor_financial_entries for each row execute function private.monitor_validate_financial_entry();

alter table public.monitor_financial_sources enable row level security;
alter table public.monitor_financial_annual_budgets enable row level security;
alter table public.monitor_financial_processes enable row level security;
alter table public.monitor_financial_entries enable row level security;
alter table public.monitor_financial_audit enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['monitor_financial_sources','monitor_financial_annual_budgets','monitor_financial_processes','monitor_financial_entries'] loop
    execute format('drop policy if exists %I on public.%I',table_name||'_read',table_name);
    execute format('create policy %I on public.%I for select to authenticated using ((select private.monitor_role()) is not null)',table_name||'_read',table_name);
    execute format('drop policy if exists %I on public.%I',table_name||'_insert',table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.monitor_role())=''administrador'' and created_by=(select auth.uid()) and updated_by=(select auth.uid()))',table_name||'_insert',table_name);
    execute format('drop policy if exists %I on public.%I',table_name||'_update',table_name);
    execute format('create policy %I on public.%I for update to authenticated using ((select private.monitor_role())=''administrador'') with check ((select private.monitor_role())=''administrador'' and updated_by=(select auth.uid()))',table_name||'_update',table_name);
  end loop;
end $$;
drop policy if exists monitor_financial_audit_read on public.monitor_financial_audit;
create policy monitor_financial_audit_read on public.monitor_financial_audit for select to authenticated using ((select private.monitor_role()) is not null);

grant select,insert,update on public.monitor_financial_sources,public.monitor_financial_annual_budgets,public.monitor_financial_processes,public.monitor_financial_entries to authenticated;
grant select on public.monitor_financial_audit to authenticated;
grant usage,select on sequence public.monitor_financial_audit_id_seq to authenticated;

create or replace function public.get_monitor_financial_data()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'sources',coalesce((select jsonb_agg(to_jsonb(s) order by s.source_code) from public.monitor_financial_sources s where s.active),'[]'::jsonb),
    'annualBudgets',coalesce((select jsonb_agg(to_jsonb(b) order by b.fiscal_year) from public.monitor_financial_annual_budgets b where b.active),'[]'::jsonb),
    'processes',coalesce((select jsonb_agg(to_jsonb(p) order by p.fiscal_year,p.process_number) from public.monitor_financial_processes p where p.active),'[]'::jsonb),
    'entries',coalesce((select jsonb_agg(to_jsonb(e) order by e.occurred_on desc,e.created_at desc) from public.monitor_financial_entries e where e.active),'[]'::jsonb)
  )
$$;
revoke all on function public.get_monitor_financial_data() from public,anon;
grant execute on function public.get_monitor_financial_data() to authenticated;
revoke all on function private.monitor_financial_before_write(),private.monitor_validate_financial_entry(),private.monitor_financial_audit_change() from public,anon,authenticated;

commit;
