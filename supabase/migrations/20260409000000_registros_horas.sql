-- ── Tabela: registros_horas ────────────────────────────────────────────────────
--
-- Armazena os registros de horas trabalhadas (timesheet) do advogado.
-- Cada registro pertence a um usuário e pode estar opcionalmente vinculado
-- a um processo e/ou cliente.

-- Cria a tabela sem FKs inline para evitar erros de dependência
create table if not exists public.registros_horas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  processo_id uuid,
  cliente_id  uuid,
  descricao   text not null,
  data        date not null,
  -- Duração em horas com 2 casas decimais (ex.: 1.5 = 1h30min)
  horas       numeric(6, 2) not null check (horas > 0),
  -- Valor por hora no momento do registro (snapshot — não muda se a tabela de honorários mudar)
  valor_hora  numeric(10, 2) default null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Adiciona FKs separadamente (seguro — só adiciona se ainda não existirem)
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'registros_horas_user_id_fkey'
  ) then
    alter table public.registros_horas
      add constraint registros_horas_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'registros_horas_processo_id_fkey'
  ) then
    alter table public.registros_horas
      add constraint registros_horas_processo_id_fkey
      foreign key (processo_id) references public.processos(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'registros_horas_cliente_id_fkey'
  ) then
    alter table public.registros_horas
      add constraint registros_horas_cliente_id_fkey
      foreign key (cliente_id) references public.clientes(id) on delete set null;
  end if;
end $$;

-- ── Trigger: atualiza updated_at automaticamente ──────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger registros_horas_updated_at
  before update on public.registros_horas
  for each row execute function public.set_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table public.registros_horas enable row level security;

create policy "Usuários leem próprios registros"
  on public.registros_horas for select
  using (auth.uid() = user_id);

create policy "Usuários inserem próprios registros"
  on public.registros_horas for insert
  with check (auth.uid() = user_id);

create policy "Usuários atualizam próprios registros"
  on public.registros_horas for update
  using (auth.uid() = user_id);

create policy "Usuários excluem próprios registros"
  on public.registros_horas for delete
  using (auth.uid() = user_id);

-- ── Índices ───────────────────────────────────────────────────────────────────

create index registros_horas_user_id_idx        on public.registros_horas(user_id);
create index registros_horas_data_idx           on public.registros_horas(data);
create index registros_horas_processo_id_idx    on public.registros_horas(processo_id);
create index registros_horas_cliente_id_idx     on public.registros_horas(cliente_id);
create index registros_horas_user_data_idx      on public.registros_horas(user_id, data desc);
