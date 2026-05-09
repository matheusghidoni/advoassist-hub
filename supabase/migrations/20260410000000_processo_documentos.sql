-- ── Tabela: processo_documentos ───────────────────────────────────────────────
--
-- Armazena os metadados dos arquivos vinculados a cada processo.
-- Os binários ficam no Supabase Storage (bucket: client-documents)
-- sob o prefixo  processos/{user_id}/{processo_id}/

create table if not exists public.processo_documentos (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null,
  processo_id       uuid not null,
  nome_arquivo      text not null,
  caminho_storage   text not null,
  tamanho_bytes     bigint,
  tipo_mime         text,
  created_at        timestamptz not null default now()
);

-- ── Foreign Keys ──────────────────────────────────────────────────────────────

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'processo_documentos_user_id_fkey') then
    alter table public.processo_documentos
      add constraint processo_documentos_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'processo_documentos_processo_id_fkey') then
    alter table public.processo_documentos
      add constraint processo_documentos_processo_id_fkey
      foreign key (processo_id) references public.processos(id) on delete cascade;
  end if;
end $$;

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table public.processo_documentos enable row level security;

create policy "Usuários leem próprios documentos de processos"
  on public.processo_documentos for select
  using (auth.uid() = user_id);

create policy "Usuários inserem próprios documentos de processos"
  on public.processo_documentos for insert
  with check (auth.uid() = user_id);

create policy "Usuários excluem próprios documentos de processos"
  on public.processo_documentos for delete
  using (auth.uid() = user_id);

-- ── Índices ───────────────────────────────────────────────────────────────────

create index if not exists processo_documentos_user_id_idx
  on public.processo_documentos(user_id);

create index if not exists processo_documentos_processo_id_idx
  on public.processo_documentos(processo_id);

create index if not exists processo_documentos_created_at_idx
  on public.processo_documentos(created_at desc);
