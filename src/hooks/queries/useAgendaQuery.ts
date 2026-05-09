import { useQuery } from "@tanstack/react-query";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { queryKeys } from "./queryKeys";

export type AgendaEventKind = "prazo" | "andamento";

export interface AgendaEvent {
  id: string;
  date: string;           // YYYY-MM-DD
  kind: AgendaEventKind;
  titulo: string;
  descricao?: string;
  // prazo-specific
  prioridade?: string;
  concluido?: boolean;
  // andamento-specific
  andamentoTipo?: string;
  processoId?: string;
  processoNumero?: string;
}

export function useAgenda(month: Date) {
  const { user } = useAuth();
  const { escritorioId } = useWorkspace();
  const start = format(startOfMonth(month), "yyyy-MM-dd");
  const end   = format(endOfMonth(month),   "yyyy-MM-dd");

  return useQuery({
    queryKey: queryKeys.agenda(escritorioId ?? '', start, end),
    queryFn: async () => {
      const [prazosResult, andamentosResult] = await Promise.all([
        supabase
          .from("prazos")
          .select("id, titulo, descricao, data, prioridade, concluido")
          .eq("escritorio_id", escritorioId!)
          .gte("data", start)
          .lte("data", end),
        supabase
          .from("andamentos_processuais")
          .select("id, data, tipo, descricao, processo_id, processos(numero)")
          .gte("data", start)
          .lte("data", end),
      ]);

      if (prazosResult.error)     throw prazosResult.error;
      if (andamentosResult.error) throw andamentosResult.error;

      const prazoEvents: AgendaEvent[] = (prazosResult.data ?? []).map((p) => ({
        id:         p.id,
        date:       p.data.split("T")[0],
        kind:       "prazo",
        titulo:     p.titulo,
        descricao:  p.descricao ?? undefined,
        prioridade: p.prioridade,
        concluido:  p.concluido,
      }));

      const andamentoEvents: AgendaEvent[] = (andamentosResult.data ?? []).map((a) => ({
        id:             a.id,
        date:           a.data.split("T")[0],
        kind:           "andamento",
        titulo:         a.descricao,
        andamentoTipo:  a.tipo,
        processoId:     a.processo_id,
        processoNumero: (a.processos as { numero: string } | null)?.numero,
      }));

      return [...prazoEvents, ...andamentoEvents].sort((a, b) =>
        a.date.localeCompare(b.date),
      );
    },
    enabled: !!user && !!escritorioId,
  });
}
