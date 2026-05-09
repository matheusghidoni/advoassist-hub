# Arquitetura Multi-Usuário / Equipe — AdvoAssist Hub

> **Status:** Esboço / Design. Nenhuma linha foi ativada em produção ainda.  
> Todos os arquivos de implementação estão marcados com `// TODO: MULTI-USUARIO`.

---

## 1. Visão Geral

A plataforma hoje opera em modo **single-tenant por usuário**: cada advogado tem
seu próprio silo de dados isolado por `user_id`. A evolução para multi-usuário
introduz o conceito de **Escritório** (workspace) como unidade central de
compartilhamento de dados.

```
ANTES                          DEPOIS
─────────────────────────────  ──────────────────────────────────────
auth.users                     auth.users
  └─ user_id                     └─ user_id
       │                               │
       ▼                               ▼
  clientes (user_id)            escritorio_membros (user_id, escritorio_id, role)
  processos (user_id)                  │
  prazos    (user_id)                  ▼
  ...                           escritorios (id, nome, cnpj, …)
                                        │
                                        ▼
                                 clientes   (escritorio_id)
                                 processos  (escritorio_id)
                                 prazos     (escritorio_id)
                                 tarefas    (escritorio_id, atribuido_a?)
                                 ...
```

---

## 2. Modelo de Dados (Novas Tabelas)

### 2.1 `escritorios`
Representa um escritório de advocacia (workspace).

| Coluna         | Tipo        | Descrição                          |
|----------------|-------------|-------------------------------------|
| id             | uuid PK     | Identificador                       |
| nome           | text        | Nome do escritório                  |
| cnpj           | text        | CNPJ (único, nullable)              |
| telefone       | text        |                                     |
| email          | text        |                                     |
| endereco       | text        |                                     |
| logo_path      | text        | Caminho no Storage                  |
| plano          | text        | `basico` / `profissional` / `enterprise` |
| created_at     | timestamptz |                                     |
| owner_id       | uuid FK     | → auth.users (criador/dono)         |

### 2.2 `escritorio_membros`
Vínculo N:N entre usuários e escritórios com papel.

| Coluna         | Tipo        | Descrição                                            |
|----------------|-------------|-------------------------------------------------------|
| id             | uuid PK     |                                                       |
| escritorio_id  | uuid FK     | → escritorios                                         |
| user_id        | uuid FK     | → auth.users                                          |
| role           | text        | `dono` / `admin` / `advogado` / `estagiario` / `secretaria` |
| status         | text        | `ativo` / `convidado` / `suspenso`                   |
| convidado_por  | uuid FK     | → auth.users (quem convidou)                          |
| created_at     | timestamptz |                                                       |

> **Regra:** Um usuário pode pertencer a múltiplos escritórios.  
> O escritório ativo é mantido no contexto do frontend (`WorkspaceContext`).

### 2.3 `convites`
Fluxo de convite por e-mail.

| Coluna         | Tipo        | Descrição                     |
|----------------|-------------|-------------------------------|
| id             | uuid PK     |                               |
| escritorio_id  | uuid FK     | → escritorios                 |
| email          | text        | E-mail do convidado           |
| role           | text        | Papel que será atribuído      |
| token          | text UNIQUE | Token seguro do convite       |
| expires_at     | timestamptz | Validade (48h)                |
| aceito_em      | timestamptz | Null = pendente               |
| convidado_por  | uuid FK     | → auth.users                  |
| created_at     | timestamptz |                               |

---

## 3. Papéis e Permissões

```
ROLE          CRIAR  EDITAR  VER    EXCLUIR  GERENCIAR EQUIPE
────────────  ─────  ──────  ─────  ───────  ──────────────────
dono          ✅     ✅      ✅     ✅       ✅ (transfere dono)
admin         ✅     ✅      ✅     ✅       ✅ (não remove dono)
advogado      ✅     ✅      ✅     próprios ❌
estagiario    ✅     próprios ✅    próprios ❌
secretaria    ✅     ✅      ✅     ❌       ❌
```

> Tarefas terão campo `atribuido_a uuid` para indicar qual membro é responsável.

---

## 4. Mudanças no Schema Existente

Todas as tabelas de negócio precisarão de uma coluna adicional:

```sql
-- Em cada tabela: clientes, processos, prazos, honorarios,
-- despesas, tarefas, registros_horas, andamentos_processuais,
-- processo_documentos, cliente_documentos, notificacoes, agenda

ALTER TABLE public.<tabela>
  ADD COLUMN escritorio_id uuid REFERENCES public.escritorios(id) ON DELETE CASCADE;

-- user_id permanece para saber QUEM criou/editou o registro
-- escritorio_id determina QUEM pode ver o registro
```

> **Estratégia de migração:** `escritorio_id` começa como `nullable`.  
> Um script de migração cria um escritório pessoal para cada `user_id` existente  
> e popula `escritorio_id` retroativamente.

---

## 5. Row Level Security (Novo Modelo)

```sql
-- Exemplo para a tabela processos

-- Helper function (criada uma vez)
CREATE OR REPLACE FUNCTION auth.escritorio_ids()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT array_agg(escritorio_id)
  FROM   public.escritorio_membros
  WHERE  user_id = auth.uid()
  AND    status  = 'ativo';
$$;

-- Nova policy substituindo a atual
DROP POLICY "Users can view their own processos" ON public.processos;

CREATE POLICY "Membros veem processos do escritório"
  ON public.processos FOR SELECT
  USING (escritorio_id = ANY(auth.escritorio_ids()));

CREATE POLICY "Membros inserem processos no escritório ativo"
  ON public.processos FOR INSERT
  WITH CHECK (escritorio_id = ANY(auth.escritorio_ids()));
```

---

## 6. Frontend — Contexto de Workspace

```
src/
  contexts/
    WorkspaceContext.tsx       ← ESBOÇO CRIADO (inativo)
  hooks/
    useWorkspace.ts            ← ESBOÇO CRIADO (inativo)
  components/
    Layout/
      WorkspaceSwitcher.tsx    ← A CRIAR durante implementação
      AppSidebar.tsx           ← Adicionar <WorkspaceSwitcher /> no topo
  pages/
    Equipe.tsx                 ← A CRIAR (gerenciar membros, convites)
    Configuracoes.tsx          ← Adicionar aba "Escritório" e "Equipe"
```

### Fluxo do Contexto

```
AuthProvider
  └── WorkspaceProvider           ← injeta escritório ativo
        └── QueryClientProvider
              └── App (todas as páginas)
                    └── useWorkspace() → { escritorioId, role, membros }
```

---

## 7. Mudanças nos Query Hooks

```typescript
// ANTES
export function useProcessos() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.processos(user?.id ?? ''),
    queryFn: () => supabase
      .from('processos')
      .select('...')
      .eq('user_id', user!.id),   // ← filtra por usuário
  });
}

// DEPOIS
export function useProcessos() {
  const { user }         = useAuth();
  const { escritorioId } = useWorkspace();   // ← novo
  return useQuery({
    queryKey: queryKeys.processos(escritorioId ?? ''),
    queryFn: () => supabase
      .from('processos')
      .select('...')
      .eq('escritorio_id', escritorioId!),  // ← filtra por escritório
  });
}
```

> `queryKeys` terá uma dimensão a mais: `(escritorioId)` em vez de `(userId)`.

---

## 8. Nova Rota — `/equipe`

Página de gerenciamento de equipe (apenas `dono` e `admin`):

- Lista de membros com papel e status
- Botão "Convidar membro" → envia e-mail com link de convite
- Alterar papel de membro
- Remover membro
- Aceitar/rejeitar convite (página pública `/convite/:token`)

---

## 9. Plano de Implementação (Fases)

### Fase 1 — Fundação (banco + contexto)
- [ ] Migration: criar `escritorios`, `escritorio_membros`, `convites`
- [ ] Migration: adicionar `escritorio_id` em todas as tabelas
- [ ] Migration: script de backfill (criar escritório pessoal por usuário)
- [ ] Migration: atualizar todas as RLS policies
- [ ] Implementar `WorkspaceContext.tsx` e `useWorkspace.ts`
- [ ] Adaptar `useAuth` para carregar escritórios do usuário
- [ ] Atualizar todos os query hooks para `escritorio_id`

### Fase 2 — UI de Equipe
- [ ] Criar página `/equipe`
- [ ] Criar componente `WorkspaceSwitcher` na sidebar
- [ ] Fluxo de convite por e-mail (Supabase Auth invite ou e-mail custom)
- [ ] Página pública `/convite/:token`
- [ ] Aba "Escritório" em Configurações (mover CNPJ, nome, endereço)

### Fase 3 — Permissões granulares
- [ ] Proteção de rotas por `role` (ex: `/financeiro` bloqueado para `estagiario`)
- [ ] UI condicional baseada em papel (esconder botões de exclusão)
- [ ] Campo `atribuido_a` em tarefas com seletor de membro
- [ ] Filtros de tarefas/timesheet por membro

---

## 10. Impacto em Arquivos Existentes

| Arquivo | Mudança necessária |
|---------|--------------------|
| `src/hooks/useAuth.tsx` | Carregar escritórios do usuário no login |
| `src/hooks/queries/queryKeys.ts` | Trocar `userId` por `escritorioId` nas chaves |
| `src/hooks/queries/use*.ts` (todos) | Filtrar por `escritorio_id` |
| `src/components/Layout/AppSidebar.tsx` | Adicionar `WorkspaceSwitcher` |
| `src/pages/Configuracoes.tsx` | Adicionar aba Escritório/Equipe |
| `src/App.tsx` | Envolver com `WorkspaceProvider`, adicionar rota `/equipe` |
| Todas as migrations futuras | Incluir `escritorio_id` como coluna obrigatória |
