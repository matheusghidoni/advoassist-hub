/**
 * WorkspaceContext — Contexto do Escritório Ativo
 *
 * Responsabilidades:
 *  - Carregar todos os escritórios aos quais o usuário logado pertence
 *  - Manter o escritório "ativo" (último usado, salvo em localStorage)
 *  - Auto-criar o escritório pessoal se o usuário não tiver nenhum ainda
 *  - Expor: escritorioId, myRole, membros, escritorios, switchEscritorio
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { RoleEscritorio, EscritorioMembro } from "@/types/equipe";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface Escritorio {
  id: string;
  owner_id: string;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  logo_path: string | null;
  plano: string;
  created_at: string;
  updated_at: string;
}

export interface MembroComPerfil extends EscritorioMembro {
  profiles: {
    full_name: string | null;
    oab: string | null;
  } | null;
}

interface WorkspaceContextValue {
  escritorio: Escritorio | null;
  escritorioId: string | null;
  myRole: RoleEscritorio | null;
  escritorios: Escritorio[];
  membros: MembroComPerfil[];
  switchEscritorio: (id: string) => void;
  refetch: () => void;
  loading: boolean;
}

// ── Contexto ──────────────────────────────────────────────────────────────────

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace deve ser usado dentro de <WorkspaceProvider>");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

const LS_KEY = "legalflow_escritorio_ativo";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Escritório salvo na sessão anterior
  const [activeId, setActiveId] = useState<string | null>(
    () => localStorage.getItem(LS_KEY)
  );

  // ── Query: memberships do usuário ──────────────────────────────────────────
  const {
    data: memberships = [],
    isLoading,
    refetch: refetchMemberships,
  } = useQuery({
    queryKey: ["workspace_memberships", user?.id ?? ""],
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escritorio_membros")
        .select(`*, escritorios (*)`)
        .eq("user_id", user!.id)
        .eq("status", "ativo");

      if (error) throw error;
      return (data ?? []) as Array<
        EscritorioMembro & { escritorios: Escritorio; profiles: { full_name: string | null; oab: string | null } | null }
      >;
    },
  });

  // ── Query: membros do escritório ativo ────────────────────────────────────
  const escritorios = memberships.map((m) => m.escritorios).filter(Boolean) as Escritorio[];

  const escritorio =
    escritorios.find((e) => e.id === activeId) ?? escritorios[0] ?? null;

  const myRole =
    (memberships.find((m) => m.escritorio_id === escritorio?.id)?.role as RoleEscritorio) ??
    null;

  const { data: membros = [] } = useQuery({
    queryKey: ["workspace_membros", escritorio?.id ?? ""],
    enabled: !!escritorio,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escritorio_membros")
        .select(`*, profiles!escritorio_membros_user_id_profiles_fkey(full_name, oab)`)
        .eq("escritorio_id", escritorio!.id)
        .eq("status", "ativo");

      if (error) throw error;
      return (data ?? []) as MembroComPerfil[];
    },
  });

  // ── Auto-criar escritório se o usuário não tiver nenhum ────────────────────
  useEffect(() => {
    if (!user || isLoading || memberships.length > 0) return;

    (async () => {
      // Buscar perfil para o nome
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, office_name, cnpj, office_address")
        .eq("id", user.id)
        .maybeSingle();

      const { data: newEsc, error } = await supabase
        .from("escritorios")
        .insert({
          owner_id: user.id,
          nome:
            (profile as any)?.office_name ||
            (profile as any)?.full_name ||
            "Meu Escritório",
          cnpj:     (profile as any)?.cnpj        ?? null,
          endereco: (profile as any)?.office_address ?? null,
        })
        .select()
        .single();

      if (error || !newEsc) return;

      await supabase.from("escritorio_membros").insert({
        escritorio_id: newEsc.id,
        user_id:       user.id,
        role:          "dono",
      });

      refetchMemberships();
    })();
  }, [user, isLoading, memberships.length]);

  // ── Sincronizar activeId com escritórios disponíveis ─────────────────────
  useEffect(() => {
    if (escritorios.length === 0) return;
    if (!activeId || !escritorios.find((e) => e.id === activeId)) {
      const first = escritorios[0].id;
      setActiveId(first);
      localStorage.setItem(LS_KEY, first);
    }
  }, [escritorios]);

  const switchEscritorio = useCallback((id: string) => {
    setActiveId(id);
    localStorage.setItem(LS_KEY, id);
    // Invalidar todas as queries de dados ao trocar de escritório
    queryClient.invalidateQueries();
  }, [queryClient]);

  const refetch = useCallback(() => {
    refetchMemberships();
    queryClient.invalidateQueries({ queryKey: ["workspace_membros"] });
  }, [refetchMemberships, queryClient]);

  return (
    <WorkspaceContext.Provider
      value={{
        escritorio,
        escritorioId: escritorio?.id ?? null,
        myRole,
        escritorios,
        membros,
        switchEscritorio,
        refetch,
        loading: isLoading,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
