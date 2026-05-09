/**
 * Tipos para o módulo Multi-Usuário / Equipe
 *
 * TODO: MULTI-USUARIO — Este arquivo é um esboço. Nenhuma lógica está ativa.
 * Será utilizado quando as migrations de escritorios/membros forem aplicadas.
 */

// ── Papéis disponíveis ────────────────────────────────────────────────────────

export type RoleEscritorio =
  | "dono"        // proprietário, acesso total + transferência de dono
  | "admin"       // acesso total exceto remover dono
  | "advogado"    // CRUD completo, exclui apenas os próprios registros
  | "estagiario"  // cria e edita próprios registros, lê todos
  | "secretaria"; // cria e edita qualquer registro, não exclui, não gerencia equipe

export type StatusMembro = "ativo" | "convidado" | "suspenso";

// ── Escritório (Workspace) ────────────────────────────────────────────────────

export interface Escritorio {
  id: string;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  logo_path: string | null;
  plano: "basico" | "profissional" | "enterprise";
  owner_id: string;
  created_at: string;
}

// ── Membro ────────────────────────────────────────────────────────────────────

export interface EscritorioMembro {
  id: string;
  escritorio_id: string;
  user_id: string;
  role: RoleEscritorio;
  status: StatusMembro;
  convidado_por: string | null;
  created_at: string;
  // Joins
  profiles?: {
    full_name: string | null;
    oab: string | null;
    avatar_url: string | null;
  } | null;
}

// ── Convite ───────────────────────────────────────────────────────────────────

export interface Convite {
  id: string;
  escritorio_id: string;
  email: string;
  role: RoleEscritorio;
  token: string;
  expires_at: string;
  aceito_em: string | null;
  convidado_por: string;
  created_at: string;
}

// ── Contexto de Workspace ─────────────────────────────────────────────────────

export interface WorkspaceContextValue {
  /** Escritório atualmente selecionado */
  escritorio: Escritorio | null;

  /** ID do escritório ativo (shortcut) */
  escritorioId: string | null;

  /** Papel do usuário logado neste escritório */
  myRole: RoleEscritorio | null;

  /** Todos os escritórios aos quais o usuário pertence */
  escritorios: Escritorio[];

  /** Membros do escritório ativo */
  membros: EscritorioMembro[];

  /** Troca o escritório ativo (persiste no localStorage) */
  switchEscritorio: (id: string) => void;

  /** Recarrega dados do workspace */
  refetch: () => void;

  loading: boolean;
}

// ── Helpers de permissão ──────────────────────────────────────────────────────

/**
 * Verifica se um papel tem permissão de gerenciar equipe.
 * TODO: MULTI-USUARIO — usar em guards de rota e em componentes de UI.
 */
export function podeGerenciarEquipe(role: RoleEscritorio | null): boolean {
  return role === "dono" || role === "admin";
}

/**
 * Verifica se um papel pode excluir qualquer registro (não apenas os próprios).
 */
export function podeExcluirQualquer(role: RoleEscritorio | null): boolean {
  return role === "dono" || role === "admin";
}

/**
 * Verifica se um papel tem acesso ao módulo financeiro.
 */
export function temAcessoFinanceiro(role: RoleEscritorio | null): boolean {
  return role !== "estagiario";
}

/**
 * Verifica se o usuário é o dono do escritório.
 */
export function isDono(role: RoleEscritorio | null): boolean {
  return role === "dono";
}

// ── Labels e cores por papel ──────────────────────────────────────────────────

export const ROLE_META: Record<RoleEscritorio, { label: string; color: string }> = {
  dono:       { label: "Dono",       color: "bg-purple-500/10 text-purple-700 border-purple-500/20" },
  admin:      { label: "Admin",      color: "bg-blue-500/10 text-blue-700 border-blue-500/20"     },
  advogado:   { label: "Advogado",   color: "bg-green-500/10 text-green-700 border-green-500/20"  },
  estagiario: { label: "Estagiário", color: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20"},
  secretaria: { label: "Secretaria", color: "bg-gray-500/10 text-gray-700 border-gray-500/20"     },
};
