-- Tarefas internas do escritório
-- Controle de trabalho interno vinculável a processos e/ou clientes.

create table public.tarefas (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  processo_id      uuid references public.processos(id) on delete set null,
  cliente_id       uuid references public.clientes(id) on delete set null,
  titulo           text not null,
  descricao        text,
  prioridade       text not null default 'media'
                     check (prioridade in ('baixa', 'media', 'alta', 'urgente')),
  status           text not null default 'pendente'
                     check (status in ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  data_vencimento  date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Reutiliza a função set_updated_at criada no sprint de andamentos (idempotente)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tarefas_updated_at
  before update on public.tarefas
  for each row execute procedure public.set_updated_at();

-- Índices
create index tarefas_user_id_idx       on public.tarefas(user_id);
create index tarefas_processo_id_idx   on public.tarefas(processo_id);
create index tarefas_cliente_id_idx    on public.tarefas(cliente_id);
create index tarefas_status_idx        on public.tarefas(status);

-- RLS
alter table public.tarefas enable row level security;

create policy "Users can view own tarefas"
  on public.tarefas for select using (auth.uid() = user_id);

create policy "Users can insert own tarefas"
  on public.tarefas for insert with check (auth.uid() = user_id);

create policy "Users can update own tarefas"
  on public.tarefas for update using (auth.uid() = user_id);

create policy "Users can delete own tarefas"
  on public.tarefas for delete using (auth.uid() = user_id);
