-- Andamentos Processuais: timeline de eventos jurídicos por processo
-- Registra audiências, decisões, despachos, sentenças, recursos, etc.

create table public.andamentos_processuais (
  id            uuid primary key default gen_random_uuid(),
  processo_id   uuid not null references public.processos(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  data          date not null,
  tipo          text not null,
  descricao     text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Keep updated_at current automatically
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger andamentos_processuais_updated_at
  before update on public.andamentos_processuais
  for each row execute procedure public.set_updated_at();

-- Indexes for the two most common query patterns
create index andamentos_processuais_processo_id_idx on public.andamentos_processuais(processo_id);
create index andamentos_processuais_user_id_idx     on public.andamentos_processuais(user_id);

-- Row Level Security
alter table public.andamentos_processuais enable row level security;

create policy "Users can view own andamentos"
  on public.andamentos_processuais for select
  using (auth.uid() = user_id);

create policy "Users can insert own andamentos"
  on public.andamentos_processuais for insert
  with check (auth.uid() = user_id);

create policy "Users can update own andamentos"
  on public.andamentos_processuais for update
  using (auth.uid() = user_id);

create policy "Users can delete own andamentos"
  on public.andamentos_processuais for delete
  using (auth.uid() = user_id);
