-- ── Tabela: despesas ──────────────────────────────────────────────────────────
--
-- Registra despesas e custas processuais/administrativas do escritório.

create table if not exists public.despesas (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null,
  processo_id   uuid,
  cliente_id    uuid,
  descricao     text        not null,
  categoria     text        not null default 'outros',
  valor         numeric(12,2) not null check (valor >= 0),
  data          date        not null,
  status        text        not null default 'pendente'
                            check (status in ('pendente', 'pago')),
  comprovante_path text,
  observacoes   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Trigger updated_at ────────────────────────────────────────────────────────

create or replace function public.update_despesas_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_despesas_updated_at on public.despesas;
create trigger set_despesas_updated_at
  before update on public.despesas
  for each row execute function public.update_despesas_updated_at();

-- ── Foreign Keys ──────────────────────────────────────────────────────────────

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'despesas_user_id_fkey') then
    alter table public.despesas
      add constraint despesas_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'despesas_processo_id_fkey') then
    alter table public.despesas
      add constraint despesas_processo_id_fkey
      foreign key (processo_id) references public.processos(id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'despesas_cliente_id_fkey') then
    alter table public.despesas
      add constraint despesas_cliente_id_fkey
      foreign key (cliente_id) references public.clientes(id) on delete set null;
  end if;
end $$;

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table public.despesas enable row level security;

create policy "Usuários leem próprias despesas"
  on public.despesas for select
  using (auth.uid() = user_id);

create policy "Usuários inserem próprias despesas"
  on public.despesas for insert
  with check (auth.uid() = user_id);

create policy "Usuários atualizam próprias despesas"
  on public.despesas for update
  using (auth.uid() = user_id);

create policy "Usuários excluem próprias despesas"
  on public.despesas for delete
  using (auth.uid() = user_id);

-- ── Índices ───────────────────────────────────────────────────────────────────

create index if not exists despesas_user_id_idx     on public.despesas(user_id);
create index if not exists despesas_processo_id_idx on public.despesas(processo_id);
create index if not exists despesas_cliente_id_idx  on public.despesas(cliente_id);
create index if not exists despesas_status_idx      on public.despesas(status);
create index if not exists despesas_data_idx        on public.despesas(data desc);
create index if not exists despesas_categoria_idx   on public.despesas(categoria);
